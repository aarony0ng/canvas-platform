from fastapi import APIRouter, Depends, HTTPException

from app import models
from app.auth import require_verified
from app.canvas_api import get_all_upcoming, CanvasError
from app.crypto import decrypt_token
from app import email_service

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _fetch_upcoming(user: models.User) -> list:
    if not user.canvas_token or user.canvas_token.status != models.TokenStatus.active:
        raise HTTPException(status_code=400, detail="No active Canvas token. Connect your account in Settings.")
    muted = {cp.canvas_course_id for cp in user.course_prefs if cp.muted}
    try:
        token   = decrypt_token(user.canvas_token.encrypted_token)
        baseurl = user.canvas_token.canvas_base_url
        all_assignments = get_all_upcoming(baseurl, token)
    except CanvasError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=401, detail="Canvas token expired. Please update it in Settings.")
        raise HTTPException(status_code=502, detail=f"Canvas API error: {e}")
    return [a for a in all_assignments if a["course_id"] not in muted]


@router.get("/upcoming")
def upcoming_assignments(user: models.User = Depends(require_verified)):
    return _fetch_upcoming(user)


@router.post("/test-email")
def send_test_email(user: models.User = Depends(require_verified)):
    assignments = _fetch_upcoming(user)
    if not assignments:
        return {"message": "No upcoming assignments to send."}
    try:
        email_service.send_assignment_notification(user.email, assignments, lead_hours=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")
    return {"message": f"Sent {len(assignments)} assignment(s) to {user.email}."}
