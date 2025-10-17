from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

import bcrypt
from jose import jwt
from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from sqlalchemy.orm import Session

from ats.orm import get_db
from ats.config import settings

router = APIRouter(prefix="/login", tags=["login"])
ATS_JWT_COOKIE_NAME = "ats_access_token"


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
