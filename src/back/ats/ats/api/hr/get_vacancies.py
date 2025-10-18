from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["vacancies"])


class VacancyResponse(BaseModel):
    """Response model for vacancy information"""
    id: int
    company_id: int
    title: str
    description: str | None
    requirements: str | None
    status: str
    expires_at: datetime | None
    created_at: datetime
    company_name: str


@router.get("/hr/vacancies", response_model=List[VacancyResponse])
async def get_user_vacancies(
    request: Request,
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all vacancies that the current user has access to.
    Optionally filter by company_id.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Build base query
    query = select(
        Vacancy,
        Company.name.label("company_name")
    ).join(
        Company,
        Vacancy.company_id == Company.id
    )
    
    # Apply company access filter
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # Superusers and admins can see all vacancies
        pass
    else:
        # Regular HR users can only see vacancies from companies they have access to
        query = query.join(
            HRToCompanyAccess,
            and_(
                Vacancy.company_id == HRToCompanyAccess.company_id,
                HRToCompanyAccess.user_id == current_user.id
            )
        )
    
    # Apply company filter if specified
    if company_id is not None:
        query = query.filter(Vacancy.company_id == company_id)
    
    # Execute query
    result = await db.execute(query)
    vacancies = result.all()
    
    return [
        VacancyResponse(
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
