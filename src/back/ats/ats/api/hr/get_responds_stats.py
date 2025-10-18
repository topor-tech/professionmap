from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from collections import defaultdict

from ats.database import get_async_db
from ats.orm.user import User, UserRole, UserRoleAssociation
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.employee_respond import EmployeeRespond, EmployeeRespondStatus
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["hr-responds-stats"])


class StatusStats(BaseModel):
    """Response model for status statistics"""
    status: str
    count: int


class VacancyStats(BaseModel):
    """Response model for vacancy statistics"""
    vacancy_id: int
    vacancy_title: str
    company_name: str
    total_responds: int
    status_breakdown: List[StatusStats]


class RespondsStatsResponse(BaseModel):
    """Response model for employee responds statistics"""
    total_responds: int
    vacancies: List[VacancyStats]
    overall_status_breakdown: List[StatusStats]


@router.get("/hr/responds/stats", response_model=RespondsStatsResponse)
async def get_responds_stats(
    request: Request,
    vacancy_ids: List[int] = Query(..., description="List of vacancy IDs to get statistics for"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get employee responds statistics for specified vacancies.
    Returns statistics grouped by status for each vacancy and overall.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    if not vacancy_ids:
        return RespondsStatsResponse(
            total_responds=0,
            vacancies=[],
            overall_status_breakdown=[]
        )
    
    # Build base query with joins
    query = select(
        EmployeeRespond,
        Vacancy.id.label("vacancy_id"),
        Vacancy.title.label("vacancy_title"),
        Company.name.label("company_name")
    ).join(
        Vacancy,
        EmployeeRespond.vacancy_id == Vacancy.id
    ).join(
        Company,
        Vacancy.company_id == Company.id
    ).filter(
        EmployeeRespond.vacancy_id.in_(vacancy_ids)
    )
    
    # Apply company access filter
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # Superusers and admins can see all responds
        pass
    else:
        # Regular HR users can only see responds from companies they have access to
        query = query.join(
            HRToCompanyAccess,
            and_(
                Vacancy.company_id == HRToCompanyAccess.company_id,
                HRToCompanyAccess.user_id == current_user.id
            )
        )
    
    # Execute query
    result = await db.execute(query)
    responds = result.all()
    
    # Process data to create statistics
    vacancy_stats = defaultdict(lambda: {
        'vacancy_id': None,
        'vacancy_title': '',
        'company_name': '',
        'total_responds': 0,
        'status_counts': defaultdict(int)
    })
    
    overall_status_counts = defaultdict(int)
    total_responds = 0
    
    for respond, vacancy_id, vacancy_title, company_name in responds:
        vacancy_stats[vacancy_id]['vacancy_id'] = vacancy_id
        vacancy_stats[vacancy_id]['vacancy_title'] = vacancy_title
        vacancy_stats[vacancy_id]['company_name'] = company_name
        vacancy_stats[vacancy_id]['total_responds'] += 1
        vacancy_stats[vacancy_id]['status_counts'][respond.status.value] += 1
        
        overall_status_counts[respond.status.value] += 1
        total_responds += 1
    
    # Convert to response format
    vacancy_stats_list = []
    for vacancy_id in vacancy_ids:
        if vacancy_id in vacancy_stats:
            stats = vacancy_stats[vacancy_id]
            status_breakdown = [
                StatusStats(status=status, count=count)
                for status, count in stats['status_counts'].items()
            ]
            
            vacancy_stats_list.append(VacancyStats(
                vacancy_id=stats['vacancy_id'],
                vacancy_title=stats['vacancy_title'],
                company_name=stats['company_name'],
                total_responds=stats['total_responds'],
                status_breakdown=status_breakdown
            ))
        else:
            # Vacancy exists but has no responds
            vacancy_stats_list.append(VacancyStats(
                vacancy_id=vacancy_id,
                vacancy_title="Unknown",
                company_name="Unknown",
                total_responds=0,
                status_breakdown=[]
            ))
    
    # Create overall status breakdown
    overall_status_breakdown = [
        StatusStats(status=status, count=count)
        for status, count in overall_status_counts.items()
    ]
    
    return RespondsStatsResponse(
        total_responds=total_responds,
        vacancies=vacancy_stats_list,
        overall_status_breakdown=overall_status_breakdown
    )
