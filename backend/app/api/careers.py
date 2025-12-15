"""
Careers endpoints: job list and application submission.
Proxies to Greenhouse if configured, otherwise uses local fallback.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..db import SessionLocal, applications
from ..utils.recaptcha import verify_recaptcha
from .contact import send_email as send_email_helper
import os
import requests

router = APIRouter()

GREENHOUSE_API_KEY = os.getenv("GREENHOUSE_API_KEY")
GREENHOUSE_ACCOUNT_ID = os.getenv("GREENHOUSE_ACCOUNT_ID")
HR_EMAIL = os.getenv("HR_EMAIL", "hello@prolight.ai")

# Local fallback job list (if Greenhouse not configured)
LOCAL_JOBS = [
    {
        "id": "frontend-engineer",
        "title": "Frontend Engineer (React)",
        "location": "Remote",
        "description": "Build ProLight UI"
    },
    {
        "id": "ml-engineer",
        "title": "Applied ML Engineer",
        "location": "Remote",
        "description": "Work on FIBO tailored models"
    }
]


class JobApplyIn(BaseModel):
    jobId: str
    name: str
    email: EmailStr
    resumeUrl: Optional[str] = None
    message: Optional[str] = None
    recaptchaToken: Optional[str] = None


@router.get("/careers/jobs")
async def list_jobs():
    """Get list of open jobs from Greenhouse or local fallback."""
    if GREENHOUSE_API_KEY and GREENHOUSE_ACCOUNT_ID:
        # Use Greenhouse Jobs API
        try:
            url = f"https://boards-api.greenhouse.io/v1/boards/{GREENHOUSE_ACCOUNT_ID}/jobs"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            # Transform Greenhouse response to our format
            jobs = resp.json().get("jobs", [])
            return [
                {
                    "id": str(job.get("id", "")),
                    "title": job.get("title", ""),
                    "location": job.get("location", {}).get("name", "Remote"),
                    "description": job.get("content", "")
                }
                for job in jobs
            ]
        except Exception as e:
            print(f"Greenhouse fetch error: {e}")
    
    # Fallback to local jobs
    return LOCAL_JOBS


@router.post("/careers/apply")
async def apply_job(payload: JobApplyIn, request: Request):
    """Handle job application submission."""
    # Verify reCAPTCHA if token provided
    if payload.recaptchaToken:
        remote_ip = request.client.host if request.client else None
        if not verify_recaptcha(payload.recaptchaToken, remote_ip):
            raise HTTPException(status_code=400, detail="reCAPTCHA verification failed")

    # Store locally
    db = SessionLocal()
    try:
        query = applications.insert().values(
            job_id=payload.jobId,
            name=payload.name,
            email=payload.email,
            resume_url=payload.resumeUrl or "",
            message=payload.message or ""
        )
        db.execute(query)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Database error: {e}")
    finally:
        db.close()

    # Try Greenhouse application endpoint if configured
    if GREENHOUSE_API_KEY and GREENHOUSE_ACCOUNT_ID:
        try:
            # Note: Greenhouse application submission typically requires job-specific endpoints
            # This is a simplified example - adjust based on your Greenhouse setup
            gh_url = f"https://api.greenhouse.io/v1/boards/{GREENHOUSE_ACCOUNT_ID}/jobs/{payload.jobId}/applications"
            data = {
                "first_name": payload.name.split(" ")[0],
                "last_name": " ".join(payload.name.split(" ")[1:]) or "-",
                "email": payload.email,
                "resume": payload.resumeUrl or "",
                "cover_letter": payload.message or ""
            }
            # Greenhouse uses API key in Authorization header
            headers = {
                "Authorization": f"Basic {GREENHOUSE_API_KEY}",
                "Content-Type": "application/json"
            }
            resp = requests.post(gh_url, json=data, headers=headers, timeout=10)
            resp.raise_for_status()
        except Exception as e:
            print(f"Greenhouse submit failed: {e}")
            # Fallback to email
            try:
                body = f"""Application for {payload.jobId}

Name: {payload.name}
Email: {payload.email}
Resume: {payload.resumeUrl or 'Not provided'}

Message:
{payload.message or 'No message provided'}
"""
                await send_email_helper(
                    subject=f"Job application: {payload.jobId}",
                    body=body,
                    to_email=HR_EMAIL
                )
            except Exception as e2:
                print(f"Email fallback failed: {e2}")
    else:
        # No GH configured - email HR
        try:
            body = f"""Application for {payload.jobId}

Name: {payload.name}
Email: {payload.email}
Resume: {payload.resumeUrl or 'Not provided'}

Message:
{payload.message or 'No message provided'}
"""
            await send_email_helper(
                subject=f"Job application: {payload.jobId}",
                body=body,
                to_email=HR_EMAIL
            )
        except Exception as e:
            print(f"Email send fail: {e}")

    return {"status": "ok", "message": "Application submitted successfully"}

