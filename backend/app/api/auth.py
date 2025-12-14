# app/api/auth.py
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api")

class SignInRequest(BaseModel):
    email: str
    password: str

class SignInResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: Optional[str] = None

@router.post("/auth/signin", response_model=SignInResponse)
def signin(body: SignInRequest):
    """Sign in endpoint - demo implementation with test users."""
    # validate credentials (demo)
    if body.email == "admin@example.com" and body.password == "password":
        token = "testtoken_admin"
        user = {"id": "u-admin", "email": "admin@example.com", "name": "Admin", "role": "admin"}
        return {"token": token, "user": user}
    # else attempt normal user
    if body.email == "user@example.com" and body.password == "password":
        token = "testtoken_user"
        user = {"id": "u-user", "email": "user@example.com", "name": "User", "role": "user"}
        return {"token": token, "user": user}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/me", response_model=UserResponse)
def me(authorization: Optional[str] = Header(None)):
    """Get current user from token - demo implementation."""
    # read Authorization, return the user for demo tokens
    # In prod decode JWT
    if authorization and "testtoken_admin" in authorization:
        return {"id": "u-admin", "email": "admin@example.com", "name": "Admin", "role": "admin"}
    if authorization and "testtoken_user" in authorization:
        return {"id": "u-user", "email": "user@example.com", "name": "User", "role": "user"}
    raise HTTPException(status_code=401, detail="Unauthorized")
