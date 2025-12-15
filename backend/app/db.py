"""
Database setup and connection management.
Supports both SQLite (dev) and PostgreSQL (production).
"""
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager
from app.core.config import settings
import os
from datetime import datetime

# Build database URL
if settings.DATABASE_URL.startswith("postgresql") or settings.DATABASE_URL.startswith("postgres"):
    # PostgreSQL connection
    if not settings.DATABASE_URL or settings.DATABASE_URL == "sqlite:///./prolight.db":
        # Build from individual components if DATABASE_URL not set
        DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    else:
        DATABASE_URL = settings.DATABASE_URL
    # Use NullPool for async compatibility (or use asyncpg)
    engine = create_engine(DATABASE_URL, poolclass=NullPool, echo=settings.DEBUG)
else:
    # SQLite for development
    DATABASE_URL = settings.DATABASE_URL or "sqlite:///./prolight.db"
    engine = create_engine(DATABASE_URL.replace("+aiosqlite", ""), connect_args={"check_same_thread": False}, echo=settings.DEBUG)

# Create metadata
metadata = MetaData()

# Legacy tables (for backwards compatibility)
contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(200)),
    Column("email", String(200)),
    Column("message", Text),
    Column("created_at", DateTime, default=datetime.utcnow)
)

applications = Table(
    "applications",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("job_id", String(100)),
    Column("name", String(200)),
    Column("email", String(200)),
    Column("resume_url", String(500)),
    Column("message", Text),
    Column("created_at", DateTime, default=datetime.utcnow)
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Import all models to register them with Base
from app.models import poses, composition_model, billing, user, generation, marketplace

# Create all tables (including those defined with declarative_base)
Base.metadata.create_all(bind=engine)
metadata.create_all(engine)


@contextmanager
def get_db():
    """Context manager for database sessions."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_session() -> Session:
    """Get a database session."""
    return SessionLocal()
