from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["vacancies"])


class UpdateVacancyRequest(BaseModel):
    """Request model for updating a vacancy"""
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    expires_at: Optional[datetime] = None


class UpdateVacancyResponse(BaseModel):
    """Response model for vacancy update"""
    id: int
    company_id: int
    title: str
    description: Optional[str]
    requirements: Optional[str]
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    message: str


async def check_hr_permissions_for_vacancy(current_user, vacancy_id: int, db: AsyncSession) -> Vacancy:
    """Check if current user has HR access to the specified vacancy"""
    user_roles = current_user.roles  # roles is already a List[str]
    allowed_roles = [UserRole.HR.value, UserRole.SUPERUSER.value, UserRole.ADMIN.value]
    
    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only HR, SUPERUSER or ADMIN roles can update vacancies"
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


@router.patch("/hr/vacancies/{vacancy_id}", response_model=UpdateVacancyResponse)
async def update_vacancy(
    vacancy_id: int,
    vacancy_data: UpdateVacancyRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update an existing vacancy.
    Requires valid JWT authentication and HR access to the vacancy's company.
    
    Status logic:
    - If HR user edits: status changes to ON_REVIEW
    - If ADMIN or SUPERUSER edits: status remains unchanged
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check permissions and get vacancy
    vacancy = await check_hr_permissions_for_vacancy(current_user, vacancy_id, db)
    
    # Store original status for comparison
    original_status = vacancy.status
    
    # Update vacancy fields if provided
    if vacancy_data.title is not None:
        vacancy.title = vacancy_data.title
    if vacancy_data.description is not None:
        vacancy.description = vacancy_data.description
    if vacancy_data.requirements is not None:
        vacancy.requirements = vacancy_data.requirements
    if vacancy_data.expires_at is not None:
        vacancy.expires_at = vacancy_data.expires_at
    
    # Apply status logic based on user role
    user_roles = current_user.roles
    if UserRole.HR.value in user_roles and UserRole.SUPERUSER.value not in user_roles and UserRole.ADMIN.value not in user_roles:
        # HR user (not admin/superuser) - set status to ON_REVIEW
        vacancy.status = VacancyStatus.ON_REVIEW
        status_message = "Vacancy updated and set to ON_REVIEW status"
    else:
        # ADMIN or SUPERUSER - keep original status
        status_message = f"Vacancy updated, status remains {original_status.value}"
    
    await db.commit()
    await db.refresh(vacancy)
    
    return UpdateVacancyResponse(
        id=vacancy.id,
        company_id=vacancy.company_id,
        title=vacancy.title,
        description=vacancy.description,
        requirements=vacancy.requirements,
        status=vacancy.status.value,
        expires_at=vacancy.expires_at,
        created_at=vacancy.created_at,
        message=status_message
    )
