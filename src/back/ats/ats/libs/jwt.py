from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Request
from jose import jwt, JWTError
from pydantic import BaseModel

from ats.config import settings 


class JWTTokenPayload(BaseModel):
    """JWT token payload model"""
    sub: str  # Subject (email)
    id: int  # User ID
    roles: List[str] = []  # User roles
    exp: datetime  # Expiration time


class UserJWTTokenInfoResponse(BaseModel):
    """User JWT token info response model"""
    id: int  # User ID
    email: str
    name: str
    roles: List[str] = []



def create_access_token(data: JWTTokenPayload) -> str:
    """Create a JWT access token."""
    return jwt.encode(
        data.model_dump(), 
        settings.jwt_secret_key, 
        algorithm=settings.algorithm
    )


def get_current_user_from_token(request: Request) -> JWTTokenPayload:
    """Extract and validate JWT token from request cookies"""
    # Try to get token from cookies
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication cookie missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.algorithm]
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return JWTTokenPayload.model_validate(payload)
