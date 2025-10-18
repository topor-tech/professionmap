from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, func, select

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["vacancy-stats"])


class VacancyStatsResponse(BaseModel):
    """Response model for vacancy statistics"""
    active_vacancies: int
    on_review_vacancies: int
    total_vacancies: int


@router.get("/hr/vacancies/stats", response_model=VacancyStatsResponse)
async def get_vacancy_stats(
    request: Request,
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    db: AsyncSession = Depends(get_async_db)
) ->VacancyStatsResponse:
    """
    Get vacancy statistics for the current user.
    Returns counts of active, on review, and total vacancies.
    Optionally filter by company_id.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Build base query
    query = select(
        func.count(Vacancy.id).label("total_vacancies"),
        func.count(Vacancy.id).filter(Vacancy.status == VacancyStatus.ACTIVE).label("active_vacancies"),
        func.count(Vacancy.id).filter(Vacancy.status == VacancyStatus.ON_REVIEW).label("on_review_vacancies"),
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
    
    result = await db.execute(query)
    result = result.first()
    return VacancyStatsResponse(
        active_vacancies=result.active_vacancies if result else 0,
        on_review_vacancies=result.on_review_vacancies if result else 0,
        total_vacancies=result.total_vacancies if result else 0
    )
