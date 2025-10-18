from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime

from ats.database import get_async_db
from ats.orm.user import User, UserRole, UserRoleAssociation
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.employee_respond import EmployeeRespond, EmployeeRespondStatus
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["hr-responds"])


class UserInfoResponse(BaseModel):
    """Response model for user information"""
    id: int
    email: str
    name: str
    phone: str | None
    telegram: str | None


class VacancyInfoResponse(BaseModel):
    """Response model for vacancy information"""
    id: int
    title: str
    company_name: str


class EmployeeRespondResponse(BaseModel):
    """Response model for employee respond"""
    id: int
    user: UserInfoResponse
    vacancy: VacancyInfoResponse
    status: str
    created_at: datetime


@router.get("/hr/responds", response_model=List[EmployeeRespondResponse])
async def get_employee_responds(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by respond status"),
    vacancy_id: Optional[List[int]] = Query(None, description="Filter by vacancy ID(s)"),
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    limit: Optional[int] = Query(50, ge=1, le=100, description="Number of responds to return"),
    offset: Optional[int] = Query(0, ge=0, description="Number of responds to skip"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get employee responds with filtering options.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Build base query with joins
    query = select(
        EmployeeRespond,
        User.id.label("user_id"),
        User.email,
        User.name,
        User.phone,
        User.telegram,
        Vacancy.id.label("vacancy_id"),
        Vacancy.title,
        Company.name.label("company_name")
    ).join(
        User,
        EmployeeRespond.user_id == User.id
    ).join(
        Vacancy,
        EmployeeRespond.vacancy_id == Vacancy.id
    ).join(
        Company,
        Vacancy.company_id == Company.id
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
    
    # Apply status filter
    if status is not None:
        try:
            status_enum = EmployeeRespondStatus(status)
            query = query.filter(EmployeeRespond.status == status_enum)
        except ValueError:
            # Invalid status, return empty list
            return []
    
    # Apply vacancy filter
    if vacancy_id is not None and len(vacancy_id) > 0:
        query = query.filter(EmployeeRespond.vacancy_id.in_(vacancy_id))
    
    # Apply company filter
    if company_id is not None:
        query = query.filter(Vacancy.company_id == company_id)
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    # Order by creation date (newest first)
    query = query.order_by(EmployeeRespond.created_at.desc())
    
    # Execute query
    result = await db.execute(query)
    responds = result.all()
    
    return [
        EmployeeRespondResponse(
            id=respond.id,
            user=UserInfoResponse(
                id=user_id,
                email=email,
                name=name,
                phone=phone,
                telegram=telegram
            ),
            vacancy=VacancyInfoResponse(
                id=vacancy_id,
                title=title,
                company_name=company_name
            ),
            status=respond.status.value,
            created_at=respond.created_at
        )
        for respond, user_id, email, name, phone, telegram, vacancy_id, title, company_name in responds
    ]
