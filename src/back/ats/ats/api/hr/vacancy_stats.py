from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, func, select

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.orm.employee_respond import EmployeeRespond, EmployeeRespondStatus
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
) ->VacancyStatsResponse:
    """
    Get vacancy statistics for the current user.
    Returns counts of active, on review, and total vacancies.
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
    
    # Build respond statistics query
    respond_query = select(
        func.count(EmployeeRespond.id).label("total_responds"),
        func.count(EmployeeRespond.id).filter(EmployeeRespond.status == EmployeeRespondStatus.PENDING).label("pending_responds"),
        func.count(EmployeeRespond.id).filter(EmployeeRespond.status == EmployeeRespondStatus.REJECTED).label("rejected_responds"),
        func.count(EmployeeRespond.id).filter(EmployeeRespond.status == EmployeeRespondStatus.INTERVIEW_PENDING).label("interview_pending_responds"),
        func.count(EmployeeRespond.id).filter(EmployeeRespond.status == EmployeeRespondStatus.JOB_OFFER).label("job_offer_responds"),
        func.count(EmployeeRespond.id).filter(EmployeeRespond.status == EmployeeRespondStatus.JOB_ACCEPTED).label("job_accepted_responds"),
    ).join(
        Vacancy,
        EmployeeRespond.vacancy_id == Vacancy.id
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
    
    # Apply company access filter to respond query
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # Superusers and admins can see all responds
        pass
    else:
        # Regular HR users can only see responds from companies they have access to
        respond_query = respond_query.join(
            HRToCompanyAccess,
            and_(
                Vacancy.company_id == HRToCompanyAccess.company_id,
                HRToCompanyAccess.user_id == current_user.id
            )
        )
    
    # Apply company filter if specified
    if company_id is not None:
        vacancy_query = vacancy_query.filter(Vacancy.company_id == company_id)
        respond_query = respond_query.filter(Vacancy.company_id == company_id)
    
    # Execute both queries
    vacancy_result = await db.execute(vacancy_query)
    vacancy_result = vacancy_result.first()
    
    respond_result = await db.execute(respond_query)
    respond_result = respond_result.first()
    
    return VacancyStatsResponse(
        active_vacancies=vacancy_result.active_vacancies if vacancy_result else 0,
        on_review_vacancies=vacancy_result.on_review_vacancies if vacancy_result else 0,
        total_vacancies=vacancy_result.total_vacancies if vacancy_result else 0,
        total_responds=respond_result.total_responds if respond_result else 0,
        pending_responds=respond_result.pending_responds if respond_result else 0,
        rejected_responds=respond_result.rejected_responds if respond_result else 0,
        interview_pending_responds=respond_result.interview_pending_responds if respond_result else 0,
        job_offer_responds=respond_result.job_offer_responds if respond_result else 0,
        job_accepted_responds=respond_result.job_accepted_responds if respond_result else 0
    )
