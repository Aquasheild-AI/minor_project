"""
Bridge between Django and the shared ML package (<repo>/ml/aquashield_ml).

Module A (water contamination) runs on each village's latest water quality
tests. Module B (outbreak risk) runs per district on live NASA POWER climate.

Predictions are only stored when a model actually produced them. If a model
file is missing or live climate cannot be fetched, PredictionUnavailable is
raised with the reason and nothing is saved - there is no simulated fallback.
"""
import sys
from functools import lru_cache

from django.conf import settings
from django.db import transaction

from .models import Alert, DiseaseRiskPrediction, Village, WaterQualityTest, WaterRiskPrediction

WATERBORNE_DISEASES = 'Water-borne (acute diarrhoeal disease / cholera / gastroenteritis)'

WATER_ACTIONS = {
    'LOW': [
        'Continue routine monthly water quality testing.',
        'Keep the area around the source clean and drained.',
    ],
    'MEDIUM': [
        'Advise households to boil or chlorinate drinking water as a precaution.',
        'Send a sample for coliform / E. coli lab testing to confirm.',
        'Inspect the source for nearby sewage, latrines or animal waste.',
    ],
    'HIGH': [
        'Advise all households to boil or chlorinate drinking water.',
        'Send a sample for coliform / E. coli lab testing within 24 hours.',
        'Chlorinate the source and inspect for sewage ingress or broken seals.',
    ],
    'CRITICAL': [
        'Issue a boil-water advisory for this source immediately.',
        'Stop use of the source for drinking until a lab test confirms it is safe.',
        'Shock-chlorinate the source and trace the contamination (sewage, flooding, cracked casing).',
        'Watch for diarrhoea, vomiting or fever cases among users of this source.',
    ],
}

OUTBREAK_ACTIONS = {
    'LOW': ['Continue routine weekly IDSP surveillance reporting.'],
    'MEDIUM': [
        'Remind health workers to report diarrhoea and fever clusters promptly.',
        'Check ORS and zinc stock at sub-centres.',
    ],
    'HIGH': [
        'Step up active case finding for diarrhoea and cholera in high-risk villages.',
        'Pre-position ORS, zinc and chlorine tablets.',
        'Increase water quality testing frequency at community sources.',
    ],
    'CRITICAL': [
        'Alert the district Rapid Response Team.',
        'Run household chlorination and boil-water awareness drives.',
        'Pre-position ORS, IV fluids and cholera testing kits at PHCs.',
        'Test all community water sources in the district this week.',
    ],
}


class PredictionUnavailable(Exception):
    """A model could not produce a prediction; the message says why."""


@lru_cache(maxsize=1)
def _ml():
    ml_root = str(settings.ML_ROOT)
    if ml_root not in sys.path:
        sys.path.insert(0, ml_root)
    from aquashield_ml import outbreak, water
    return water, outbreak


# ─── Module A: water contamination ──────────────────────────────────

def _predict_test(test):
    water, _ = _ml()
    try:
        result = water.predict(
            ph=test.ph,
            temperature=test.temperature,
            tds=test.tds,
            dissolved_oxygen=test.dissolved_oxygen,
            nitrate=test.nitrate,
            source_type=test.water_source.source_type,
        )
    except FileNotFoundError as exc:
        raise PredictionUnavailable(f'Water risk model file missing: {exc}') from exc

    factors = []
    readings = {
        'ph': test.ph, 'temp_c': test.temperature, 'ec_us_cm': test.tds,
        'do_mg_l': test.dissolved_oxygen, 'nitrate_n_mg_l': test.nitrate,
    }
    for feature, impact in result['contributing_factors'].items():
        label, unit = water.FIELD_LABELS[feature]
        factors.append({
            'feature': feature,
            'label': label,
            'value': readings[feature],
            'unit': unit.strip(),
            'impact': impact,
            'description': water.describe_factor(feature, impact, readings[feature]),
        })

    # A lab result always overrides the field-reading estimate.
    lab_confirmed = bool(test.e_coli_detected)
    if lab_confirmed:
        result['risk_level'] = 'CRITICAL'
        result['risk_score'] = max(result['risk_score'], 90.0)
    return result, factors, lab_confirmed


