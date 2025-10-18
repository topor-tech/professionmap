from typing import List
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy
from ats.orm.company import Company
from ats.libs.jwt import get_current_user_from_token
from ats.orm.user import UserRole

router = APIRouter(tags=["admin"])


class AdminVacancyResponse(BaseModel):
    """Response model for admin vacancy information"""
    id: int
    company_id: int
    title: str
    description: str | None
    requirements: str | None
    status: str
    expires_at: datetime | None
    created_at: datetime
    company_name: str


def check_admin_access(current_user) -> None:
    """Check if the current user has admin or superuser access"""
    if not (UserRole.ADMIN.value in current_user.roles or UserRole.SUPERUSER.value in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


@router.get("/admin/vacancies", response_model=List[AdminVacancyResponse])
async def get_all_vacancies(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all vacancies for admin moderation.
    Only accessible by admin or superuser roles.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check admin access
    check_admin_access(current_user)
    
    # Get all vacancies with company information
    query = select(
        Vacancy,
        Company.name.label("company_name")
    ).join(
        Company,
        Vacancy.company_id == Company.id
    ).order_by(Vacancy.created_at.desc())
    
    result = await db.execute(query)
    vacancies = result.all()
    
    return [
        AdminVacancyResponse(
            id=vacancy.id,
            company_id=vacancy.company_id,
            title=vacancy.title,
            description=vacancy.description,
            requirements=vacancy.requirements,
            status=vacancy.status.value,
            expires_at=vacancy.expires_at,
            created_at=vacancy.created_at,
            company_name=company_name,
        )
        for vacancy, company_name in vacancies
    ]
