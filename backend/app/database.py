from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import get_settings


def get_engine():
    settings = get_settings()
    url = settings.database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return create_engine(url, pool_pre_ping=True)


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
