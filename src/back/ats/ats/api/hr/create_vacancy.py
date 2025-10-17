from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session

from ats.database import get_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["vacancies"])


class CreateVacancyRequest(BaseModel):
    """Request model for creating a new vacancy"""
    company_id: int
    title: str
    description: Optional[str] = None
    requirements: Optional[str] = None
    expires_at: Optional[datetime] = None


class CreateVacancyResponse(BaseModel):
    """Response model for vacancy creation"""
    id: int
    company_id: int
    title: str
    description: Optional[str]
    requirements: Optional[str]
    status: VacancyStatus
    expires_at: Optional[datetime]
    created_at: datetime


def check_hr_permissions_for_company(current_user, company_id: int, db: Session) -> None:
    """Check if current user has HR access to the specified company"""
    user_roles = current_user.roles  # roles is already a List[str]
    allowed_roles = [UserRole.HR.value, UserRole.SUPERUSER.value, UserRole.ADMIN.value]
    
    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only HR, SUPERUSER or ADMIN roles can create vacancies"
        )
    
    # If user is not SUPERUSER or ADMIN, check if they have access to this company
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        return
    
    hr_access = db.query(HRToCompanyAccess).filter(
        HRToCompanyAccess.user_id == current_user.id,
        HRToCompanyAccess.company_id == company_id
    ).first()
    
    if not hr_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to create vacancies for this company"
        )


@router.post("/hr/create_vacancy", response_model=CreateVacancyResponse)
async def create_vacancy(
    vacancy_data: CreateVacancyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Create a new vacancy in the database.
    Requires valid JWT authentication and HR access to the specified company.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check if company exists
    # Check if user has required permissions for this company
    check_hr_permissions_for_company(current_user, vacancy_data.company_id, db)
    
    # Create new vacancy
    new_vacancy = Vacancy(
        company_id=vacancy_data.company_id,
        title=vacancy_data.title,
        description=vacancy_data.description,
        requirements=vacancy_data.requirements,
        expires_at=vacancy_data.expires_at,
        status=VacancyStatus.ON_REVIEW  # Default status
    )
    
    db.add(new_vacancy)
    db.commit()
    db.refresh(new_vacancy)
    
    return CreateVacancyResponse(
        id=new_vacancy.id,
        company_id=new_vacancy.company_id,
        title=new_vacancy.title,
        description=new_vacancy.description,
        requirements=new_vacancy.requirements,
        status=new_vacancy.status.value,
        expires_at=new_vacancy.expires_at,
        created_at=new_vacancy.created_at
    )
