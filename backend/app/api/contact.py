"""
Contact form endpoint.
Validates, stores, and emails HR.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from ..db import SessionLocal, contacts
from ..utils.recaptcha import verify_recaptcha
import os
import aiosmtplib
from email.message import EmailMessage
from typing import Optional

router = APIRouter()

HR_EMAIL = os.getenv("HR_EMAIL", "hello@prolight.ai")


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    message: str
    recaptchaToken: Optional[str] = None


async def send_email(subject: str, body: str, to_email: str):
    """Send email using SMTP."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not all([smtp_host, smtp_user, smtp_password]):
        print("SMTP not configured, skipping email send")
        return

    message = EmailMessage()
    message["From"] = smtp_user
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            start_tls=True
        )
    except Exception as e:
        print(f"Email send error: {e}")


@router.post("/contact")
async def create_contact(payload: ContactIn, request: Request):
    """Handle contact form submission."""
    # Verify reCAPTCHA if token provided
    if payload.recaptchaToken:
        remote_ip = request.client.host if request.client else None
        if not verify_recaptcha(payload.recaptchaToken, remote_ip):
            raise HTTPException(status_code=400, detail="reCAPTCHA verification failed")

    # Save to database
    db = SessionLocal()
    try:
        query = contacts.insert().values(
            name=payload.name,
            email=payload.email,
            message=payload.message
        )
        db.execute(query)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Database error: {e}")
    finally:
        db.close()

    # Send email to HR
    try:
        body = f"""Contact form submitted

Name: {payload.name}
Email: {payload.email}

Message:
{payload.message}
"""
        await send_email(
            subject="ProLight AI Contact Form",
            body=body,
            to_email=HR_EMAIL
        )
    except Exception as e:
        # Still return success but log
        print(f"Email error: {e}")

    return {"status": "ok", "message": "Contact form submitted successfully"}

