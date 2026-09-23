from fastapi import APIRouter, Depends, HTTPException

from app import models
from app.auth import require_verified
from app.canvas_api import get_all_upcoming, CanvasError
from app.crypto import decrypt_token

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("/upcoming")
def upcoming_assignments(user: models.User = Depends(require_verified)):
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
