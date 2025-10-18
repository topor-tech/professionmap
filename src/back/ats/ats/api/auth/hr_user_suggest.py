from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, func, select

from ats.database import get_async_db
from ats.orm.user import User, UserRole, UserRoleAssociation
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["users"])


class UserSuggestion(BaseModel):
    """Response model for user suggestions"""
    id: int
    name: str
    email: str
    telegram: str = None


@router.get("/hr/users/suggest", response_model=List[UserSuggestion])
async def suggest_users(
    request: Request,
    q: str = Query(..., description="Search query for user name, email or telegram", min_length=0),
    limit: int = Query(10, description="Maximum number of suggestions", ge=1, le=50),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get user suggestions based on user input.
    Returns users that match the search query in name, email, or telegram.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Build search query - case insensitive search across name, email, and telegram
    search_term = f"%{q.lower()}%"
    query = select(User).filter(
        or_(
            User.name.ilike(search_term),
            User.email.ilike(search_term),
            User.telegram.ilike(search_term)
        )
    ).order_by(
        func.length(User.email),
        User.email,
    ).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        UserSuggestion(
            id=user.id,
            name=user.name,
            email=user.email,
            telegram=user.telegram,
        )
        for user in users
    ]
