from unittest import mock

import pandas as pd
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from . import ml_service
from .models import (
    Alert,
    DiseaseRiskPrediction,
    User,
    Village,
    WaterQualityTest,
    WaterRiskPrediction,
    WaterSource,
)


def synthetic_weekly_climate(weeks=12, precip=40.0):
    """Consecutive ISO weeks of plausible monsoon-season climate."""
    start = pd.Timestamp('2026-07-06')  # a Monday
    rows = []
    for i in range(weeks):
        iso = (start + pd.Timedelta(weeks=i)).isocalendar()
        rows.append({'iso_year': iso.year, 'iso_week': iso.week,
                     'temp_mean_c': 29.0, 'precip_mm': precip, 'humidity_pct': 85.0})
    df = pd.DataFrame(rows)
    df.attrs['precip_scale_corrected'] = False
    return df


class RiskPredictionTestCase(TestCase):
    """Uses the real trained models in <repo>/ml/models."""

    def setUp(self):
        self.client = APIClient()
        self.village = Village.objects.create(
            name='Rampur', code='RAM001', district='Varanasi', state='Uttar Pradesh',
            latitude=25.3176, longitude=82.9739,
        )
        self.other_village = Village.objects.create(
            name='Shivpur', code='SHV002', district='Varanasi', state='Uttar Pradesh',
            latitude=25.35, longitude=82.95,
        )
        self.authority = User.objects.create_user(username='auth', password='pass1234Secure', role='AUTHORITY')
        self.worker = User.objects.create_user(username='worker', password='pass1234Secure', role='HEALTH_WORKER')
        self.worker.assigned_villages.add(self.village)
        self.citizen = User.objects.create_user(username='citizen', password='pass1234Secure',
                                                role='COMMUNITY', village=self.village)
        self.tokens = {u.username: Token.objects.create(user=u).key
                       for u in (self.authority, self.worker, self.citizen)}
        self.handpump = WaterSource.objects.create(village=self.village, name='Handpump #1', source_type='HANDPUMP')
        self.pond = WaterSource.objects.create(village=self.village, name='Village Pond', source_type='POND')

    def login(self, username):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.tokens[username]}')

    def add_test(self, source, **overrides):
        values = dict(water_source=source, village=source.village, ph=7.4, turbidity=2.0, tds=420,
                      temperature=26, dissolved_oxygen=6.0, nitrate=8)
        values.update(overrides)
        return WaterQualityTest.objects.create(**values)

    # ─── Module A: water contamination ────────────────────────────────

    def test_posting_water_test_creates_water_risk_prediction(self):
        self.login('worker')
        res = self.client.post('/api/water-quality/', {
            'water_source': self.handpump.id, 'ph': 7.4, 'turbidity': 1.0, 'tds': 420,
            'temperature': 26, 'dissolved_oxygen': 6.0, 'nitrate': 8,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        pred = res.data['risk_prediction']
        self.assertIsNotNone(pred)
        self.assertEqual(pred['risk_level'], 'LOW')  # clean groundwater
        self.assertTrue(0 <= pred['risk_score'] <= 100)
        self.assertEqual(WaterRiskPrediction.objects.filter(village=self.village, is_latest=True).count(), 1)
        factors = pred['contributing_factors']
        self.assertAlmostEqual(sum(factors['probabilities'].values()), 1.0, places=3)
        self.assertEqual({f['feature'] for f in factors['factors']},
                         {'ph', 'temp_c', 'ec_us_cm', 'do_mg_l', 'nitrate_n_mg_l'})

    def test_village_risk_follows_riskiest_source_and_low_do_raises_risk(self):
        self.add_test(self.handpump)
        self.add_test(self.pond, ph=7.9, temperature=30, tds=950, dissolved_oxygen=1.5, nitrate=35)
        pred = ml_service.refresh_village_water_risk(self.village)
        self.assertEqual(pred.contributing_factors['water_source'], 'Village Pond')
        do_factor = next(f for f in pred.contributing_factors['factors'] if f['feature'] == 'do_mg_l')
        self.assertGreater(do_factor['impact'], 0)  # monotonic constraint: low DO cannot lower risk

        # Only one prediction per village is flagged latest.
        ml_service.refresh_village_water_risk(self.village)
        self.assertEqual(WaterRiskPrediction.objects.filter(village=self.village, is_latest=True).count(), 1)

    def test_lab_confirmed_e_coli_overrides_model_and_issues_public_advisory(self):
        self.add_test(self.handpump, e_coli_detected=True)
        pred = ml_service.refresh_village_water_risk(self.village)
        self.assertEqual(pred.risk_level, 'CRITICAL')
        self.assertTrue(pred.contributing_factors['lab_confirmed_e_coli'])
        alert = Alert.objects.get(related_water_prediction=pred)
        self.assertEqual(alert.alert_type, 'BOIL_WATER_ADVISORY')
        self.assertEqual(alert.target_audience, 'ALL')
        self.assertTrue(alert.generated_by_ai)

        # A second refresh does not duplicate the active advisory.
        ml_service.refresh_village_water_risk(self.village)
        self.assertEqual(Alert.objects.filter(village=self.village, alert_type='BOIL_WATER_ADVISORY').count(), 1)

    def test_village_without_tests_gets_no_prediction(self):
        self.assertIsNone(ml_service.refresh_village_water_risk(self.other_village))

    def test_water_risk_endpoints(self):
        self.add_test(self.handpump)
        ml_service.refresh_village_water_risk(self.village)
        self.login('citizen')
        res = self.client.get('/api/risk/water/', {'village_id': self.village.id})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['village_district'], 'Varanasi')
        res = self.client.get(f'/api/risk/water/{self.village.id}/history/')
        self.assertEqual(len(res.data), 1)

        # Citizens cannot trigger re-scoring; workers only in their own villages.
        res = self.client.post(f'/api/risk/water/{self.village.id}/refresh/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.login('worker')
        self.assertEqual(self.client.post(f'/api/risk/water/{self.village.id}/refresh/').status_code,
                         status.HTTP_201_CREATED)
        self.assertEqual(self.client.post(f'/api/risk/water/{self.other_village.id}/refresh/').status_code,
                         status.HTTP_403_FORBIDDEN)

    # ─── Module B: district outbreak risk ─────────────────────────────

    def test_district_prediction_with_supplied_climate(self):
        pred = ml_service.refresh_district_risk('Varanasi', weekly_climate=synthetic_weekly_climate())
        self.assertEqual(pred.district, 'Varanasi')
        self.assertTrue(0 <= pred.outbreak_probability <= 1)
        self.assertTrue(0 <= pred.risk_score <= 100)
        self.assertIn(pred.risk_level, {'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'})
        match = pred.contributing_factors['matched_location']
        self.assertLess(match['distance_km'], 100)  # Varanasi is an IDSP-reporting district
        self.assertIn('Varanasi', pred.plain_language_explanation)

    def test_heavier_rain_does_not_crash_and_is_recorded(self):
        dry = ml_service.refresh_district_risk('Varanasi', weekly_climate=synthetic_weekly_climate(precip=5))
        wet = ml_service.refresh_district_risk('Varanasi', weekly_climate=synthetic_weekly_climate(precip=150))
        self.assertEqual(DiseaseRiskPrediction.objects.filter(district='Varanasi', is_latest=True).get(), wet)
        self.assertNotEqual(dry.contributing_factors['features']['precip_4w'],
                            wet.contributing_factors['features']['precip_4w'])

    def test_climate_outage_stores_nothing_and_is_reported(self):
        _, outbreak = ml_service._ml()
        with mock.patch.object(outbreak, 'recent_weekly_climate',
                               side_effect=outbreak.ClimateUnavailable('NASA POWER request failed')):
            with self.assertRaises(ml_service.PredictionUnavailable):
                ml_service.refresh_district_risk('Varanasi')
            self.login('auth')
            res = self.client.post('/api/risk/refresh/', {'water': False, 'disease': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['disease']['updated'], 0)
        self.assertEqual(len(res.data['disease']['errors']), 1)  # two villages, one district
        self.assertIn('NASA POWER', res.data['disease']['errors'][0])
        self.assertFalse(DiseaseRiskPrediction.objects.exists())

    def test_refresh_all_is_authority_only(self):
        self.login('worker')
        self.assertEqual(self.client.post('/api/risk/refresh/').status_code, status.HTTP_403_FORBIDDEN)

    def test_model_info(self):
        self.login('citizen')
        res = self.client.get('/api/risk/models/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['water']['status'], 'OK')
        self.assertEqual(res.data['outbreak']['status'], 'OK')
        self.assertIn('rolling_mean', res.data['outbreak']['metrics'])
