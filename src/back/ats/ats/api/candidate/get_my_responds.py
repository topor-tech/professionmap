from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from ats.database import get_async_db
from ats.orm.user import User, UserRole, UserRoleAssociation
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company
from ats.orm.employee_respond import EmployeeRespond, EmployeeRespondStatus
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["candidate-responds"])


class VacancyInfoResponse(BaseModel):
    """Response model for vacancy information"""
    id: int
    title: str
    company_name: str
    status: str


class EmployeeRespondResponse(BaseModel):
    """Response model for employee respond"""
    id: int
    vacancy: VacancyInfoResponse
    status: str
    created_at: datetime


@router.get("/candidate/my-responds", response_model=List[EmployeeRespondResponse])
async def get_my_responds(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get current user's employee responds.
    Requires valid JWT authentication and CANDIDATE role.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check if user has CANDIDATE role
    if UserRole.CANDIDATE.value not in current_user.roles:
        raise HTTPException(status_code=403, detail="Access denied. CANDIDATE role required.")
    
    # Build query to get user's responds with vacancy and company info
    query = select(
        EmployeeRespond,
        Vacancy.id.label("vacancy_id"),
        Vacancy.title,
        Vacancy.status.label("vacancy_status"),
        Company.name.label("company_name")
    ).join(
        Vacancy,
        EmployeeRespond.vacancy_id == Vacancy.id
    ).join(
        Company,
        Vacancy.company_id == Company.id
    ).filter(
        EmployeeRespond.user_id == current_user.id
    ).order_by(
        EmployeeRespond.created_at.desc()
    )
    
    # Execute query
    result = await db.execute(query)
    responds = result.all()
    
    return [
        EmployeeRespondResponse(
            id=respond.id,
            vacancy=VacancyInfoResponse(
                id=vacancy_id,
                title=title,
                company_name=company_name,
                status=vacancy_status.value
            ),
            status=respond.status.value,
            created_at=respond.created_at
        )
        for respond, vacancy_id, title, vacancy_status, company_name in responds
    ]
