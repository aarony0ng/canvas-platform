"""
Celery tasks — scheduled Canvas checks and notification delivery.
"""
from celery import Celery
from celery.schedules import crontab
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app import models
from app.canvas_api import get_all_upcoming, assignments_due_within, CanvasError
from app.crypto import decrypt_token
from app import email_service

settings = get_settings()

celery_app = Celery(
    "canvas_checker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        # Fan-out task runs every 15 minutes to find users whose run_hour matches
        "dispatch-checks": {
            "task": "app.tasks.dispatch_checks",
            "schedule": crontab(minute="*/15"),
        },
    },
)


def _notification_key(user_id: str, assignment_id: str, lead_hours: int) -> str:
    return f"{user_id}:{assignment_id}:{lead_hours}"


def _already_notified(db: Session, user_id, assignment_id: str, lead_hours: int) -> bool:
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lead_hours + 1)
    return db.query(models.NotificationLog).filter(
        models.NotificationLog.user_id == user_id,
        models.NotificationLog.assignment_id == assignment_id,
        models.NotificationLog.lead_hours == lead_hours,
        models.NotificationLog.notified_at >= cutoff,
    ).first() is not None


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def check_user(self, user_id: str) -> dict:
    """
    Fetch upcoming assignments for one user and send notifications
    for any assignment that falls within their lead_hours window
    and hasn't been notified yet.
    """
    db: Session = SessionLocal()
    try:
        user = db.get(models.User, user_id)
        if not user or not user.canvas_token or user.canvas_token.status != models.TokenStatus.active:
            return {"skipped": True, "reason": "no active token"}

        prefs = user.preferences
        if not prefs:
            return {"skipped": True, "reason": "no preferences"}

        muted_courses = {
            cp.canvas_course_id for cp in user.course_prefs if cp.muted
        }

        token_plain = decrypt_token(user.canvas_token.encrypted_token)
        base_url    = user.canvas_token.canvas_base_url

        try:
            all_upcoming = get_all_upcoming(base_url, token_plain)
        except CanvasError as e:
            if e.status_code == 401:
                user.canvas_token.status = models.TokenStatus.expired
                db.commit()
                email_service.send_token_expired_email(user.email, settings.app_url)
            else:
                raise self.retry(exc=e)
            return {"error": "token_expired"}

        notified = []
        for assignment in all_upcoming:
            if assignment["course_id"] in muted_courses:
                continue
            for lead in prefs.lead_hours:
                from datetime import datetime, timezone, timedelta
                due = datetime.fromisoformat(assignment["due_at"])
                window_end = datetime.now(timezone.utc) + timedelta(hours=lead)
                if due > window_end:
                    continue
                if _already_notified(db, user.id, assignment["id"], lead):
                    continue

                if prefs.email_enabled:
                    email_service.send_assignment_notification(
                        user.email, [assignment], lead
                    )

                log = models.NotificationLog(
                    user_id=user.id,
                    assignment_id=assignment["id"],
                    course_id=assignment["course_id"],
                    lead_hours=lead,
                )
                db.add(log)
                notified.append(assignment["id"])

        db.commit()
        return {"notified": notified}

    finally:
        db.close()


@celery_app.task
def dispatch_checks() -> dict:
    """
    Every 15 minutes: find users whose run_hour (in their local timezone)
    matches the current UTC hour window and enqueue check_user for each.
    """
    from datetime import datetime, timezone
    import zoneinfo

    now_utc = datetime.now(timezone.utc)
    dispatched = []

    db: Session = SessionLocal()
    try:
        users_with_prefs = (
            db.query(models.User)
            .join(models.NotificationPreference)
            .join(models.CanvasToken)
            .filter(models.CanvasToken.status == models.TokenStatus.active)
            .all()
        )
        for user in users_with_prefs:
            prefs = user.preferences
            try:
                tz = zoneinfo.ZoneInfo(prefs.timezone)
                local_now = now_utc.astimezone(tz)
                if local_now.hour == prefs.run_hour and local_now.minute < 15:
                    check_user.delay(str(user.id))
                    dispatched.append(str(user.id))
            except Exception:
                continue
        return {"dispatched": len(dispatched)}
    finally:
        db.close()
