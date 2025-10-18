from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

import bcrypt
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ats.database import get_async_db
from ats.orm import User, UserRole, UserRoleAssociation, Vacancy, VacancyStatus, EmployeeRespond, EmployeeRespondStatus

router = APIRouter(tags=["candidate"])


class RespondNoLoginRequest(BaseModel):
    """Request model for responding to vacancy without login"""
    vacancy_id: int
    email: EmailStr
    phone: Optional[str] = None
    telegram: Optional[str] = None
    name: str
    password: str


class RespondNoLoginResponse(BaseModel):
    """Response model for responding to vacancy without login"""
    user_id: int
    respond_id: int
    message: str


def get_password_hash(password: str) -> str:
    """Hash a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


@router.post("/candidate/respond_no_login", response_model=RespondNoLoginResponse)
async def respond_to_vacancy_no_login(
    request_data: RespondNoLoginRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Respond to a vacancy without login. Creates a new user if they don't exist,
    or uses existing user if they do exist.
    """
    # Check if vacancy exists and is active
    vacancy_result = await db.execute(
        select(Vacancy).filter(
            and_(
                Vacancy.id == request_data.vacancy_id,
                Vacancy.status == VacancyStatus.ACTIVE
            )
        )
    )
    vacancy = vacancy_result.scalar_one_or_none()
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вакансия не найдена или неактивна"
        )
    
    # Check if user already exists
    user_result = await db.execute(
        select(User).filter(User.email == request_data.email)
    )
    existing_user = user_result.scalar_one_or_none()
    
    if existing_user:
        # User exists, check if they already responded to this vacancy
        respond_result = await db.execute(
            select(EmployeeRespond).filter(
                and_(
                    EmployeeRespond.vacancy_id == request_data.vacancy_id,
                    EmployeeRespond.user_id == existing_user.id
                )
            )
        )
        existing_respond = respond_result.scalar_one_or_none()
        
        if existing_respond:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Вы уже откликнулись на эту вакансию"
            )
        
        # Create respond for existing user
        new_respond = EmployeeRespond(
            vacancy_id=request_data.vacancy_id,
            user_id=existing_user.id,
            status=EmployeeRespondStatus.PENDING
        )
        db.add(new_respond)
        await db.commit()
        await db.refresh(new_respond)
        
        return RespondNoLoginResponse(
            user_id=existing_user.id,
            respond_id=new_respond.id,
            message="Отклик успешно отправлен с использованием существующего аккаунта"
        )
    
    else:
        # Create new user
        hashed_password = get_password_hash(request_data.password)
        new_user = User(
            email=request_data.email,
            phone=request_data.phone,
            telegram=request_data.telegram,
            name=request_data.name,
            password_hash=hashed_password
        )
        
        db.add(new_user)
        await db.flush()  # Flush to get the user ID
        
        # Add candidate role to new user
        candidate_role = UserRoleAssociation(
            user_id=new_user.id,
            role=UserRole.CANDIDATE
        )
        db.add(candidate_role)
        
        # Create respond for new user
        new_respond = EmployeeRespond(
            vacancy_id=request_data.vacancy_id,
            user_id=new_user.id,
            status=EmployeeRespondStatus.PENDING
        )
        db.add(new_respond)
        
        await db.commit()
        await db.refresh(new_user)
        await db.refresh(new_respond)
        
        return RespondNoLoginResponse(
            user_id=new_user.id,
            respond_id=new_respond.id,
            message="Новый аккаунт создан и отклик успешно отправлен"
        )
