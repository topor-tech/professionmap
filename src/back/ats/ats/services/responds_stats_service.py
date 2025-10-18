from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from collections import defaultdict

from ats.orm.user import User, UserRole
from ats.orm.vacancy import Vacancy
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.employee_respond import EmployeeRespond


class StatusStats:
    """Response model for status statistics"""
    def __init__(self, status: str, count: int):
        self.status = status
        self.count = count


class VacancyStats:
    """Response model for vacancy statistics"""
    def __init__(self, vacancy_id: int, vacancy_title: str, company_name: str, 
                 total_responds: int, status_breakdown: List[StatusStats]):
        self.vacancy_id = vacancy_id
        self.vacancy_title = vacancy_title
        self.company_name = company_name
        self.total_responds = total_responds
        self.status_breakdown = status_breakdown


class RespondsStatsResponse:
    """Response model for employee responds statistics"""
    def __init__(self, total_responds: int, vacancies: List[VacancyStats], 
                 overall_status_breakdown: List[StatusStats]):
        self.total_responds = total_responds
        self.vacancies = vacancies
        self.overall_status_breakdown = overall_status_breakdown


async def get_responds_statistics(
    current_user: User,
    vacancy_ids: List[int],
    db: AsyncSession
) -> RespondsStatsResponse:
    """
    Get employee responds statistics for specified vacancies.
    Returns statistics grouped by status for each vacancy and overall.
    
    Args:
        current_user: The authenticated user
        vacancy_ids: List of vacancy IDs to get statistics for
        db: Database session
        
    Returns:
        RespondsStatsResponse: Statistics for the specified vacancies
    """
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
