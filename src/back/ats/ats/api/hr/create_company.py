from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session

from ats.database import get_db
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["companies"])


class CreateCompanyRequest(BaseModel):
    """Request model for creating a new company"""
    name: str
    public_description: Optional[str] = None


class CreateCompanyResponse(BaseModel):
    """Response model for company creation"""
    id: int
    name: str
    public_description: Optional[str]
    created_at: datetime


def check_hr_permissions(current_user) -> None:
    """Check if current user has HR, SUPERUSER or ADMIN role"""
    user_roles = current_user.roles  # roles is already a List[str]
    allowed_roles = [UserRole.HR.value, UserRole.SUPERUSER.value, UserRole.ADMIN.value]
    
    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only HR or ADMIN roles can create companies"
        )


@router.post("/create_company", response_model=CreateCompanyResponse)
async def create_company(
    company_data: CreateCompanyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Create a new company in the database.
    Requires valid JWT authentication and HR, SUPERUSER, or ADMIN role.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check if user has required permissions
    check_hr_permissions(current_user)
    
    # Create new company
    new_company = Company(
        name=company_data.name,
        public_description=company_data.public_description
    )
    
    db.add(new_company)
    db.flush()  # Flush to get the company ID
    
    # Add HR access record for the current user
    if UserRole.SUPERUSER.value not in current_user.roles:
        hr_access = HRToCompanyAccess(
            user_id=current_user.id,
            company_id=new_company.id
        )
        db.add(hr_access)
    
    db.commit()
    db.refresh(new_company)
    
    return CreateCompanyResponse(
        id=new_company.id,
        name=new_company.name,
        public_description=new_company.public_description,
        created_at=new_company.created_at
    )
