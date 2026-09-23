from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import require_verified
from app.crypto import encrypt_token, decrypt_token
from app.canvas_api import validate_canvas_url, validate_token, CanvasError

router = APIRouter(prefix="/token", tags=["canvas-token"])


class TokenRequest(BaseModel):
    canvas_base_url: str
    api_token: str


@router.get("")
def get_token_status(
    user: models.User = Depends(require_verified),
):
    """Returns token status — never returns the decrypted token itself."""
    if not user.canvas_token:
        return {"connected": False}
    return {
        "connected": True,
        "canvas_base_url": user.canvas_token.canvas_base_url,
        "status": user.canvas_token.status,
    }


@router.put("")
def save_token(
    body: TokenRequest,
    user: models.User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    # Validate and sanitise URL (SSRF protection)
    try:
        safe_url = validate_canvas_url(body.canvas_base_url)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Validate token against Canvas before storing
    try:
        validate_token(safe_url, body.api_token)
    except CanvasError as e:
        if e.status_code == 401:
            raise HTTPException(status_code=422, detail="Canvas token is invalid or expired")
        raise HTTPException(status_code=422, detail=f"Could not connect to Canvas: {e}")

    encrypted = encrypt_token(body.api_token)

    if user.canvas_token:
        user.canvas_token.canvas_base_url = safe_url
        user.canvas_token.encrypted_token = encrypted
        user.canvas_token.status = models.TokenStatus.active
    else:
        ct = models.CanvasToken(
            user_id=user.id,
            canvas_base_url=safe_url,
            encrypted_token=encrypted,
        )
        db.add(ct)

    db.commit()
    return {"message": "Canvas token saved and verified."}


@router.delete("")
def delete_token(
    user: models.User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    if user.canvas_token:
        db.delete(user.canvas_token)
        db.commit()
    return {"message": "Canvas token removed. Notifications paused."}
