from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from .models import (
    User,
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

        # Create sample villages
        self.village_a = Village.objects.create(
            name="Rampur",
            code="RAM001",
            district="Varanasi",
            latitude=25.3176,
            longitude=82.9739,
            population=1500,
        )
        self.village_b = Village.objects.create(
            name="Shivpur",
            code="SHV002",
            district="Varanasi",
            latitude=25.3500,
            longitude=82.9500,
            population=2200,
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
        self.token_authority = Token.objects.create(user=self.authority).key

        self.worker = User.objects.create_user(
            username="worker_anita",
            email="anita@phc.gov.in",
            password="pass1234Secure",
            role="HEALTH_WORKER",
            first_name="Anita",
            last_name="Devi",
        )
        # Assign worker to Village A only
        self.worker.assigned_villages.add(self.village_a)
        self.token_worker = Token.objects.create(user=self.worker).key

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

    def test_evaluate_water_reading(self):
        """Test on-demand evaluation of a water sample with Module A ML model."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')
        payload = {
            'ph': 7.4,
            'temperature': 27.5,
            'tds': 350.0,
            'dissolved_oxygen': 6.2,
            'nitrate': 8.5,
            'source_type': 'TUBEWELL',
            'source_name': 'Sample Tube Well',
        }
        res = self.client.post('/api/risk/evaluate/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('risk_score', res.data)
        self.assertIn('risk_level', res.data)
        self.assertIn('probability_fc_over_100', res.data)
        self.assertIn('factors', res.data)
        self.assertIn('plain_language_explanation', res.data)
        self.assertIn('recommended_actions', res.data)
        self.assertIsInstance(res.data['recommended_actions'], list)

    def test_community_registration_requires_email(self):
        """COMMUNITY registration must require a valid email and fail if omitted."""
        payload = {
            'username': 'new_citizen',
            'password': 'password123',
            'first_name': 'New',
            'last_name': 'Citizen',
            'phone': '9876543210',
            # email missing
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid email format
        payload['email'] = 'invalid-email-format'
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid email succeeds
        payload['email'] = 'citizen.new@example.com'
        res = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['user']['email'], 'citizen.new@example.com')

    def test_create_authority_requires_email(self):
        """AUTHORITY creation must require a valid email."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_authority}')
        payload = {
            'username': 'new_officer',
            'password': 'officerPassword123',
            'first_name': 'Dr.',
            'last_name': 'Verma',
            # email missing
        }
        res = self.client.post('/api/manage/users/create-authority/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid email succeeds
        payload['email'] = 'verma@authority.gov.in'
        res = self.client.post('/api/manage/users/create-authority/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['email'], 'verma@authority.gov.in')

    def test_create_worker_requires_email(self):
        """HEALTH_WORKER creation must require a valid email."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_authority}')
        payload = {
            'username': 'new_field_worker',
            'password': 'workerPassword123',
            'first_name': 'Sunita',
            'last_name': 'Sharma',
            # email missing
        }
        res = self.client.post('/api/manage/users/create-worker/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid email succeeds
        payload['email'] = 'sunita.worker@health.gov.in'
        res = self.client.post('/api/manage/users/create-worker/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['email'], 'sunita.worker@health.gov.in')

    def test_forgot_password_otp_flow(self):
        """Test complete password reset flow: request OTP -> verify OTP -> confirm new password -> login."""
        from django.core import mail
        from aquacare.models import PasswordResetOTP

        # 1. Request OTP
        res = self.client.post('/api/auth/password-reset/request/', {'email': self.citizen.email}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Verify OTP was created in database
        otp_record = PasswordResetOTP.objects.filter(email=self.citizen.email, is_used=False).first()
        self.assertIsNotNone(otp_record)
        otp = otp_record.otp

        # 2. Verify OTP endpoint
        res = self.client.post('/api/auth/password-reset/verify-otp/', {
            'email': self.citizen.email,
            'otp': otp,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('valid'))

        # 3. Confirm password reset
        new_pass = 'newSuperSecurePassword999'
        res = self.client.post('/api/auth/password-reset/confirm/', {
            'email': self.citizen.email,
            'otp': otp,
            'new_password': new_pass,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 4. Verify user can log in with new password
        login_res = self.client.post('/api/auth/login/', {
            'username': self.citizen.username,
            'password': new_pass,
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res.data)

