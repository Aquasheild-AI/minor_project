"""
Brevo (formerly Sendinblue) Transactional Email Service.

Sends transactional emails via the Brevo v3 HTTPS REST API:
POST https://api.brevo.com/v3/smtp/email

Replaces legacy SMTP connections (ports 25, 465, 587) with secure,
authenticated HTTPS calls using the 'api-key' header.
"""
import os
import logging
from typing import Any, Dict, List, Optional, Union
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
DEFAULT_TIMEOUT_SECONDS = 10.0


class EmailServiceError(Exception):
    """Base exception for transactional email service errors."""
    pass


class EmailConfigurationError(EmailServiceError):
    """Raised when Brevo credentials or sender settings are missing/invalid."""
    pass


class EmailDeliveryError(EmailServiceError):
    """Raised when Brevo API rejects an email or encounters a delivery error."""
    pass


class EmailTimeoutError(EmailDeliveryError):
    """Raised when the HTTPS connection to Brevo API times out."""
    pass


def _mask_email(email_str: str) -> str:
    """Mask email for privacy in logs (e.g. j***e@example.com)."""
    if not email_str or '@' not in email_str:
        return '***'
    try:
        user_part, domain = email_str.split('@', 1)
        if len(user_part) <= 2:
            masked_user = user_part[0] + '***'
        else:
            masked_user = user_part[0] + '***' + user_part[-1]
        return f"{masked_user}@{domain}"
    except Exception:
        return '***'


def _normalize_recipients(to: Union[str, List[Union[str, Dict[str, str]]]]) -> List[Dict[str, str]]:
    """
    Normalizes diverse recipient representations into Brevo's expected format:
    [{'email': 'user@example.com', 'name': 'Optional Name'}, ...]
    """
    if not to:
        raise ValueError("Recipient list ('to') cannot be empty.")

    if isinstance(to, str):
        return [{'email': to.strip()}]

    recipients: List[Dict[str, str]] = []
    if isinstance(to, list):
        for item in to:
            if isinstance(item, str):
                cleaned = item.strip()
                if cleaned:
                    recipients.append({'email': cleaned})
            elif isinstance(item, dict) and 'email' in item:
                rec_dict: Dict[str, str] = {'email': item['email'].strip()}
                if 'name' in item and item['name']:
                    rec_dict['name'] = str(item['name']).strip()
                recipients.append(rec_dict)

    if not recipients:
        raise ValueError("No valid recipient email addresses found.")

    return recipients


