from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ats.database import get_db
from ats.config import settings
from ats.orm.user import User, UserRole, UserRoleAssociation
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




@router.post("/create_user", response_model=CreateUserResponse)
async def create_user(
    user_data: CreateUserRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Create a new user in the database.
    Requires valid JWT authentication.
    """
    # Verify JWT token
    current_user = get_current_user_from_token(request)
    
    # Check if user with this email already exists
    existing_user = db.query(User).filter(
        or_(
            User.email == user_data.email, 
            User.phone == user_data.phone, 
            User.telegram == user_data.telegram,
        )
    ).first()
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
    db.flush()  # Flush to get the user ID
    
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
    
    db.commit()
    db.refresh(new_user)
    
    
    return CreateUserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        roles=created_roles,
        created_at=new_user.created_at
    )
