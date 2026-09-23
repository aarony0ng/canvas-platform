import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime,
    ForeignKey, Enum, LargeBinary, ARRAY, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum as pyenum

from app.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class TokenStatus(str, pyenum.Enum):
    active = "active"
    expired = "expired"
    invalid = "invalid"


class User(Base):
    __tablename__ = "users"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email              = Column(String, unique=True, nullable=False, index=True)
    password_hash      = Column(String, nullable=True)          # null for OAuth users
    email_verified     = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, nullable=True, index=True)
    reset_token        = Column(String, nullable=True, index=True)
    reset_token_exp    = Column(DateTime(timezone=True), nullable=True)
    oauth_provider     = Column(String, nullable=True)          # "google"
    oauth_sub          = Column(String, nullable=True)
    created_at         = Column(DateTime(timezone=True), default=now_utc)

    canvas_token       = relationship("CanvasToken", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences        = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    course_prefs       = relationship("CoursePreference", back_populates="user", cascade="all, delete-orphan")
    notification_logs  = relationship("NotificationLog", back_populates="user", cascade="all, delete-orphan")


class CanvasToken(Base):
    __tablename__ = "canvas_tokens"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    canvas_base_url = Column(String, nullable=False)
    encrypted_token = Column(LargeBinary, nullable=False)       # AES-256-GCM ciphertext
    status          = Column(Enum(TokenStatus), default=TokenStatus.active, nullable=False)
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    user = relationship("User", back_populates="canvas_token")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    email_enabled    = Column(Boolean, default=True, nullable=False)
    push_enabled     = Column(Boolean, default=False, nullable=False)
    lead_hours       = Column(ARRAY(Integer), default=lambda: [24], nullable=False)  # e.g. [24, 168]
    digest_mode      = Column(Boolean, default=False, nullable=False)
    run_hour         = Column(Integer, default=7, nullable=False)  # hour of day (local time)
    timezone         = Column(String, default="America/New_York", nullable=False)
    quiet_start      = Column(Integer, nullable=True)  # 0-23
    quiet_end        = Column(Integer, nullable=True)
    created_at       = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="preferences")


class CoursePreference(Base):
    __tablename__ = "course_preferences"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    canvas_course_id = Column(String, nullable=False)
    muted            = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="course_prefs")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id = Column(String, nullable=False)
    course_id     = Column(String, nullable=False)
    lead_hours    = Column(Integer, nullable=False)
    notified_at   = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="notification_logs")
