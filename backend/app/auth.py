"""
Auth helpers: password hashing, session signing, token generation.
Sessions are stored as signed cookies (itsdangerous) — not JWT in localStorage.
"""
import secrets
from datetime import datetime, timezone, timedelta

from passlib.context import CryptContext
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from fastapi import Cookie, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SESSION_COOKIE = "session"
SESSION_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


# ── Passwords ─────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Sessions ──────────────────────────────────────────────────────────────────

def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_settings().session_secret_key)


def create_session_token(user_id: str) -> str:
    return _serializer().dumps(user_id, salt="session")


def decode_session_token(token: str, max_age: int = SESSION_MAX_AGE) -> str:
    try:
        return _serializer().loads(token, salt="session", max_age=max_age)
    except SignatureExpired:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    except BadSignature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")


# ── Verification / reset tokens ───────────────────────────────────────────────

def generate_token() -> str:
    return secrets.token_urlsafe(32)


# ── Current user dependency ───────────────────────────────────────────────────

def get_current_user(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> models.User:
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_session_token(session)
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_verified(user: models.User = Depends(get_current_user)) -> models.User:
    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
    return user
