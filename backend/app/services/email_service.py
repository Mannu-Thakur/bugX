"""
Async email service using Python's stdlib smtplib in a thread pool.
No extra dependencies — works with Gmail (App Password), Zoho, Outlook SMTP,
SendGrid SMTP relay, AWS SES SMTP, or any standard SMTP server.

Configuration (all from environment variables via Settings):
    SMTP_HOST        — e.g. smtp.gmail.com
    SMTP_PORT        — 587 (STARTTLS) or 465 (SSL)
    SMTP_USER        — sender username / address
    SMTP_PASSWORD    — app password or SMTP auth token
    SMTP_FROM        — "Friendly Name <sender@example.com>"  (optional, defaults to SMTP_USER)
    SMTP_TLS         — true  → STARTTLS on port 587 (recommended)
                       false → plain or SSL (set SMTP_SSL=true for port 465)
    SMTP_SSL         — true  → direct SSL connection (port 465)
"""

import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)


async def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    plain_body: Optional[str] = None,
) -> bool:
    """
    Send an email asynchronously (runs blocking SMTP call in a thread pool).

    Returns True if sent successfully, False otherwise.
    Logs errors but never raises — callers must check the return value.
    """
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # SMTP is not configured — log and return False so callers can fallback gracefully
        logger.warning(
            "[Email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env. "
            "Email to %s was NOT sent (subject: %s).",
            to, subject,
        )
        return False

    sender = settings.SMTP_FROM or settings.SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to

    if plain_body:
        msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    def _send_blocking() -> None:
        ctx = ssl.create_default_context()
        if settings.SMTP_SSL:
            # Direct SSL (port 465)
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=15) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(sender, to, msg.as_string())
        else:
            # STARTTLS (port 587 — recommended)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.ehlo()
                if settings.SMTP_TLS:
                    server.starttls(context=ctx)
                    server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(sender, to, msg.as_string())

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_blocking)
        logger.info("[Email] Sent '%s' → %s", subject, to)
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "[Email] SMTP authentication failed. Check SMTP_USER / SMTP_PASSWORD in .env."
        )
        return False
    except smtplib.SMTPException as exc:
        logger.error("[Email] SMTP error sending to %s: %s", to, exc)
        return False
    except Exception as exc:
        logger.error("[Email] Unexpected error sending to %s: %s", to, exc)
        return False


# ─── Pre-built Email Templates ────────────────────────────────────────────────

def _otp_html(otp: str, app_name: str = "bugX") -> str:
    """Returns a clean HTML email body for an OTP verification code."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #334155;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">
                bug<span style="color:#3b82f6;">X</span>
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:14px;color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:1px;">
                Password Reset
              </p>
              <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#f1f5f9;">
                Your verification code
              </h2>
              <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
                Use the code below to reset your {app_name} password.
                This code expires in <strong style="color:#f1f5f9;">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#0f172a;border:1px solid #3b82f6;border-radius:12px;
                          padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:36px;font-weight:900;letter-spacing:12px;
                             color:#3b82f6;font-family:monospace;">{otp}</span>
              </div>

              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #334155;">
              <p style="margin:0;font-size:11px;color:#475569;">
                &copy; {app_name} — This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _otp_plain(otp: str, app_name: str = "bugX") -> str:
    return (
        f"{app_name} — Password Reset\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request a password reset, you can ignore this email."
    )


async def send_otp_email(to: str, otp: str) -> bool:
    """Send a password-reset OTP email to the given address."""
    return await send_email(
        to=to,
        subject="bugX — Your password reset code",
        html_body=_otp_html(otp),
        plain_body=_otp_plain(otp),
    )