def _water_explanation(source, result, factors, lab_confirmed):
    p = result['probability_fc_over_100']
    text = (
        f"Based on the latest field test of {source.name}, the model estimates a "
        f"{p:.0%} chance that faecal coliform exceeds 100 MPN/100 mL (WHO high-risk level)."
    )
    raising = [f['description'] for f in factors if f['impact'] >= 2][:2]
    if raising:
        text += ' Main drivers: ' + '; '.join(raising) + '.'
    if result['source_type_approximated']:
        text += ' This source type is not in the monitoring data, so it was scored as groundwater.'
    if lab_confirmed:
        text = (f'Lab test detected E. coli in {source.name}: the water is unsafe to drink. '
                f'(Field-reading estimate before the lab result: {p:.0%} chance of high contamination.)')
    return text


def refresh_village_water_risk(village):
    """
    Score the latest test of every water source in the village and store one
    WaterRiskPrediction for the village, taken from its riskiest source.
    Returns the prediction, or None if the village has no tests yet.
    """
    latest_tests = []
    for source in village.water_sources.all():
        test = source.quality_tests.order_by('-sample_date', '-id').first()
        if test:
            latest_tests.append(test)
    if not latest_tests:
        return None

    scored = []
    for test in latest_tests:
        result, factors, lab_confirmed = _predict_test(test)
        scored.append((test, result, factors, lab_confirmed))
    test, result, factors, lab_confirmed = max(scored, key=lambda s: s[1]['risk_score'])

    with transaction.atomic():
        previous = village.water_risk_predictions.filter(is_latest=True).first()
        prediction = WaterRiskPrediction.objects.create(
            village=village,
            risk_score=result['risk_score'],
            risk_level=result['risk_level'],
            contributing_factors={
                'water_test_id': test.id,
                'water_source': test.water_source.name,
                'water_source_type': test.water_source.source_type,
                'sample_date': test.sample_date.isoformat(),
                'probabilities': result['probabilities'],
                'probability_fc_over_100': result['probability_fc_over_100'],
                'lab_confirmed_e_coli': lab_confirmed,
                'source_type_approximated': result['source_type_approximated'],
                'factors': factors,
                'sources_scored': [
                    {'water_source': t.water_source.name, 'risk_score': r['risk_score'], 'risk_level': r['risk_level']}
                    for t, r, _, _ in scored
                ],
            },
            plain_language_explanation=_water_explanation(test.water_source, result, factors, lab_confirmed),
            recommended_actions=WATER_ACTIONS[result['risk_level']],
            model_name=result['model_name'],
            is_latest=True,
        )
        _raise_water_alert(prediction, previous, lab_confirmed)
    return prediction


def _raise_water_alert(prediction, previous, lab_confirmed):
    """
    Lab-confirmed E. coli -> boil-water advisory to everyone. A model-only
    CRITICAL estimate -> verification request to health workers, since an
    unconfirmed prediction should not be broadcast to the public.
    """
    if prediction.risk_level != 'CRITICAL':
        return
    alert_type = 'BOIL_WATER_ADVISORY' if lab_confirmed else 'WATER_CONTAMINATION'
    if Alert.objects.filter(village=prediction.village, alert_type=alert_type,
                            is_active=True, generated_by_ai=True).exists():
        return
    source = prediction.contributing_factors.get('water_source', 'a water source')
    if lab_confirmed:
        title = f'Boil Water Advisory: {source}'
        message = f'E. coli was detected in {source}. Do not drink this water without boiling it.'
        severity, audience = 'CRITICAL', 'ALL'
    else:
        title = f'Suspected contamination: {source}'
        message = (f'Field readings at {source} indicate critical faecal contamination risk '
                   f'(score {prediction.risk_score:.0f}/100). Confirm with a lab test.')
        severity, audience = 'HIGH', 'HEALTH_WORKER'
    Alert.objects.create(
        village=prediction.village,
        title=title[:200],
        message=message,
        severity=severity,
        alert_type=alert_type,
        target_audience=audience,
        action_required='\n'.join(prediction.recommended_actions),
        generated_by_ai=True,
        related_water_prediction=prediction,
    )


# ─── Module B: district outbreak risk ───────────────────────────────

def _outbreak_explanation(district, result):
    f = result['features']
    match = result['matched_location']
    lift = result['outbreak_probability'] / result['base_rate'] if result['base_rate'] else 0
    parts = [
        f"{district}: estimated {result['outbreak_probability']:.1%} chance of a reported water-borne "
        f"outbreak in the next 14 days ({lift:.1f}x the historical average of {result['base_rate']:.1%}).",
    ]
    if f.get('precip_4w') is not None and f.get('precip_4w_anom') is not None:
        anom = f['precip_4w_anom']
        trend = 'above' if anom >= 0 else 'below'
        parts.append(f"Rainfall over the last 4 weeks was {f['precip_4w']:.0f} mm, "
                     f"{abs(anom):.0f} mm {trend} normal for this time of year.")
    if f.get('hist_season_rate') is not None:
        parts.append(f"Between 2009 and 2022 this area averaged {f['hist_season_rate']:.1f} reported outbreaks "
                     f"per year in this season.")
    if match['distance_km'] > 50:
        parts.append(f"Nearest surveillance district with outbreak history: {match['district']} "
                     f"({match['distance_km']:.0f} km away).")
    return ' '.join(parts)


