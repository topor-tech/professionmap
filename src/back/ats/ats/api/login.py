from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from sqlalchemy.orm import Session

from ats.database import get_db
from ats.config import settings
from ats.orm.user import User, UserRoleAssociation, UserRole
from ats.libs.jwt import create_access_token, JWTTokenPayload

router = APIRouter(tags=["login"])


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




@router.post("/login")
async def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login endpoint that handles both superuser and database user authentication.
    Sets access token as HTTP-only cookie for successful logins.
    """
    # Check if the provided credentials match the superuser credentials
    if (login_data.email == settings.superuser_email and 
        login_data.password == settings.superuser_password):
        
        # Create access token for superuser
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data=JWTTokenPayload(
                sub=login_data.email,
                id=0,
                roles=[UserRole.SUPERUSER.value],
                exp=datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
            )
        )
        
        # Set the access token as an HTTP-only cookie
        response.set_cookie(
            key=settings.jwt_cookie_name,
            value=access_token,
            max_age=settings.access_token_expire_minutes * 60,  # Convert to seconds
            httponly=True,
            secure=not settings.is_development,  # False in development, True in production
            samesite="lax",
            domain="localhost" if settings.is_development else None,  # Set domain for localhost
            path="/"  # Ensure cookie is available for all paths
        )
        
        return {"message": "Login successful"}
    
    # Check if user exists in database
    user = db.query(User).filter(User.email == login_data.email).first()
    if user:
        # Verify password for database user
        if verify_password(login_data.password, user.password_hash):
            # Get user roles from database
            user_roles = db.query(UserRoleAssociation.role).filter(
                UserRoleAssociation.user_id == user.id,
                UserRoleAssociation.role != UserRole.CANDIDATE,
            ).all()
            
            # Check if user has at least one role
            if not user_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User has no assigned roles"
                )
            
            user_roles = [role.role for role in user_roles]
            # Create access token for database user with roles
            access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
            access_token = create_access_token(
                data=JWTTokenPayload(
                    sub=user.email, 
                    id=user.id,
                    roles=user_roles,
                    exp=datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes),
                )
            )
            
            # Set the access token as an HTTP-only cookie
            response.set_cookie(
                key=settings.jwt_cookie_name,
                value=access_token,
                httponly=True,
                secure=not settings.is_development,  # False in development, True in production
                samesite="lax",
                domain="localhost" if settings.is_development else None,  # Set domain for localhost
                path="/"  # Ensure cookie is available for all paths
            )
            
            return {"message": "Login successful"}
    
    # If credentials don't match for either superuser or database user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )


@router.post("/logout")
async def logout(response: Response):
    """
    Logout endpoint that clears the access token cookie.
    """
    response.delete_cookie(
        key=settings.jwt_cookie_name,
        httponly=True,
        secure=not settings.is_development,  # False in development, True in production
        samesite="lax",
        domain="localhost" if settings.is_development else None,  # Set domain for localhost
        path="/"  # Ensure cookie is available for all paths
    )
    
    return {"message": "Logout successful"}
