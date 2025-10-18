from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.libs.jwt import get_current_user_from_token
from ats.orm.user import UserRole

router = APIRouter(tags=["admin"])


class UpdateVacancyStatusRequest(BaseModel):
    status: str


class UpdateVacancyStatusResponse(BaseModel):
    id: int
    status: str
    message: str


def check_admin_access(current_user) -> None:
    """Check if the current user has admin or superuser access"""
    if not (UserRole.ADMIN.value in current_user.roles or UserRole.SUPERUSER.value in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


@router.patch("/admin/vacancies/{vacancy_id}/status", response_model=UpdateVacancyStatusResponse)
async def update_vacancy_status(
    vacancy_id: int,
    status_data: UpdateVacancyStatusRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update vacancy status for admin moderation.
    Only accessible by admin or superuser roles.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check admin access
    check_admin_access(current_user)
    
    # Validate status
    try:
        new_status = VacancyStatus(status_data.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {[s.value for s in VacancyStatus]}"
        )
    
    # Get vacancy
    result = await db.execute(
        select(Vacancy).filter(Vacancy.id == vacancy_id)
    )
    vacancy = result.scalar_one_or_none()
    
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacancy not found"
        )
    
    # Update status
    vacancy.status = new_status
    await db.commit()
    await db.refresh(vacancy)
    
    return UpdateVacancyStatusResponse(
        id=vacancy.id,
        status=vacancy.status.value,
        message=f"Vacancy status updated to {vacancy.status.value}"
    )
