from typing import List
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session

from ats.database import get_db
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["companies"])


class CompanyResponse(BaseModel):
    """Response model for company information"""
    id: int
    name: str
    public_description: str | None
    created_at: datetime


@router.get("/hr/companies", response_model=List[CompanyResponse])
async def get_user_companies(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get all companies that the current user has access to.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Get companies that the user has access to
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        companies = db.query(Company).all()
    else:
        companies = db.query(Company).join(HRToCompanyAccess).filter(
            HRToCompanyAccess.user_id == current_user.id
        ).all()
    
    return [
        CompanyResponse(
            id=company.id,
            name=company.name,
            public_description=company.public_description,
            created_at=company.created_at
        )
        for company in companies
    ]
