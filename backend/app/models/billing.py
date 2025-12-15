"""
SQLAlchemy models for billing: invoices, subscriptions, and usage records.
Note: User model is defined in app.models.user
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True)
    stripe_invoice_id = Column(String(255), unique=True, nullable=False)
    stripe_customer_id = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(String(64), nullable=False)
    currency = Column(String(8), nullable=False)
    amount_due = Column(Integer, nullable=False)   # cents
    amount_paid = Column(Integer, nullable=False)  # cents
    hosted_invoice_url = Column(String(1024), nullable=True)
    invoice_pdf = Column(String(1024), nullable=True)
    billing_reason = Column(String(128), nullable=True)

    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", back_populates="invoices")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    stripe_customer_id = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(String(64), nullable=False)
    price_id = Column(String(255), nullable=True)
    subscription_item_id = Column(String(255), nullable=True)  # store this for usage reporting
    interval = Column(String(32), nullable=True)

    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)

    cancel_at_period_end = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", back_populates="subscriptions")


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_subscription_item_id = Column(String(255), nullable=False)
    quantity = Column(Numeric, nullable=False)  # units (images, seconds, etc.)
    reported_at = Column(DateTime, server_default=func.now())
    stripe_report_id = Column(String(255), nullable=True)
    metadata = Column(Text, nullable=True)

    user = relationship("User", back_populates="usage_records")


