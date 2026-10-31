import os
import duckdb
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from . import ml_service

DATASET_PATH = os.path.join(settings.BASE_DIR, 'data', 'waterborne_disease_dataset.csv').replace('\\', '/')

_DATASET_CACHE = None

def get_status_from_wqi(wqi):
    if wqi >= 70:
        return 'Safe'
    elif wqi >= 50:
        return 'Warning'
    elif wqi >= 25:
        return 'Unsafe'
    else:
        return 'Critical'

def _get_evaluated_dataset():
    """
    Loads and runs real-time Module A Machine Learning risk classification
    over the water quality records, caching the result in memory so that
    table display, AI Analyze modal, and filter queries use unified, 100% consistent
    risk scoring.
    """
    global _DATASET_CACHE
    if _DATASET_CACHE is not None:
        return _DATASET_CACHE

    conn = duckdb.connect(database=':memory:', read_only=False)
    query = f"""
        SELECT 
            state, district, region, latitude, longitude, 
            water_source, water_treatment, water_quality_index, 
            ph, turbidity_ntu, dissolved_oxygen_mg_l, bod_mg_l, 
            fecal_coliform_per_100ml, total_coliform_per_100ml, 
            tds_mg_l, nitrate_mg_l, fluoride_mg_l, arsenic_ug_l, 
            month, avg_temperature_c, avg_rainfall_mm, avg_humidity_pct, flooding
        FROM read_csv_auto('{DATASET_PATH}')
    """
    results = conn.execute(query).fetchall()
    columns = [desc[0] for desc in conn.description]

    records = []
    ml_status_map = {
        'LOW': 'safe',
        'MEDIUM': 'warning',
        'HIGH': 'unsafe',
        'CRITICAL': 'critical',
    }

    for idx, row in enumerate(results):
        row_dict = dict(zip(columns, row))
        wqi = row_dict.get('water_quality_index', 0)

        # Real-time evaluation using Module A CPCB Machine Learning Model
        try:
            eval_res = ml_service.evaluate_water_reading(
                ph=float(row_dict.get('ph')) if row_dict.get('ph') is not None else 7.2,
                temperature=float(row_dict.get('avg_temperature_c')) if row_dict.get('avg_temperature_c') is not None else 25.0,
                tds=float(row_dict.get('tds_mg_l')) if row_dict.get('tds_mg_l') is not None else 300.0,
                dissolved_oxygen=float(row_dict.get('dissolved_oxygen_mg_l')) if row_dict.get('dissolved_oxygen_mg_l') is not None else 6.0,
                nitrate=float(row_dict.get('nitrate_mg_l')) if row_dict.get('nitrate_mg_l') is not None else 10.0,
                source_type=row_dict.get('water_source', 'HANDPUMP'),
                fecal_coliform=float(row_dict.get('fecal_coliform_per_100ml')) if row_dict.get('fecal_coliform_per_100ml') is not None else None,
            )
            ml_risk_level = eval_res.get('risk_level', 'LOW')
            ml_risk_score = eval_res.get('risk_score', 0.0)
            status_val = ml_status_map.get(ml_risk_level, 'safe')
        except Exception:
            status_val = get_status_from_wqi(wqi).lower()
            ml_risk_level = 'LOW' if wqi >= 70 else ('MEDIUM' if wqi >= 50 else ('HIGH' if wqi >= 25 else 'CRITICAL'))
            ml_risk_score = 100.0 - float(wqi)

        records.append({
            'id': f'dataset-rec-{idx + 1}',
            'state': row_dict.get('state'),
            'district': row_dict.get('district'),
            'region': row_dict.get('region'),
            'latitude': row_dict.get('latitude'),
            'longitude': row_dict.get('longitude'),
            'waterSource': row_dict.get('water_source'),
            'waterTreatment': row_dict.get('water_treatment'),
            'waterQualityIndex': wqi,
            'ph': row_dict.get('ph'),
            'turbidity': row_dict.get('turbidity_ntu'),
            'dissolvedOxygen': row_dict.get('dissolved_oxygen_mg_l'),
            'bod': row_dict.get('bod_mg_l'),
            'fecalColiform': row_dict.get('fecal_coliform_per_100ml'),
            'totalColiform': row_dict.get('total_coliform_per_100ml'),
            'tds': row_dict.get('tds_mg_l'),
            'nitrate': row_dict.get('nitrate_mg_l'),
            'fluoride': row_dict.get('fluoride_mg_l'),
            'arsenic': row_dict.get('arsenic_ug_l'),
            'month': row_dict.get('month'),
            'temperature': row_dict.get('avg_temperature_c'),
            'rainfall': row_dict.get('avg_rainfall_mm'),
            'humidity': row_dict.get('avg_humidity_pct'),
            'flooding': row_dict.get('flooding'),
            'status': status_val,
            'mlRiskLevel': ml_risk_level,
            'mlRiskScore': ml_risk_score,
        })

    _DATASET_CACHE = records
    return _DATASET_CACHE


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_water_quality_dataset(request):
    # Parameters
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    offset = (page - 1) * limit

    state = request.query_params.get('state')
    district = request.query_params.get('district')
    month = request.query_params.get('month')
    water_source = request.query_params.get('water_source')
    water_treatment = request.query_params.get('water_treatment')
    status_filter = request.query_params.get('status')

    records = _get_evaluated_dataset()
    filtered = records

    if state:
        filtered = [r for r in filtered if r.get('state') and state.lower() in str(r['state']).lower()]
    if district:
        filtered = [r for r in filtered if r.get('district') and district.lower() in str(r['district']).lower()]
    if month:
        filtered = [r for r in filtered if r.get('month') and str(month).lower() in str(r['month']).lower()]
    if water_source:
        filtered = [r for r in filtered if r.get('waterSource') and water_source.lower() in str(r['waterSource']).lower()]
    if water_treatment:
        filtered = [r for r in filtered if r.get('waterTreatment') and water_treatment.lower() in str(r['waterTreatment']).lower()]
    if status_filter:
        s_filt = status_filter.lower()
        level_synonyms = {
            'safe': {'safe', 'low'},
            'low': {'safe', 'low'},
            'warning': {'warning', 'medium', 'moderate'},
            'medium': {'warning', 'medium', 'moderate'},
            'moderate': {'warning', 'medium', 'moderate'},
            'unsafe': {'unsafe', 'high'},
            'high': {'unsafe', 'high'},
            'critical': {'critical'},
        }
        allowed = level_synonyms.get(s_filt, {s_filt})
        filtered = [r for r in filtered if r['status'].lower() in allowed or r['mlRiskLevel'].lower() in allowed]

    total_count = len(filtered)
    page_data = filtered[offset : offset + limit]

    return Response({
        'data': page_data,
        'page': page,
        'limit': limit,
        'total': total_count
    })
