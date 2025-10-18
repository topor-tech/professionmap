from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ats.database import get_async_db
from ats.orm import User, UserRole, Vacancy, VacancyStatus, EmployeeRespond, EmployeeRespondStatus
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["candidate"])


class RespondRequest(BaseModel):
    """Request model for responding to vacancy (authenticated user)"""
    vacancy_id: int


class RespondResponse(BaseModel):
    """Response model for responding to vacancy (authenticated user)"""
    respond_id: int
    message: str


@router.post("/candidate/respond", response_model=RespondResponse)
async def respond_to_vacancy(
    request_data: RespondRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Respond to a vacancy as an authenticated user.
    Requires valid JWT authentication and CANDIDATE role.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check if user has CANDIDATE role
    if UserRole.CANDIDATE.value not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. CANDIDATE role required."
        )
    
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
    
    # Check if user already responded to this vacancy
    respond_result = await db.execute(
        select(EmployeeRespond).filter(
            and_(
                EmployeeRespond.vacancy_id == request_data.vacancy_id,
                EmployeeRespond.user_id == current_user.id
            )
        )
    )
    existing_respond = respond_result.scalar_one_or_none()
    
    if existing_respond:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вы уже откликнулись на эту вакансию"
        )
    
    # Create respond for authenticated user
    new_respond = EmployeeRespond(
        vacancy_id=request_data.vacancy_id,
        user_id=current_user.id,
        status=EmployeeRespondStatus.PENDING
    )
    db.add(new_respond)
    await db.commit()
    await db.refresh(new_respond)
    
    return RespondResponse(
        respond_id=new_respond.id,
        message="Отклик успешно отправлен"
    )
