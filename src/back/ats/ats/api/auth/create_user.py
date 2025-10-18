from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, false
from sqlalchemy import select

from ats.database import get_async_db
from ats.config import settings
from ats.orm import User, UserRole, UserRoleAssociation, HRToCompanyAccess, Company
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["users"])


class CreateUserRequest(BaseModel):
    """Request model for creating a new user"""
    email: EmailStr
    phone: Optional[str] = None
    telegram: Optional[str] = None
    name: str
    password: str
    roles: List[UserRole]
    company_id: Optional[int] = None


class CreateUserResponse(BaseModel):
    """Response model for user creation"""
    id: int
    email: str
    name: str
    roles: List[UserRole]
    created_at: datetime


def get_password_hash(password: str) -> str:
    """Hash a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")




@router.post("/auth/create_user", response_model=CreateUserResponse)
async def create_user(
    user_data: CreateUserRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new user in the database.
    Requires valid JWT authentication.
    """
    # Verify JWT token
    current_user = get_current_user_from_token(request)
    
    # Check if user with this email already exists
    result = await db.execute(
        select(User).filter(
            or_(
                User.email == user_data.email, 
                User.phone == user_data.phone if user_data.phone else false(), 
                User.telegram == user_data.telegram if user_data.telegram else false(),
            )
        )
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email/phone/telegram already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        phone=user_data.phone,
        telegram=user_data.telegram,
        name=user_data.name,
        password_hash=hashed_password
    )
    
    db.add(new_user)
    await db.flush()  # Flush to get the user ID
    
    # Add user roles
    created_roles = []
    for role in user_data.roles:
        if role not in current_user.roles:
            role_association = UserRoleAssociation(
                user_id=new_user.id,
                role=role
            )
            db.add(role_association)
            created_roles.append(role)
    

    if user_data.company_id:
        current_user_has_access = False
        if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
            current_user_has_access = True
        else:
            result = await db.execute(
                select(HRToCompanyAccess).filter(
                    HRToCompanyAccess.user_id == current_user.id,
                    HRToCompanyAccess.company_id == user_data.company_id
                )
            )
            hr_access = result.scalar_one_or_none()
            if hr_access:
                current_user_has_access = True

        if current_user_has_access:
            hr_access = HRToCompanyAccess(
                user_id=new_user.id,
                company_id=user_data.company_id
            )
            db.add(hr_access)


    await db.commit()
    await db.refresh(new_user)
    
    
    return CreateUserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        roles=created_roles,
        created_at=new_user.created_at
    )
