from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session

from ats.database import get_db
from ats.config import settings
from ats.orm.user import User, UserRoleAssociation, UserRole
from ats.libs.jwt import get_current_user_from_token, UserJWTTokenInfoResponse

router = APIRouter(tags=["user_info"])
        

@router.get("/user_info", response_model=UserJWTTokenInfoResponse)
async def get_current_user_info(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get current user information from JWT token.
    Returns superuser info if token belongs to superuser,
    otherwise returns user info from database.
    """
    jwt_token_payload = get_current_user_from_token(request)
    

    user = db.query(User).filter(User.id == jwt_token_payload.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    roles = db.query(UserRoleAssociation.role).filter(UserRoleAssociation.user_id == user.id).all()
    roles = [role.role for role in roles]
    return UserJWTTokenInfoResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        roles=roles
    )
