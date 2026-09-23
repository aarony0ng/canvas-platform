from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app import models
from app.auth import require_verified

router = APIRouter(prefix="/preferences", tags=["preferences"])


class PreferencesUpdate(BaseModel):
    email_enabled:  Optional[bool]    = None
    push_enabled:   Optional[bool]    = None
    lead_hours:     Optional[list[int]] = None
    digest_mode:    Optional[bool]    = None
    run_hour:       Optional[int]     = None
    timezone:       Optional[str]     = None
    quiet_start:    Optional[int]     = None
    quiet_end:      Optional[int]     = None


class CourseToggle(BaseModel):
    canvas_course_id: str
    muted: bool


@router.get("")
def get_preferences(user: models.User = Depends(require_verified)):
    p = user.preferences
    return {
        "email_enabled": p.email_enabled,
        "push_enabled":  p.push_enabled,
        "lead_hours":    p.lead_hours,
        "digest_mode":   p.digest_mode,
        "run_hour":      p.run_hour,
        "timezone":      p.timezone,
        "quiet_start":   p.quiet_start,
        "quiet_end":     p.quiet_end,
        "muted_courses": [cp.canvas_course_id for cp in user.course_prefs if cp.muted],
    }


@router.patch("")
def update_preferences(
    body: PreferencesUpdate,
    user: models.User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    p = user.preferences
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    return {"message": "Preferences updated."}


@router.post("/courses/toggle")
def toggle_course(
    body: CourseToggle,
    user: models.User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    existing = next(
        (cp for cp in user.course_prefs if cp.canvas_course_id == body.canvas_course_id),
        None,
    )
    if existing:
        existing.muted = body.muted
    else:
        db.add(models.CoursePreference(
            user_id=user.id,
            canvas_course_id=body.canvas_course_id,
            muted=body.muted,
        ))
    db.commit()
    return {"message": "Course preference updated."}
