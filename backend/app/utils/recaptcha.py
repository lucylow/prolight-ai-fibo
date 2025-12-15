"""
reCAPTCHA verification utility.
"""
import os
import requests
from typing import Optional


RECAPTCHA_SECRET = os.getenv("RECAPTCHA_SECRET")


def verify_recaptcha(token: str, remote_ip: Optional[str] = None) -> bool:
    """
    Verify reCAPTCHA token with Google's API.
    
    Args:
        token: The reCAPTCHA token from the client
        remote_ip: Optional client IP address
        
    Returns:
        True if verification succeeds, False otherwise
    """
    if not RECAPTCHA_SECRET or not token:
        return False
    
    url = "https://www.google.com/recaptcha/api/siteverify"
    data = {
        "secret": RECAPTCHA_SECRET,
        "response": token
    }
    if remote_ip:
        data["remoteip"] = remote_ip
    
    try:
        r = requests.post(url, data=data, timeout=5)
        resp = r.json()
        return resp.get("success", False)
    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        return False

