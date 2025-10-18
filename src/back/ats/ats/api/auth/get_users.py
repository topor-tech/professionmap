from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.user import User, UserRoleAssociation, UserRole
from ats.libs.jwt import get_current_user_from_token, JWTTokenPayload

router = APIRouter(tags=["users"])


class UserResponse(BaseModel):
    """User response model for get_users endpoint"""
    id: int
    email: str
    name: str
    phone: str | None
    telegram: str | None
    created_at: str
    updated_at: str
    roles: List[str]


def check_admin_access(jwt_token_payload: JWTTokenPayload) -> None:
    """Check if the current user has admin access"""
    # Check if user is superuser (id=0) or has admin role
    if jwt_token_payload.id == 0:  # Superuser
        return
    
    # Check if user has admin role
    if UserRole.ADMIN.value not in jwt_token_payload.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )


@router.get("/auth/users", response_model=List[UserResponse])
async def get_users(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all users from the database.
    Only accessible by admin users or superuser.
    """
    # Authenticate user and check admin access
    jwt_token_payload = get_current_user_from_token(request)
    check_admin_access(jwt_token_payload)
    
    # Get all users from database
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    # Build response with user roles
    result = []
    for user in users:
        # Get user roles
        roles_result = await db.execute(
            select(UserRoleAssociation.role).filter(
                UserRoleAssociation.user_id == user.id
            )
        )
        user_roles = roles_result.scalars().all()
        roles = [role.role.value for role in user_roles]
        
        result.append(UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            telegram=user.telegram,
            created_at=user.created_at.isoformat(),
            updated_at=user.updated_at.isoformat(),
            roles=roles
        ))
    
    return result
