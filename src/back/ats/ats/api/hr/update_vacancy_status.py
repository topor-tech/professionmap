from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import HRToCompanyAccess
from ats.orm.user import User, UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["hr-vacancies"])


class UpdateVacancyStatusRequest(BaseModel):
    """Request model for updating vacancy status"""
    status: str


class UpdateVacancyStatusResponse(BaseModel):
    """Response model for vacancy status update"""
    id: int
    company_id: int
    title: str
    status: str
    created_at: datetime
    message: str


async def check_hr_permissions_for_vacancy(current_user, vacancy_id: int, db: AsyncSession) -> Vacancy:
    """Check if current user has HR access to the specified vacancy"""
    user_roles = current_user.roles  # roles is already a List[str]
    allowed_roles = [UserRole.HR.value, UserRole.SUPERUSER.value, UserRole.ADMIN.value]
    
    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only HR, SUPERUSER or ADMIN roles can update vacancy status"
        )
    
    # Get the vacancy
    result = await db.execute(
        select(Vacancy).filter(Vacancy.id == vacancy_id)
    )
    vacancy = result.scalar_one_or_none()
    
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacancy not found"
        )
    
    # If user is SUPERUSER or ADMIN, they can edit any vacancy
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        return vacancy
    
    # For HR users, check if they have access to this company
    result = await db.execute(
        select(HRToCompanyAccess).filter(
            HRToCompanyAccess.user_id == current_user.id,
            HRToCompanyAccess.company_id == vacancy.company_id
        )
    )
    hr_access = result.scalar_one_or_none()
    
    if not hr_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to update this vacancy"
        )
    
    return vacancy


@router.patch("/hr/vacancies/{vacancy_id}/status", response_model=UpdateVacancyStatusResponse)
async def update_vacancy_status(    
    vacancy_id: int,
    status_data: UpdateVacancyStatusRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update the status of a vacancy.
    Requires valid JWT authentication and HR access to the vacancy's company.
    
    Valid status values:
    - CLOSED: Закрыта
    - ON_REVIEW: На рассмотрении
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check permissions and get vacancy
    vacancy = await check_hr_permissions_for_vacancy(current_user, vacancy_id, db)
    
    # Validate status - only allow CLOSED and ON_REVIEW
    valid_statuses = [VacancyStatus.CLOSED.value, VacancyStatus.ON_REVIEW.value]
    if status_data.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    try:
        new_status = VacancyStatus(status_data.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    # Store original status for comparison
    original_status = vacancy.status
    
    # Update the status
    vacancy.status = new_status
    
    await db.commit()
    await db.refresh(vacancy)
    
    # Create response message
    if original_status == new_status:
        message = f"Status remains {new_status.value}"
    else:
        message = f"Status updated from {original_status.value} to {new_status.value}"
    
    return UpdateVacancyStatusResponse(
        id=vacancy.id,
        company_id=vacancy.company_id,
        title=vacancy.title,
        status=vacancy.status.value,
        created_at=vacancy.created_at,
        message=message
    )
