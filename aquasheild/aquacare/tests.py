from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from .models import (
    User,
    District,
    Village,
    WaterSource,
    WaterQualityTest,
    HealthRecord,
    CommunityReport,
    Alert,
    AlertAcknowledgement,
)


class AquaCareRBACTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create sample district
        self.district = District.objects.create(
            name="Varanasi",
            code="VAR001",
            state="Uttar Pradesh",
        )

        # Create users with different roles
        self.authority = User.objects.create_user(
            username="authority_dr_gupta",
            email="gupta@phc.gov.in",
            password="pass1234Secure",
            role="AUTHORITY",
            first_name="Dr. S.K.",
            last_name="Gupta",
        )
        self.district.authority = self.authority
        self.district.save()
        self.token_authority = Token.objects.create(user=self.authority).key

        self.worker = User.objects.create_user(
            username="worker_anita",
            email="anita@phc.gov.in",
            password="pass1234Secure",
            role="HEALTH_WORKER",
            first_name="Anita",
            last_name="Devi",
        )
        self.token_worker = Token.objects.create(user=self.worker).key

        # Create sample villages (Village A assigned to worker; Village B unassigned)
        self.village_a = Village.objects.create(
            name="Rampur",
            code="RAM001",
            district=self.district,
            authority=self.authority,
            assigned_worker=self.worker,
            latitude=25.3176,
            longitude=82.9739,
            population=1500,
        )
        self.village_b = Village.objects.create(
            name="Shivpur",
            code="SHV002",
            district=self.district,
            authority=self.authority,
            latitude=25.3500,
            longitude=82.9500,
            population=2200,
        )

        self.citizen = User.objects.create_user(
            username="citizen_ramesh",
            email="ramesh@gmail.com",
            password="pass1234Secure",
            role="COMMUNITY",
            first_name="Ramesh",
            last_name="Kumar",
            village=self.village_a,
        )
        self.token_citizen = Token.objects.create(user=self.citizen).key

        # Create water source in Village A
        self.water_source_a = WaterSource.objects.create(
            village=self.village_a,
            name="Community Handpump #1",
            source_type="HANDPUMP",
            status="SAFE",
        )

        # Create water source in Village B
        self.water_source_b = WaterSource.objects.create(
            village=self.village_b,
            name="North TubeWell #2",
            source_type="TUBEWELL",
            status="SAFE",
        )

    # ─── 1. RBAC on Health Records (Clinical Surveillance) ────────────

    def test_citizen_cannot_access_health_records(self):
        """Citizens must be forbidden (403) from viewing or logging clinical records."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_citizen}')

        # Attempt GET
        res_get = self.client.get('/api/health-records/')
        self.assertEqual(res_get.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt POST
        res_post = self.client.post('/api/health-records/', {
            'village': self.village_a.id,
            'age': 32,
            'gender': 'M',
            'disease_type': 'CHOLERA',
            'symptoms': ['Diarrhea', 'Vomiting'],
            'date_of_onset': '2026-09-01',
        }, format='json')
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_health_worker_can_log_case_in_assigned_village(self):
        """Health worker can log a health record in their assigned village."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')

        payload = {
            'village': self.village_a.id,
            'patient_name': 'Suresh',
            'age': 28,
            'gender': 'M',
            'disease_type': 'CHOLERA',
            'symptoms': ['Vomiting', 'Dehydration'],
            'severity': 'SEVERE',
            'status': 'UNDER_TREATMENT',
            'date_of_onset': '2026-09-02',
        }
        res = self.client.post('/api/health-records/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['patient_name'], 'Suresh')
        self.assertEqual(HealthRecord.objects.count(), 1)
        self.assertEqual(HealthRecord.objects.first().recorded_by, self.worker)

    def test_health_worker_cannot_log_case_in_unassigned_village(self):
        """Health worker assigned to Village A cannot log cases for Village B."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')

        payload = {
            'village': self.village_b.id,
            'patient_name': 'Rohan',
            'age': 40,
            'gender': 'M',
            'disease_type': 'TYPHOID',
            'symptoms': ['High Fever'],
            'date_of_onset': '2026-09-03',
        }
        res = self.client.post('/api/health-records/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('jurisdiction', res.data['error'].lower())

    def test_authority_can_access_and_delete_health_records(self):
        """Authority can view all records and delete records."""
        rec = HealthRecord.objects.create(
            village=self.village_b,
            recorded_by=self.authority,
            age=45,
            gender='F',
            disease_type='TYPHOID',
            date_of_onset='2026-09-01',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_authority}')
        res_get = self.client.get('/api/health-records/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_get.data), 1)

        res_del = self.client.delete(f'/api/health-records/{rec.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(HealthRecord.objects.count(), 0)

    # ─── 2. Alerts Broadcasting RBAC ─────────────────────────────────

    def test_only_authority_can_broadcast_alert(self):
        """Only users with AUTHORITY role can broadcast alerts."""
        payload = {
            'village': self.village_a.id,
            'title': 'Boil Water Advisory: Handpump #1 Contaminated',
            'message': 'High coliform detected. Boil water for 5 minutes before drinking.',
            'severity': 'HIGH',
            'alert_type': 'BOIL_WATER_ADVISORY',
            'target_audience': 'ALL',
            'action_required': 'Boil water',
        }

        # Community citizen fails
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_citizen}')
        res_cit = self.client.post('/api/alerts/', payload, format='json')
        self.assertEqual(res_cit.status_code, status.HTTP_403_FORBIDDEN)

        # Health Worker fails
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')
        res_wrk = self.client.post('/api/alerts/', payload, format='json')
        self.assertEqual(res_wrk.status_code, status.HTTP_403_FORBIDDEN)

        # Authority succeeds
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_authority}')
        res_auth = self.client.post('/api/alerts/', payload, format='json')
        self.assertEqual(res_auth.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Alert.objects.count(), 1)
        alert_id = res_auth.data['id']

        # Citizen can acknowledge alert
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_citizen}')
        res_ack = self.client.post(f'/api/alerts/{alert_id}/acknowledge/')
        self.assertEqual(res_ack.status_code, status.HTTP_200_OK)
        self.assertEqual(AlertAcknowledgement.objects.count(), 1)

        # Authority resolves alert
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_authority}')
        res_resolve = self.client.patch(f'/api/alerts/{alert_id}/resolve/')
        self.assertEqual(res_resolve.status_code, status.HTTP_200_OK)
        self.assertFalse(res_resolve.data['is_active'])

    # ─── 3. Water Quality & Automatic WQI Calculation ────────────────

    def test_water_quality_wqi_and_source_status_auto_update(self):
        """Logging a contaminated water sample auto-calculates WQI and sets WaterSource to CONTAMINATED."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')

        payload = {
            'water_source': self.water_source_a.id,
            'ph': 5.5,                 # Acidic (abnormal)
            'turbidity': 8.5,          # High turbidity (>5)
            'tds': 650.0,              # Elevated TDS (>500)
            'temperature': 26.0,
            'coliform_bacteria': 25.0, # High coliform
            'e_coli_detected': True,   # Pathogen present
        }

        res = self.client.post('/api/water-quality/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'UNSAFE')
        self.assertLess(res.data['wqi'], 30.0)

        # Verify parent WaterSource status updated to CONTAMINATED
        self.water_source_a.refresh_from_db()
        self.assertEqual(self.water_source_a.status, 'CONTAMINATED')

    def test_citizen_cannot_log_water_quality_test(self):
        """Community users cannot record water quality tests."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_citizen}')
        res = self.client.post('/api/water-quality/', {
            'water_source': self.water_source_a.id,
            'ph': 7.0,
            'turbidity': 1.0,
            'tds': 200.0,
            'temperature': 25.0,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # ─── 4. Community Report Lifecycle & Review ──────────────────────

    def test_community_report_submission_and_worker_review(self):
        """Citizen submits issue; assigned health worker reviews and resolves it."""
        # 1. Citizen submits report
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_citizen}')
        report_payload = {
            'symptoms': ['Diarrhea', 'Stomach Cramps'],
            'people_affected': 3,
            'age_group': 'CHILD',
            'water_source_suspected': self.water_source_a.id,
            'water_issue_observed': 'Foul smell and yellow tint',
            'description': '3 kids in my family fell ill after drinking from Community Handpump #1.',
        }
        res_submit = self.client.post('/api/community-reports/', report_payload, format='json')
        self.assertEqual(res_submit.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_submit.data['status'], 'SUBMITTED')
        report_id = res_submit.data['id']

        # 2. Worker for Village A reviews report
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')
        review_payload = {
            'status': 'VERIFIED',
            'review_notes': 'Visited site. Water sample collected for lab culture. Chlorination initiated.',
        }
        res_review = self.client.patch(f'/api/community-reports/{report_id}/review/', review_payload, format='json')
        self.assertEqual(res_review.status_code, status.HTTP_200_OK)
        self.assertEqual(res_review.data['status'], 'VERIFIED')
        self.assertEqual(res_review.data['reviewed_by'], self.worker.id)

    # ─── 5. Dashboard Summary Statistics ─────────────────────────────

    def test_dashboard_stats_endpoint(self):
        """Dashboard stats returns correct live aggregates."""
        # Create a health record and active alert
        HealthRecord.objects.create(
            village=self.village_a,
            recorded_by=self.worker,
            age=22,
            gender='F',
            disease_type='ACUTE_DIARRHEA',
            date_of_onset='2026-09-04',
        )
        Alert.objects.create(
            village=self.village_a,
            title='Advisory',
            message='Caution',
            is_active=True,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_authority}')
        res = self.client.get('/api/dashboard/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        self.assertEqual(data['total_villages'], 2)
        self.assertEqual(data['total_water_sources'], 2)
        self.assertEqual(data['active_alerts'], 1)
        self.assertEqual(data['recent_cases_30d'], 1)

    # ─── 6. Administrative Hierarchy & District Surveillance ──────────

    def test_district_list_and_detail_endpoints(self):
        """Districts API returns monitored districts with village counts and details."""
        res_list = self.client.get('/api/districts/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)
        self.assertEqual(res_list.data[0]['name'], 'Varanasi')
        self.assertEqual(res_list.data[0]['villages_count'], 2)
        self.assertEqual(res_list.data[0]['authority_name'], 'Dr. S.K. Gupta')

        res_detail = self.client.get(f'/api/districts/{self.district.id}/')
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertIn('villages', res_detail.data)
        self.assertEqual(len(res_detail.data['villages']), 2)

    def test_administrative_hierarchy_constraints(self):
        """
        Enforces:
        - Exactly one health worker per village (FK on Village).
        - One health worker can cover multiple villages.
        """
        # Initially Village A has Anita, Village B has None
        self.assertEqual(self.village_a.assigned_worker, self.worker)
        self.assertIsNone(self.village_b.assigned_worker)
        self.assertEqual(self.worker.assigned_villages.count(), 1)

        # Assign Village B to Anita as well (worker covering multiple villages)
        self.village_b.assigned_worker = self.worker
        self.village_b.save()
        self.assertEqual(self.worker.assigned_villages.count(), 2)

        # Create worker Rajesh and assign him to Village A (replaces Anita on Village A)
        worker2 = User.objects.create_user(
            username="worker_rajesh",
            email="rajesh@phc.gov.in",
            password="pass1234Secure",
            role="HEALTH_WORKER",
            first_name="Rajesh",
            last_name="Verma",
        )
        self.village_a.assigned_worker = worker2
        self.village_a.save()

        self.village_a.refresh_from_db()
        self.assertEqual(self.village_a.assigned_worker, worker2)
        # Anita now only has Village B
        self.assertEqual(self.worker.assigned_villages.count(), 1)
        self.assertEqual(self.worker.assigned_villages.first(), self.village_b)

    def test_village_district_serialization(self):
        """VillageSerializer exposes district as a string name for frontend Leaflet map compatibility."""
        res = self.client.get('/api/villages/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 2)
        # Verify district is serialized as string name, not an object or ID
        self.assertEqual(res.data[0]['district'], 'Varanasi')

        # Test filtering by district query param
        res_filter = self.client.get('/api/villages/?district=Varanasi')
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_filter.data), 2)

