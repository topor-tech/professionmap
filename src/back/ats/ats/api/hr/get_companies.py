import json
from typing import List
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, alias, func

from ats.database import get_async_db
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole, User
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["companies"])


my_company_access = alias(HRToCompanyAccess, name="my_company_access")

class UserInfoResponse(BaseModel):
    """Response model for user information"""
    id: int
    name: str
    email: str
    phone: str | None
    telegram: str | None

class CompanyResponse(BaseModel):
    """Response model for company information"""
    id: int
    name: str
    public_description: str | None
    created_at: datetime
    hr_user: list[UserInfoResponse]


@router.get("/hr/companies", response_model=List[CompanyResponse])
async def get_user_companies(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all companies that the current user has access to.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Get companies that the user has access to
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # For superusers and admins, get all companies with their HR users
        result = await db.execute(
            select(
                Company, 
                func.array_agg(
                    func.json_build_object(
                        'id', User.id,
                        'name', User.name,
                        'email', User.email,
                        'phone', User.phone,
                        'telegram', User.telegram,
                    )
                ).label("hr_users"),
            )
            .outerjoin(HRToCompanyAccess, Company.id == HRToCompanyAccess.company_id)
            .outerjoin(User, HRToCompanyAccess.user_id == User.id)
            .group_by(Company.id)
        )
        companies_data = result.all()
    else:
        # For regular users, get only companies they have access to
        result = await db.execute(
            select(
                Company, 
                func.array_agg(
                    func.json_build_object(
                        'id', User.id,
                        'name', User.name,
                        'email', User.email,
                        'phone', User.phone,
                        'telegram', User.telegram,
                    )
                ).label("hr_users"),
            ).select_from(
                my_company_access,
            ).join(Company, my_company_access.company_id == Company.id)
            .outerjoin(HRToCompanyAccess, Company.id == HRToCompanyAccess.company_id)
            .outerjoin(User, HRToCompanyAccess.user_id == User.id)
            .where(my_company_access.user_id == current_user.id)
            .group_by(Company.id)
        )
        companies_data = result.all()
    
    return [
        CompanyResponse(
            id=company.id,
            name=company.name,
            public_description=company.public_description,
            created_at=company.created_at,
            hr_user=[
                UserInfoResponse(
                    id=hr_user['id'],
                    name=hr_user['name'],
                    email=hr_user['email'],
                    phone=hr_user['phone'],
                    telegram=hr_user['telegram'],
                )
                for hr_user in hr_users if hr_user['id'] is not None
            ]
        )
        for company, hr_users in companies_data
    ]