class BrevoEmailService:
    """
    Centralized service for sending transactional emails via Brevo REST API.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        sender_email: Optional[str] = None,
        sender_name: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ):
        if api_key is not None:
            self.api_key = api_key.strip()
        else:
            self.api_key = (
                getattr(settings, 'BREVO_API_KEY', None)
                or os.environ.get('BREVO_API_KEY', '')
            ).strip()

        if sender_email is not None:
            self.sender_email = sender_email.strip()
        else:
            self.sender_email = (
                getattr(settings, 'BREVO_SENDER_EMAIL', None)
                or os.environ.get('BREVO_SENDER_EMAIL', '')
            ).strip()

        if sender_name is not None:
            self.sender_name = sender_name.strip()
        else:
            self.sender_name = (
                getattr(settings, 'BREVO_SENDER_NAME', None)
                or os.environ.get('BREVO_SENDER_NAME', 'AquaShield')
            ).strip()

        if api_url is not None:
            self.api_url = api_url.strip()
        else:
            self.api_url = (
                getattr(settings, 'BREVO_API_URL', None)
                or os.environ.get('BREVO_API_URL', DEFAULT_BREVO_API_URL)
            ).strip()

        self.timeout = timeout

    def send(
        self,
        to: Union[str, List[Union[str, Dict[str, str]]]],
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        sender: Optional[Dict[str, str]] = None,
        fail_silently: bool = False,
    ) -> Dict[str, Any]:
        """
        Sends an email using the Brevo transactional email endpoint.

        Returns:
            dict: {'success': bool, 'message_id': str, 'status_code': int}
        """
        try:
            # 1. Validate credentials
            if not self.api_key:
                raise EmailConfigurationError("BREVO_API_KEY is not set.")

            if not self.sender_email:
                raise EmailConfigurationError("BREVO_SENDER_EMAIL is not set.")

            if not subject or not subject.strip():
                raise ValueError("Email subject cannot be empty.")

            if not html_content and not text_content:
                raise ValueError("Email must contain either html_content or text_content.")

            # 2. Normalize sender and recipients
            recipients = _normalize_recipients(to)

            sender_payload: Dict[str, str] = {
                'email': self.sender_email,
                'name': self.sender_name or 'AquaShield',
            }
            if sender and isinstance(sender, dict) and sender.get('email'):
                sender_payload['email'] = sender['email'].strip()
                if sender.get('name'):
                    sender_payload['name'] = sender['name'].strip()

            # 3. Construct JSON payload
            payload: Dict[str, Any] = {
                'sender': sender_payload,
                'to': recipients,
                'subject': subject.strip(),
            }
            if html_content:
                payload['htmlContent'] = html_content
            if text_content:
                payload['textContent'] = text_content

            headers = {
                'api-key': self.api_key,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }

            masked_to = ", ".join(_mask_email(r['email']) for r in recipients)
            logger.info(f"Dispatching transactional email via Brevo API to {masked_to} (subject: '{subject[:40]}...')")

            # 4. Dispatch HTTPS request to Brevo API
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=self.timeout,
            )

            # 5. Parse Brevo response
            if response.status_code in (200, 201, 202):
                data = response.json() if response.content else {}
                message_id = data.get('messageId', 'ok')
                logger.info(f"Email successfully delivered via Brevo API (messageId={message_id})")
                return {
                    'success': True,
                    'message_id': message_id,
                    'status_code': response.status_code,
                }
            else:
                try:
                    err_json = response.json()
                    err_code = err_json.get('code', f"HTTP_{response.status_code}")
                    err_msg = err_json.get('message', response.text)
                except Exception:
                    err_code = f"HTTP_{response.status_code}"
                    err_msg = response.text or 'No response body'

                log_error = f"Brevo API request failed ({response.status_code} - {err_code}): {err_msg}"
                logger.error(log_error)

                if fail_silently:
                    return {
                        'success': False,
                        'error': log_error,
                        'status_code': response.status_code,
                    }
                raise EmailDeliveryError(log_error)

        except requests.exceptions.Timeout as exc:
            err_msg = f"Brevo API connection timed out after {self.timeout}s"
            logger.error(err_msg)
            if fail_silently:
                return {'success': False, 'error': err_msg, 'status_code': 504}
            raise EmailTimeoutError(err_msg) from exc

        except requests.exceptions.RequestException as exc:
            err_msg = f"Brevo API network error: {exc.__class__.__name__}"
            logger.error(f"Brevo API network exception: {exc}")
            if fail_silently:
                return {'success': False, 'error': err_msg, 'status_code': 502}
            raise EmailDeliveryError(err_msg) from exc

        except EmailServiceError:
            if fail_silently:
                return {'success': False, 'error': 'Email configuration error'}
            raise

        except Exception as exc:
            logger.exception(f"Unexpected error in BrevoEmailService: {exc}")
            if fail_silently:
                return {'success': False, 'error': str(exc)}
            raise EmailDeliveryError(f"Unexpected error sending email: {exc}") from exc


def send_transactional_email(
    to: Union[str, List[Union[str, Dict[str, str]]]],
    subject: str,
    html_content: Optional[str] = None,
    text_content: Optional[str] = None,
    sender: Optional[Dict[str, str]] = None,
    fail_silently: bool = False,
    timeout: float = DEFAULT_TIMEOUT_SECONDS,
) -> Dict[str, Any]:
    """
    Convenience function to send a transactional email using the default Brevo service.

    Args:
        to: Single email string, list of email strings, or list of dicts [{'email': '...', 'name': '...'}]
        subject: Subject line
        html_content: Optional HTML email body
        text_content: Optional plain-text email body
        sender: Optional custom sender dict {'email': '...', 'name': '...'}
        fail_silently: If True, errors are logged and a failure dict is returned instead of raising
        timeout: Request timeout in seconds (default 10.0s)

    Returns:
        dict: {'success': bool, 'message_id': str, 'status_code': int}
    """
    service = BrevoEmailService(timeout=timeout)
    return service.send(
        to=to,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        sender=sender,
        fail_silently=fail_silently,
    )
