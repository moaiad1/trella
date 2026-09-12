import logging

import httpx

from app.config import settings

log = logging.getLogger(__name__)

_RESEND_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, text: str) -> bool:
    """Send a transactional email via Resend. No-ops (returns False) if RESEND_API_KEY isn't set."""
    if not settings.resend_api_key:
        return False
    try:
        res = httpx.post(
            _RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.resend_from_email,
                "to": [to],
                "subject": subject,
                "text": text,
            },
            timeout=10.0,
        )
        if res.status_code >= 400:
            log.error("Resend send failed (%s): %s", res.status_code, res.text)
            return False
        return True
    except httpx.HTTPError:
        log.exception("Resend send failed")
        return False
