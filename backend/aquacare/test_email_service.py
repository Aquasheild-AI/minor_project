"""
Unit tests for the Brevo Transactional Email Service and associated workflows.
All external HTTP requests are mocked; no real emails are sent during tests.
"""
from unittest.mock import MagicMock, patch
import requests
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from .models import User, Village, CommunityReport
from .email_service import (
    BrevoEmailService,
    send_transactional_email,
    EmailServiceError,
    EmailConfigurationError,
    EmailDeliveryError,
    EmailTimeoutError,
    _normalize_recipients,
    _mask_email,
)


class BrevoEmailServiceUnitTests(TestCase):
    """Direct unit tests for BrevoEmailService with mocked requests.post."""

    def setUp(self):
        self.api_key = "xkeysib-test-mock-api-key-123456"
        self.sender_email = "testsender@aquashield.org"
        self.sender_name = "AquaShield Testing"
        self.service = BrevoEmailService(
            api_key=self.api_key,
            sender_email=self.sender_email,
            sender_name=self.sender_name,
            timeout=5.0,
        )

    # ─── 1. Successful Delivery ───────────────────────────────────────
    @patch('requests.post')
    def test_successful_email_delivery_response(self, mock_post):
        """Test successful email dispatch returns 201 with messageId."""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.content = b'{"messageId": "<test-msg-20261101@smtp-relay.brevo.com>"}'
        mock_response.json.return_value = {"messageId": "<test-msg-20261101@smtp-relay.brevo.com>"}
        mock_post.return_value = mock_response

        result = self.service.send(
            to="recipient@example.com",
            subject="Test OTP Code",
            text_content="Your OTP is 123456",
            html_content="<p>Your OTP is 123456</p>",
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['message_id'], "<test-msg-20261101@smtp-relay.brevo.com>")
        self.assertEqual(result['status_code'], 201)

        # Verify correct HTTP parameters
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], 'https://api.brevo.com/v3/smtp/email')
        self.assertEqual(kwargs['headers']['api-key'], self.api_key)
        self.assertEqual(kwargs['headers']['Content-Type'], 'application/json')
        self.assertEqual(kwargs['headers']['Accept'], 'application/json')
        self.assertEqual(kwargs['timeout'], 5.0)

        payload = kwargs['json']
        self.assertEqual(payload['sender']['email'], self.sender_email)
        self.assertEqual(payload['sender']['name'], self.sender_name)
        self.assertEqual(payload['to'], [{'email': 'recipient@example.com'}])
        self.assertEqual(payload['subject'], "Test OTP Code")
        self.assertEqual(payload['textContent'], "Your OTP is 123456")
        self.assertEqual(payload['htmlContent'], "<p>Your OTP is 123456</p>")

    # ─── 2. Invalid API Key Response ──────────────────────────────────
    @patch('requests.post')
    def test_invalid_api_key_response(self, mock_post):
        """Test 401 Unauthorized raises EmailDeliveryError or fails silently."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = '{"code": "unauthorized", "message": "Key not found"}'
        mock_response.json.return_value = {"code": "unauthorized", "message": "Key not found"}
        mock_post.return_value = mock_response

        # Fail loudly
        with self.assertRaises(EmailDeliveryError) as ctx:
            self.service.send(
                to="citizen@example.com",
                subject="Test",
                text_content="Hello",
                fail_silently=False,
            )
        self.assertIn("401", str(ctx.exception))
        self.assertIn("Key not found", str(ctx.exception))

        # Fail silently
        silent_res = self.service.send(
            to="citizen@example.com",
            subject="Test",
            text_content="Hello",
            fail_silently=True,
        )
        self.assertFalse(silent_res['success'])
        self.assertEqual(silent_res['status_code'], 401)

    # ─── 3. Connection Timeout ────────────────────────────────────────
    @patch('requests.post')
    def test_connection_timeout(self, mock_post):
        """Test request timeout raises EmailTimeoutError or returns 504 silently."""
        mock_post.side_effect = requests.exceptions.Timeout("HTTPS connection timed out")

        # Fail loudly
        with self.assertRaises(EmailTimeoutError) as ctx:
            self.service.send(
                to="citizen@example.com",
                subject="Test Timeout",
                text_content="Hello",
                fail_silently=False,
            )
        self.assertIn("timed out", str(ctx.exception))

        # Fail silently
        silent_res = self.service.send(
            to="citizen@example.com",
            subject="Test Timeout",
            text_content="Hello",
            fail_silently=True,
        )
        self.assertFalse(silent_res['success'])
        self.assertEqual(silent_res['status_code'], 504)

    # ─── 4. Missing Environment Variables ─────────────────────────────
    @patch.dict('os.environ', {'BREVO_API_KEY': '', 'BREVO_SENDER_EMAIL': ''})
    @override_settings(BREVO_API_KEY='', BREVO_SENDER_EMAIL='')
    def test_missing_environment_variables(self):
        """Test missing API key or sender email raises EmailConfigurationError."""
        # Missing API Key from env and settings
        svc_no_key = BrevoEmailService(sender_email="sender@aquashield.org")
        with self.assertRaises(EmailConfigurationError) as ctx_key:
            svc_no_key.send(to="test@example.com", subject="Test", text_content="Hi")
        self.assertIn("BREVO_API_KEY", str(ctx_key.exception))

        # Missing Sender Email from env and settings
        svc_no_sender = BrevoEmailService(api_key="valid-key")
        with self.assertRaises(EmailConfigurationError) as ctx_sender:
            svc_no_sender.send(to="test@example.com", subject="Test", text_content="Hi")
        self.assertIn("BREVO_SENDER_EMAIL", str(ctx_sender.exception))

        # Explicitly empty strings passed to constructor
        svc_explicit_empty = BrevoEmailService(api_key="", sender_email="sender@aquashield.org")
        with self.assertRaises(EmailConfigurationError):
            svc_explicit_empty.send(to="test@example.com", subject="Test", text_content="Hi")

    # ─── 5. Recipient Normalization ───────────────────────────────────
    def test_recipient_normalization(self):
        """Test various recipient formats are normalized correctly."""
        # Single string
        self.assertEqual(_normalize_recipients("user@example.com"), [{"email": "user@example.com"}])

        # List of strings
        self.assertEqual(
            _normalize_recipients(["a@example.com", "b@example.com"]),
            [{"email": "a@example.com"}, {"email": "b@example.com"}]
        )

        # List of dicts with name
        self.assertEqual(
            _normalize_recipients([{"email": "worker@gov.in", "name": "Health Worker 1"}]),
            [{"email": "worker@gov.in", "name": "Health Worker 1"}]
        )

        # Empty or invalid
        with self.assertRaises(ValueError):
            _normalize_recipients([])
        with self.assertRaises(ValueError):
            _normalize_recipients("")

    # ─── 6. Email Masking for Privacy ─────────────────────────────────
    def test_mask_email(self):
        """Test email address privacy masking for logging."""
        self.assertEqual(_mask_email("abhinav@example.com"), "a***v@example.com")
        self.assertEqual(_mask_email("dr.gupta@gov.in"), "d***a@gov.in")
        self.assertEqual(_mask_email("invalid"), "***")


class BrevoWorkflowIntegrationTests(TestCase):
    """Integration tests verifying that existing email workflows call the new Brevo service."""

    def setUp(self):
        self.client = APIClient()

        self.village = Village.objects.create(
            name="Rampur",
            code="RAM001",
            district="Varanasi",
            latitude=25.3176,
            longitude=82.9739,
            population=1500,
        )

        self.worker = User.objects.create_user(
            username="worker_anita",
            email="anita@phc.gov.in",
            password="pass1234Secure",
            role="HEALTH_WORKER",
            first_name="Anita",
            last_name="Devi",
        )
        self.worker.assigned_villages.add(self.village)
        self.token_worker = Token.objects.create(user=self.worker).key

        self.citizen = User.objects.create_user(
            username="citizen_ramesh",
            email="ramesh@gmail.com",
            password="pass1234Secure",
            role="COMMUNITY",
            first_name="Ramesh",
            last_name="Kumar",
            village=self.village,
        )
        self.token_citizen = Token.objects.create(user=self.citizen).key

    # ─── 7. Password Reset Workflow ───────────────────────────────────
    @patch('aquacare.views.send_transactional_email')
    def test_password_reset_workflow_triggers_brevo(self, mock_send_email):
        """Verify password reset request dispatches OTP via send_transactional_email."""
        mock_send_email.return_value = {
            'success': True,
            'message_id': '<pwd-reset-msg-123>',
            'status_code': 201,
        }

        res = self.client.post(
            '/api/auth/password-reset/request/',
            {'email': self.citizen.email},
            format='json',
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_send_email.assert_called_once()
        _, kwargs = mock_send_email.call_args
        self.assertEqual(kwargs['to'], self.citizen.email)
        self.assertIn("Password Reset Verification Code", kwargs['subject'])
        self.assertIn("AquaShield", kwargs['text_content'])
        self.assertIn("AquaShield", kwargs['html_content'])
        self.assertFalse(kwargs['fail_silently'])

    # ─── 8. Community Report Submission Workflow ──────────────────────
    @patch('aquacare.views.send_transactional_email')
    def test_community_report_submission_triggers_worker_notification(self, mock_send_email):
        """Verify report creation dispatches alert to assigned health worker."""
        mock_send_email.return_value = {
            'success': True,
            'message_id': '<worker-alert-msg-456>',
            'status_code': 201,
        }

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_citizen}')
        payload = {
            'village': self.village.id,
            'reporter_name': 'Ramesh Kumar',
            'reporter_phone': '9876543210',
            'people_affected': '3',
            'symptoms': ['Fever', 'Diarrhea'],
            'description': 'Water tastes unusual and several family members have stomach ache.',
        }

        res = self.client.post('/api/community-reports/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        mock_send_email.assert_called_once()
        _, kwargs = mock_send_email.call_args
        self.assertIn("anita@phc.gov.in", kwargs['to'])
        self.assertIn("[AquaShield Alert] New Citizen Report", kwargs['subject'])
        self.assertTrue(kwargs['fail_silently'])

    # ─── 9. Community Report Review Workflow ──────────────────────────
    @patch('aquacare.views.send_transactional_email')
    def test_community_report_review_triggers_citizen_notification(self, mock_send_email):
        """Verify health worker review dispatches status notification to reporting citizen."""
        mock_send_email.return_value = {
            'success': True,
            'message_id': '<citizen-status-msg-789>',
            'status_code': 201,
        }

        # Create submitted report
        report = CommunityReport.objects.create(
            village=self.village,
            citizen=self.citizen,
            reporter_name=self.citizen.get_full_name(),
            people_affected=2,
            symptoms=['Vomiting'],
            status='SUBMITTED',
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_worker}')
        patch_payload = {
            'status': 'VERIFIED',
            'review_notes': 'Confirmed cases in Ward 3. Water sample collected.',
        }

        res = self.client.patch(f'/api/community-reports/{report.id}/review/', patch_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        mock_send_email.assert_called_once()
        _, kwargs = mock_send_email.call_args
        self.assertEqual(kwargs['to'], self.citizen.email)
        self.assertIn("[AquaShield Update] Your Health Report", kwargs['subject'])
        self.assertIn("Verified", kwargs['subject'])
        self.assertTrue(kwargs['fail_silently'])
