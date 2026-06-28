"""Platform mailer for system email (verification, password reset, invites…).

A single entry point — :func:`send_system_email` — abstracts the delivery
provider so callers never touch HTTP/SMTP details:

  1. **Resend HTTP API** (preferred) when ``RESEND_API_KEY`` is set.
  2. **stdlib SMTP** fallback when ``SMTP_HOST`` is set instead.
  3. **No provider** → log a warning and return ``False``.

The function is intentionally total: it **never raises**. Transport, auth or
configuration problems are caught, logged, and surfaced as a ``False`` return so
that transactional flows (signup, etc.) degrade gracefully instead of 500-ing.
Callers decide whether a failed send is fatal for their flow.

``EMAIL_FROM`` must be a verified sender for the configured provider, e.g.
``"Vela <no-reply@vela.app>"``.
"""
from __future__ import annotations

import logging
import re
import smtplib
from email.message import EmailMessage
from email.utils import parseaddr

import requests

from core.config import get_settings

logger = logging.getLogger("vela.mailer")

# Resend transactional-email endpoint.
_RESEND_ENDPOINT = "https://api.resend.com/emails"
# Network timeout for the Resend call (connect + read). Keep tight: email is sent
# inline on request paths (e.g. register) and must not stall the response.
_HTTP_TIMEOUT_S = 10.0
_SMTP_TIMEOUT_S = 15.0

# Very small tag-stripper to derive a plaintext alternative from the HTML body.
_TAG_RE = re.compile(r"<[^>]+>")


def _s():
    return get_settings()


def is_configured() -> bool:
    """True when at least one delivery provider (Resend or SMTP) is configured."""
    s = _s()
    return bool(s.RESEND_API_KEY or s.SMTP_HOST)


def _html_to_text(html: str) -> str:
    """Crude HTML→text fallback for the multipart/alternative plaintext part."""
    text = re.sub(r"(?i)<br\s*/?>", "\n", html)
    text = re.sub(r"(?i)</p\s*>", "\n\n", text)
    text = _TAG_RE.sub("", text)
    return text.strip()


def send_system_email(to: str, subject: str, html: str) -> bool:
    """Send a system email. Returns ``True`` on a successful hand-off to a
    provider, ``False`` otherwise. Never raises.

    Provider precedence: Resend (``RESEND_API_KEY``) → SMTP (``SMTP_HOST``) →
    none (logs and returns ``False``).
    """
    s = _s()
    sender = (s.EMAIL_FROM or "").strip()
    to = (to or "").strip()

    if not to:
        logger.warning("send_system_email: empty recipient; skipping")
        return False
    if not sender:
        logger.warning(
            "send_system_email: EMAIL_FROM is unset; cannot send '%s' to %s", subject, to
        )
        return False

    if s.RESEND_API_KEY:
        return _send_via_resend(sender, to, subject, html)
    if s.SMTP_HOST:
        return _send_via_smtp(sender, to, subject, html)

    logger.warning(
        "send_system_email: no mail provider configured (set RESEND_API_KEY or "
        "SMTP_HOST); dropping '%s' to %s",
        subject,
        to,
    )
    return False


def _send_via_resend(sender: str, to: str, subject: str, html: str) -> bool:
    """Deliver through the Resend HTTP API. Returns False on any failure."""
    try:
        resp = requests.post(
            _RESEND_ENDPOINT,
            headers={
                "Authorization": f"Bearer {_s().RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": sender,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": _html_to_text(html),
            },
            timeout=_HTTP_TIMEOUT_S,
        )
    except requests.RequestException as e:
        logger.warning("Resend send failed (network): %s", e)
        return False

    if resp.status_code >= 400:
        # Body often carries a useful Resend error code/message; log it (truncated).
        logger.warning(
            "Resend send failed (HTTP %s): %s", resp.status_code, (resp.text or "")[:500]
        )
        return False

    logger.info("System email sent via Resend to %s (%s)", to, subject)
    return True


def _send_via_smtp(sender: str, to: str, subject: str, html: str) -> bool:
    """Deliver through stdlib SMTP. Uses implicit SSL on port 465, otherwise
    STARTTLS. Returns False on any failure."""
    s = _s()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(_html_to_text(html))
    msg.add_alternative(html, subtype="html")

    try:
        if int(s.SMTP_PORT) == 465:
            server = smtplib.SMTP_SSL(s.SMTP_HOST, s.SMTP_PORT, timeout=_SMTP_TIMEOUT_S)
        else:
            server = smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=_SMTP_TIMEOUT_S)
        try:
            if int(s.SMTP_PORT) != 465:
                server.starttls()
            if s.SMTP_USER:
                server.login(s.SMTP_USER, s.SMTP_PASSWORD)
            # Use the bare address for the SMTP envelope sender.
            envelope_from = parseaddr(sender)[1] or sender
            server.send_message(msg, from_addr=envelope_from, to_addrs=[to])
        finally:
            server.quit()
    except (smtplib.SMTPException, OSError) as e:
        logger.warning("SMTP send failed: %s", e)
        return False

    logger.info("System email sent via SMTP to %s (%s)", to, subject)
    return True
