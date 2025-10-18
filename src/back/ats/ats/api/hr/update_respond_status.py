from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ats.database import get_async_db
from ats.orm.employee_respond import EmployeeRespond, EmployeeRespondStatus
from ats.orm.vacancy import Vacancy
from ats.orm.company import HRToCompanyAccess
from ats.orm.user import User, UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["hr-responds"])


class UpdateRespondStatusRequest(BaseModel):
    """Request model for updating employee respond status"""
    respond_id: int
    status: str


class UpdateRespondStatusResponse(BaseModel):
    """Response model for respond status update"""
    id: int
    user_id: int
    vacancy_id: int
    status: str
    created_at: datetime
    message: str


async def check_hr_permissions_for_respond(current_user, respond_id: int, db: AsyncSession) -> EmployeeRespond:
    """Check if current user has HR access to the specified respond"""
    user_roles = current_user.roles  # roles is already a List[str]
    allowed_roles = [UserRole.HR.value, UserRole.SUPERUSER.value, UserRole.ADMIN.value]
    
    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only HR, SUPERUSER or ADMIN roles can update respond status"
        )
    
    # Get the respond with vacancy and company info
    result = await db.execute(
        select(EmployeeRespond, Vacancy)
        .join(Vacancy, EmployeeRespond.vacancy_id == Vacancy.id)
        .filter(EmployeeRespond.id == respond_id)
    )
    respond_data = result.first()
    
    if not respond_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee respond not found"
        )
    
    respond, vacancy = respond_data
    
    # If user is SUPERUSER or ADMIN, they can edit any respond
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        return respond
    
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
            detail="Access denied. You don't have permission to update this respond"
        )
    
    return respond


@router.patch("/hr/responds/status", response_model=UpdateRespondStatusResponse)
async def update_respond_status(    
    status_data: UpdateRespondStatusRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Update the status of an employee respond.
    Requires valid JWT authentication and HR access to the respond's company.
    
    Valid status values:
    - pending: Ожидает рассмотрения
    - rejected: Отклонено
    - interview_pending: Ожидает собеседования
    - job_offer: Предложение о работе
    - job_accepted: Работа принята
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check permissions and get respond
    respond = await check_hr_permissions_for_respond(current_user, status_data.respond_id, db)
    
    # Validate status
    try:
        new_status = EmployeeRespondStatus(status_data.status)
    except ValueError:
        valid_statuses = [status.value for status in EmployeeRespondStatus]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Valid statuses are: {', '.join(valid_statuses)}"
        )
    
    # Store original status for comparison
    original_status = respond.status
    
    # Update the status
    respond.status = new_status
    
    await db.commit()
    await db.refresh(respond)
    
    # Create response message
    if original_status == new_status:
        message = f"Status remains {new_status.value}"
    else:
        message = f"Status updated from {original_status.value} to {new_status.value}"
    
    return UpdateRespondStatusResponse(
        id=respond.id,
        user_id=respond.user_id,
        vacancy_id=respond.vacancy_id,
        status=respond.status.value,
        created_at=respond.created_at,
        message=message
    )
