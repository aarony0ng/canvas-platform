from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import (
    hash_password, verify_password,
    create_session_token, get_current_user,
    generate_token, SESSION_COOKIE, SESSION_MAX_AGE,
)
from app.email_service import send_verification_email, send_password_reset_email
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirmRequest(BaseModel):
    token: str
    password: str


def _set_session_cookie(response: Response, user_id: str) -> None:
    settings = get_settings()
    token = create_session_token(str(user_id))
    response.set_cookie(
        SESSION_COOKIE, token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=settings.is_production,
        samesite="none" if settings.is_production else "lax",
    )


@router.post("/signup", status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    verify_token = generate_token()
    user = models.User(
        email=body.email,
        password_hash=hash_password(body.password),
        verification_token=verify_token,
    )
    db.add(user)
    db.flush()

    # Default notification preferences
    prefs = models.NotificationPreference(user_id=user.id)
    db.add(prefs)
    db.commit()

    settings = get_settings()
    verify_url = f"{settings.app_url}/verify-email?token={verify_token}"
    try:
        send_verification_email(body.email, verify_url)
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send verification email: {e}")
    return {"message": "Account created. Check your email to verify."}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(verification_token=token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user.email_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified. You can now log in."}


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=body.email).first()
    # Constant-time comparison to prevent user enumeration
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")
    _set_session_cookie(response, str(user.id))
    return {"message": "Logged in"}


@router.post("/logout")
def logout(response: Response, user: models.User = Depends(get_current_user)):
    response.delete_cookie(SESSION_COOKIE)
    return {"message": "Logged out"}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return {
        "id":             str(user.id),
        "email":          user.email,
        "email_verified": user.email_verified,
        "has_token":      user.canvas_token is not None,
        "token_status":   user.canvas_token.status if user.canvas_token else None,
    }


@router.post("/forgot-password")
def forgot_password(body: ResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=body.email).first()
    # Always return 200 — don't reveal whether an account exists
    if user and user.password_hash:
        token = generate_token()
        user.reset_token = token
        user.reset_token_exp = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        settings = get_settings()
        reset_url = f"{settings.app_url}/reset-password?token={token}"
        send_password_reset_email(body.email, reset_url)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetConfirmRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(reset_token=body.token).first()
    if (
        not user
        or not user.reset_token_exp
        or user.reset_token_exp < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    user.password_hash = hash_password(body.password)
    user.reset_token = None
    user.reset_token_exp = None
    db.commit()
    return {"message": "Password updated. You can now log in."}


@router.delete("/account")
def delete_account(
    response: Response,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(user)
    db.commit()
    response.delete_cookie(SESSION_COOKIE)
    return {"message": "Account and all associated data deleted."}
