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
    total_responds: int
    pending_responds: int
    rejected_responds: int
    interview_pending_responds: int
    job_offer_responds: int
    job_accepted_responds: int


@router.get("/hr/vacancies/stats", response_model=VacancyStatsResponse)
async def get_vacancy_stats(
    request: Request,
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    db: AsyncSession = Depends(get_async_db)
) -> VacancyStatsResponse:
    """
    Get vacancy statistics for the current user.
    Returns counts of active, on review, and total vacancies.
    Uses responds/stats data for response counts instead of direct counting.
    Optionally filter by company_id.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Build base query for vacancy statistics
    vacancy_query = select(
        func.count(Vacancy.id).label("total_vacancies"),
        func.count(Vacancy.id).filter(Vacancy.status == VacancyStatus.ACTIVE).label("active_vacancies"),
        func.count(Vacancy.id).filter(Vacancy.status == VacancyStatus.ON_REVIEW).label("on_review_vacancies"),
    ).join(
        Company,
        Vacancy.company_id == Company.id
    )
    
    # Apply company access filter to vacancy query
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # Superusers and admins can see all vacancies
        pass
    else:
        # Regular HR users can only see vacancies from companies they have access to
        vacancy_query = vacancy_query.join(
            HRToCompanyAccess,
            and_(
                Vacancy.company_id == HRToCompanyAccess.company_id,
                HRToCompanyAccess.user_id == current_user.id
            )
        )
    
    # Apply company filter if specified
    if company_id is not None:
        vacancy_query = vacancy_query.filter(Vacancy.company_id == company_id)
    
    # Execute vacancy query
    vacancy_result = await db.execute(vacancy_query)
    vacancy_result = vacancy_result.first()
    
    # Get all user's vacancy IDs for responds stats
    user_vacancies_query = select(Vacancy.id).join(
        Company,
        Vacancy.company_id == Company.id
    )
    
    # Apply company access filter to get user's vacancies
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # Superusers and admins can see all vacancies
        pass
    else:
        # Regular HR users can only see vacancies from companies they have access to
        user_vacancies_query = user_vacancies_query.join(
            HRToCompanyAccess,
            and_(
                Vacancy.company_id == HRToCompanyAccess.company_id,
                HRToCompanyAccess.user_id == current_user.id
            )
        )
    
    # Apply company filter if specified
    if company_id is not None:
        user_vacancies_query = user_vacancies_query.filter(Vacancy.company_id == company_id)
    
    # Execute query to get user's vacancy IDs
    user_vacancies_result = await db.execute(user_vacancies_query)
    user_vacancy_ids = [row[0] for row in user_vacancies_result.all()]
    
    # Get responds stats using the service function
    from ats.services.responds_stats_service import get_responds_statistics
    
    # Call the service function with all user's vacancy IDs
    responds_stats_response = await get_responds_statistics(
        current_user=current_user,
        vacancy_ids=user_vacancy_ids,
        db=db
    )
    
    # Extract respond counts from the stats response
    total_responds = responds_stats_response.total_responds
    pending_responds = 0
    rejected_responds = 0
    interview_pending_responds = 0
    job_offer_responds = 0
    job_accepted_responds = 0
    
    # Aggregate status counts from overall_status_breakdown
    for status_stat in responds_stats_response.overall_status_breakdown:
        if status_stat.status == "pending":
            pending_responds = status_stat.count
        elif status_stat.status == "rejected":
            rejected_responds = status_stat.count
        elif status_stat.status == "interview_pending":
            interview_pending_responds = status_stat.count
        elif status_stat.status == "job_offer":
            job_offer_responds = status_stat.count
        elif status_stat.status == "job_accepted":
            job_accepted_responds = status_stat.count
    
    return VacancyStatsResponse(
        active_vacancies=vacancy_result.active_vacancies if vacancy_result else 0,
        on_review_vacancies=vacancy_result.on_review_vacancies if vacancy_result else 0,
        total_vacancies=vacancy_result.total_vacancies if vacancy_result else 0,
        total_responds=total_responds,
        pending_responds=pending_responds,
        rejected_responds=rejected_responds,
        interview_pending_responds=interview_pending_responds,
        job_offer_responds=job_offer_responds,
        job_accepted_responds=job_accepted_responds
    )
