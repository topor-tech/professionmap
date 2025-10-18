from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, false
from sqlalchemy import select

from ats.database import get_async_db
from ats.config import settings
from ats.orm.user import User, UserRole, UserRoleAssociation
from ats.libs.jwt import create_access_token, JWTTokenPayload

router = APIRouter(tags=["candidate-registration"])


class CandidateRegisterRequest(BaseModel):
    """Request model for candidate registration"""
    email: EmailStr
    phone: Optional[str] = None
    telegram: Optional[str] = None
    name: str
    password: str


class CandidateRegisterResponse(BaseModel):
    """Response model for candidate registration"""
    id: int
    email: str
    name: str
    message: str
    created_at: datetime


def get_password_hash(password: str) -> str:
    """Hash a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


@router.post("/candidate/register", response_model=CandidateRegisterResponse)
async def register_candidate(
    candidate_data: CandidateRegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Register a new candidate in the system.
    Creates a user with CANDIDATE role and automatically logs them in.
    """
    # Check if user with this email already exists
    result = await db.execute(
        select(User).filter(
            or_(
                User.email == candidate_data.email, 
                User.phone == candidate_data.phone if candidate_data.phone else false(), 
                User.telegram == candidate_data.telegram if candidate_data.telegram else false(),
            )
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email/телефоном/telegram уже существует"
        )
    
    # Create new user
    hashed_password = get_password_hash(candidate_data.password)
    new_user = User(
        email=candidate_data.email,
        phone=candidate_data.phone,
        telegram=candidate_data.telegram,
        name=candidate_data.name,
        password_hash=hashed_password
    )
    
    db.add(new_user)
    await db.flush()  # Flush to get the user ID
    
    # Add CANDIDATE role
    role_association = UserRoleAssociation(
        user_id=new_user.id,
        role=UserRole.CANDIDATE
    )
    db.add(role_association)
    
    await db.commit()
    await db.refresh(new_user)
    
    # Create access token for the new candidate
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data=JWTTokenPayload(
            sub=new_user.email, 
            id=new_user.id,
            roles=[UserRole.CANDIDATE.value],
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
    
    return CandidateRegisterResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        message="Регистрация успешна",
        created_at=new_user.created_at
    )
