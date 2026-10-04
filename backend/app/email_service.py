"""
Transactional email via SendGrid REST API.
No SDK — keeps the dependency surface small.
"""
import json
import urllib.request
import urllib.error
from datetime import datetime

from app.config import get_settings


def _send(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    settings = get_settings()
    if not settings.sendgrid_api_key:
        print(f"[EMAIL] Would send to {to_email}: {subject}")
        return

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": settings.email_from, "name": settings.email_from_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text_body},
            {"type": "text/html",  "value": html_body},
        ],
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=data,
        headers={
            "Authorization": f"Bearer {settings.sendgrid_api_key}",
            "Content-Type":  "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status not in (200, 202):
                raise RuntimeError(f"SendGrid error {resp.status}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"SendGrid error {e.code}: {e.read().decode()}")


def send_verification_email(to_email: str, verify_url: str) -> None:
    subject = "Verify your Canvas Checker email"
    html = f"""
    <p>Hi,</p>
    <p>Click the link below to verify your email address and activate your Canvas Checker account:</p>
    <p><a href="{verify_url}">{verify_url}</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you did not create this account, you can ignore this email.</p>
    """
    text = f"Verify your email:\n{verify_url}\n\nThis link expires in 24 hours."
    _send(to_email, subject, html, text)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Reset your Canvas Checker password"
    html = f"""
    <p>You requested a password reset. Click the link below:</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    """
    text = f"Reset your password:\n{reset_url}\n\nExpires in 1 hour."
    _send(to_email, subject, html, text)


def send_assignment_notification(
    to_email: str,
    assignments: list,
    lead_hours: int | None,
) -> None:
    if not assignments:
        return

    if lead_hours is None:
        label = "upcoming"
    elif lead_hours % 168 == 0:
        w = lead_hours // 168
        label = f"{w} week{'s' if w != 1 else ''}"
    elif lead_hours % 24 == 0:
        d = lead_hours // 24
        label = f"{d} day{'s' if d != 1 else ''}"
    else:
        label = f"{lead_hours} hour{'s' if lead_hours != 1 else ''}"

    rows = ""
    for a in assignments:
        due = datetime.fromisoformat(a["due_at"]).strftime("%a %b %-d @ %-I:%M %p")
        pts = f" ({a['points']:.0f} pts)" if a.get("points") else ""
        link = f'<a href="{a["url"]}">{a["name"]}</a>' if a.get("url") else a["name"]
        rows += f"<tr><td>{link}{pts}</td><td>{a['course_name']}</td><td>{due}</td></tr>"

    count = len(assignments)
    if lead_hours is None:
        subject = f"Your upcoming assignments — Canvas Checker"
        heading = "Canvas Checker — Upcoming Assignments"
    else:
        subject = f"{count} assignment{'s' if count != 1 else ''} due in {label}"
        heading = f"Canvas Checker — Due in {label}"

    html = f"""
    <h2 style="font-family:sans-serif">{heading}</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:8px 12px;text-align:left">Assignment</th>
          <th style="padding:8px 12px;text-align:left">Course</th>
          <th style="padding:8px 12px;text-align:left">Due</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    """

    lines = [f"  • {a['name']} ({a['course_name']}) — {datetime.fromisoformat(a['due_at']).strftime('%a %b %-d @ %-I:%M %p')}" for a in assignments]
    text = f"Assignments due in {label}:\n\n" + "\n".join(lines)

    _send(to_email, subject, html, text)


def send_token_expired_email(to_email: str, app_url: str) -> None:
    subject = "Your Canvas token has expired — action required"
    settings_url = f"{app_url}/settings"
    html = f"""
    <p>Your Canvas API token has expired, so Canvas Checker has paused your notifications.</p>
    <p>To resume, generate a new token in Canvas (Account → Settings → Approved Integrations → New Access Token)
    and update it in your <a href="{settings_url}">Canvas Checker settings</a>.</p>
    """
    text = f"Your Canvas API token expired. Update it at: {settings_url}"
    _send(to_email, subject, html, text)
