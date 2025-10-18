from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ats.database import get_async_db
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole, User
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["companies"])


class EditCompanyRequest(BaseModel):
    """Request model for editing a company"""
    company_id: int
    name: str
    public_description: Optional[str] = None


class UserInfoResponse(BaseModel):
    """Response model for user information"""
    id: int
    name: str
    email: str
    phone: str | None
    telegram: str | None

class EditCompanyResponse(BaseModel):
    """Response model for company editing"""
    id: int
    name: str
    public_description: Optional[str]
    created_at: datetime
    hr_user: list[UserInfoResponse]


async def check_hr_permissions_for_company(current_user, company_id: int, db: AsyncSession) -> None:
    """Check if current user has HR access to the specified company"""
    user_roles = current_user.roles  # roles is already a List[str]
    allowed_roles = [UserRole.HR.value, UserRole.SUPERUSER.value, UserRole.ADMIN.value]
    
    if not any(role in user_roles for role in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only HR, SUPERUSER or ADMIN roles can edit companies"
        )
    
    # If user is not SUPERUSER or ADMIN, check if they have access to this company
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        return
    
    result = await db.execute(
        select(HRToCompanyAccess).filter(
            HRToCompanyAccess.user_id == current_user.id,
            HRToCompanyAccess.company_id == company_id
        )
    )
    hr_access = result.scalar_one_or_none()
    
    if not hr_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You don't have permission to edit this company"
        )


@router.put("/hr/edit_company", response_model=EditCompanyResponse)
async def edit_company(
    company_data: EditCompanyRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Edit an existing company in the database.
    Requires valid JWT authentication and HR access to the specified company.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check if company exists
    result = await db.execute(
        select(Company).filter(Company.id == company_data.company_id)
    )
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Check if user has required permissions for this company
    await check_hr_permissions_for_company(current_user, company_data.company_id, db)
    
    # Update company fields
    company.name = company_data.name
    company.public_description = company_data.public_description
    
    await db.commit()
    await db.refresh(company)
    
    # Fetch HR users for the company
    result = await db.execute(
        select(
            func.array_agg(
                func.json_build_object(
                    'id', User.id,
                    'name', User.name,
                    'email', User.email,
                    'phone', User.phone,
                    'telegram', User.telegram,
                )
            ).label("hr_users"),
        ).select_from(Company)
        .outerjoin(HRToCompanyAccess, Company.id == HRToCompanyAccess.company_id)
        .outerjoin(User, HRToCompanyAccess.user_id == User.id)
        .where(Company.id == company.id)
        .group_by(Company.id)
    )
    hr_users_data = result.scalar_one_or_none()
    hr_users = hr_users_data if hr_users_data else []
    
    return EditCompanyResponse(
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