def district_coordinates(district):
    villages = Village.objects.filter(district=district)
    if not villages.exists():
        raise PredictionUnavailable(f'No villages registered in district {district}')
    lats = [float(v.latitude) for v in villages]
    lons = [float(v.longitude) for v in villages]
    return sum(lats) / len(lats), sum(lons) / len(lons)


def refresh_district_risk(district, weekly_climate=None):
    """Store a DiseaseRiskPrediction for the district using live NASA POWER climate."""
    _, outbreak = _ml()
    lat, lon = district_coordinates(district)
    try:
        result = outbreak.predict_live(lat, lon, weekly=weekly_climate)
    except outbreak.ClimateUnavailable as exc:
        raise PredictionUnavailable(f'Live climate unavailable for {district}: {exc}') from exc
    except FileNotFoundError as exc:
        raise PredictionUnavailable(f'Outbreak risk model file missing: {exc}') from exc

    with transaction.atomic():
        prediction = DiseaseRiskPrediction.objects.create(
            district=district,
            risk_score=result['risk_score'],
            risk_level=result['risk_level'],
            outbreak_probability=result['outbreak_probability'],
            predicted_disease=WATERBORNE_DISEASES,
            contributing_factors={
                'base_rate': result['base_rate'],
                'climate_week_ending': result['climate_week_ending'],
                'matched_location': result['matched_location'],
                'features': result['features'],
                'factors': result['contributing_factors'],
            },
            plain_language_explanation=_outbreak_explanation(district, result),
            recommended_actions=OUTBREAK_ACTIONS[result['risk_level']],
            model_name=result['model_name'],
            is_latest=True,
        )
        _raise_outbreak_alerts(prediction)
    return prediction


def _raise_outbreak_alerts(prediction):
    if prediction.risk_level != 'CRITICAL':
        return
    for village in Village.objects.filter(district=prediction.district):
        if Alert.objects.filter(village=village, alert_type='OUTBREAK_WARNING',
                                is_active=True, generated_by_ai=True).exists():
            continue
        Alert.objects.create(
            village=village,
            title=f'Outbreak risk critical in {prediction.district}'[:200],
            message=prediction.plain_language_explanation,
            severity='HIGH',
            alert_type='OUTBREAK_WARNING',
            target_audience='HEALTH_WORKER',
            action_required='\n'.join(prediction.recommended_actions),
            generated_by_ai=True,
            related_disease_prediction=prediction,
        )


# ─── Batch refresh and model info ───────────────────────────────────

def refresh_all(water=True, disease=True):
    """Re-run both modules for every village / district. Returns a summary dict."""
    summary = {'water': {'updated': 0, 'skipped': 0, 'errors': []},
               'disease': {'updated': 0, 'errors': []}}
    if water:
        for village in Village.objects.prefetch_related('water_sources'):
            try:
                if refresh_village_water_risk(village):
                    summary['water']['updated'] += 1
                else:
                    summary['water']['skipped'] += 1
            except PredictionUnavailable as exc:
                summary['water']['errors'].append(f'{village.name}: {exc}')
    if disease:
        # order_by() clears Village's default ordering by name, which would otherwise make distinct() per village.
        for district in Village.objects.order_by().values_list('district', flat=True).distinct():
            try:
                refresh_district_risk(district)
                summary['disease']['updated'] += 1
            except PredictionUnavailable as exc:
                summary['disease']['errors'].append(str(exc))
    return summary


def model_info():
    """Model names, training dates and headline validation metrics for the UI."""
    water, outbreak = _ml()
    info = {}
    for key, loader in [('water', water.load_artifact), ('outbreak', outbreak.load_artifact)]:
        try:
            artifact = loader()
        except FileNotFoundError:
            info[key] = {'status': 'MODEL_UNAVAILABLE'}
            continue
        info[key] = {
            'status': 'OK',
            'model_name': artifact['model_name'],
            'trained_at': artifact['trained_at'],
            'metrics': artifact['metrics'],
        }
    return info
