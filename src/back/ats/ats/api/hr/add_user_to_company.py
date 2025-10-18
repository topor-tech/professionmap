from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.user import User, UserRole, UserRoleAssociation
from ats.orm.company import HRToCompanyAccess
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["companies"])


class AddUserToCompanyRequest(BaseModel):
    """Request model for adding existing user to company"""
    user_id: int
    company_id: int


class AddUserToCompanyResponse(BaseModel):
    """Response model for adding user to company"""
    success: bool
    message: str


@router.post("/hr/companies/add_user", response_model=AddUserToCompanyResponse)
async def add_user_to_company(
    request_data: AddUserToCompanyRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Add an existing user to a company with HR role.
    Requires valid JWT authentication and appropriate permissions.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Check if the user exists
    user_result = await db.execute(
        select(User).filter(User.id == request_data.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user already has access to this company
    existing_access = await db.execute(
        select(HRToCompanyAccess).filter(
            HRToCompanyAccess.user_id == request_data.user_id,
            HRToCompanyAccess.company_id == request_data.company_id
        )
    )
    if existing_access.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has access to this company"
        )
    
    # Check if current user has permission to add users to this company
    current_user_has_access = False
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        current_user_has_access = True
    else:
        # Check if current user has access to this company
        access_result = await db.execute(
            select(HRToCompanyAccess).filter(
                HRToCompanyAccess.user_id == current_user.id,
                HRToCompanyAccess.company_id == request_data.company_id
            )
        )
        if access_result.scalar_one_or_none():
            current_user_has_access = True
    
    if not current_user_has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add users to this company"
        )
    
    # Check if user has HR role, if not add it
    user_roles_result = await db.execute(
        select(UserRoleAssociation).filter(
            UserRoleAssociation.user_id == request_data.user_id,
            UserRoleAssociation.role == UserRole.HR
        )
    )
    if not user_roles_result.scalar_one_or_none():
        # Add HR role to user
        hr_role = UserRoleAssociation(
            user_id=request_data.user_id,
            role=UserRole.HR
        )
        db.add(hr_role)
    
    # Add user to company
    hr_access = HRToCompanyAccess(
        user_id=request_data.user_id,
        company_id=request_data.company_id
    )
    db.add(hr_access)
    
    await db.commit()
    
    return AddUserToCompanyResponse(
        success=True,
        message=f"User {user.name} successfully added to company with HR role"
    )
