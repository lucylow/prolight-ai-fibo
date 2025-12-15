"""
Role-based access control middleware for FastAPI.
Provides dependency functions for role-based route protection.
Supports both mock mode (for development) and database-backed user lookup.
"""
from fastapi import Request, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.db import SessionLocal
from app.models.billing import User

logger = logging.getLogger(__name__)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Extract current user from Authorization header.
    Attempts to lookup user from database, falls back to mock implementation for development.
    In production, this should decode and validate JWT tokens.
    """
    # Mock implementation - replace with real JWT decoding in production
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    # Extract token
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    
    token = parts[1]
    
    # Try to find user by token (in production, decode JWT to get user_id/email)
    # For now, check for test tokens or try to decode JWT
    
    # Mock token validation for development - replace with real JWT validation
    # Map test tokens to emails and lookup in database
    email_map = {
        "testtoken_admin": "admin@example.com",
        "testtoken_user": "user@example.com",
        "testtoken_editor": "editor@example.com",
    }
    
    email = None
    if token in email_map:
        email = email_map[token]
    else:
        # In production: decode JWT and extract email/user_id from token
        # For now, if token doesn't match known test tokens, try to extract from token
        # This is a placeholder for JWT decoding
        pass
    
    # If we have an email, try to find user in database
    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            return user
        # If not found in DB, create mock user object for backward compatibility
        # In production, user should exist in DB
        mock_user = type('MockUser', (), {
            'id': email.split('@')[0],
            'email': email,
            'name': email.split('@')[0].capitalize(),
            'role': 'admin' if 'admin' in email else ('editor' if 'editor' in email else 'viewer'),
            'stripe_customer_id': None
        })()
        return mock_user
    
    # Fallback: return mock user for development
    if "testtoken_admin" in token:
        mock_user = type('MockUser', (), {
            'id': 'u-admin',
            'email': 'admin@example.com',
            'name': 'Admin',
            'role': 'admin',
            'stripe_customer_id': None
        })()
        return mock_user
    elif "testtoken_user" in token:
        mock_user = type('MockUser', (), {
            'id': 'u-user',
            'email': 'user@example.com',
            'name': 'User',
            'role': 'viewer',
            'stripe_customer_id': None
        })()
        return mock_user
    elif "testtoken_editor" in token:
        mock_user = type('MockUser', (), {
            'id': 'u-editor',
            'email': 'editor@example.com',
            'name': 'Editor',
            'role': 'editor',
            'stripe_customer_id': None
        })()
        return mock_user
    else:
        # In production, decode JWT and extract roles from token payload
        # For now, raise error for unknown tokens
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_role(min_role: str):
    """
    Dependency factory that creates a dependency requiring a minimum role level.
    Role hierarchy: viewer < editor < admin
    
    Usage:
        @router.get("/admin/summary", dependencies=[Depends(require_role("admin"))])
        async def admin_summary(user = Depends(get_current_user)):
            ...
    
    Args:
        min_role: Minimum required role ("viewer", "editor", or "admin")
    """
    role_order = {"viewer": 0, "editor": 1, "admin": 2}
    
    def dependency(user = Depends(get_current_user)):
        # Handle both dict (mock) and User object (database)
        if hasattr(user, 'role'):
            user_role = user.role
            user_email = getattr(user, 'email', 'unknown')
        elif isinstance(user, dict):
            user_role = user.get("role") or user.get("roles", ["viewer"])[0] if user.get("roles") else "viewer"
            user_email = user.get("email", "unknown")
        else:
            user_role = "viewer"
            user_email = "unknown"
        
        user_level = role_order.get(user_role, 0)
        required_level = role_order.get(min_role, 0)
        
        if user_level < required_level:
            logger.warning(f"Access denied for user {user_email}: required role '{min_role}', has role '{user_role}'")
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: '{min_role}' role required"
            )
        return user
    
    return dependency


def require_any_role(*roles: str):
    """
    Dependency factory that creates a dependency requiring any of the specified roles.
    
    Usage:
        @router.get("/edit", dependencies=[Depends(require_any_role("admin", "editor"))])
        async def edit_content(user = Depends(get_current_user)):
            ...
    
    Args:
        *roles: One or more allowed roles
    """
    def dependency(user = Depends(get_current_user)):
        # Handle both dict (mock) and User object (database)
        if hasattr(user, 'role'):
            user_role = user.role
            user_email = getattr(user, 'email', 'unknown')
        elif isinstance(user, dict):
            user_role = user.get("role") or (user.get("roles", [])[0] if user.get("roles") else "viewer")
            user_email = user.get("email", "unknown")
        else:
            user_role = "viewer"
            user_email = "unknown"
        
        if user_role not in roles:
            logger.warning(f"Access denied for user {user_email}: required one of roles {roles}, has role '{user_role}'")
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: one of the following roles required: {', '.join(roles)}"
            )
        return user
    
    return dependency
