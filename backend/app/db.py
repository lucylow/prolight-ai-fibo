"""
Database setup and table definitions.
Simple async DB init and table creation using SQLAlchemy.
"""
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

# Database URL from environment or default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")

# Create engine
engine = create_engine(DATABASE_URL.replace("+aiosqlite", ""), connect_args={"check_same_thread": False})

# Create metadata
metadata = MetaData()

# Define tables
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

# Create tables
metadata.create_all(engine)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
