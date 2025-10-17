from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

import bcrypt
from jose import jwt
from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from sqlalchemy.orm import Session

from ats.database import get_db
from ats.config import settings
from ats.orm.user import User

router = APIRouter(tags=["login"])
ATS_JWT_COOKIE_NAME = "ats_access_token"


class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    """Hash a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.jwt_secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint that checks if user is superuser and provides access token.
    Only allows login for the configured superuser credentials.
    """
    # Check if the provided credentials match the superuser credentials
    if (login_data.email == settings.superuser_email and 
        login_data.password == settings.superuser_password):
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": login_data.email, "role": "superuser"},
            expires_delta=access_token_expires
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60  # Convert to seconds
        )
    
    # If credentials don't match, do nothing (return 401)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )
