from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, func, select

from ats.database import get_async_db
from ats.orm.company import Company, HRToCompanyAccess
from ats.orm.user import UserRole
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(tags=["companies"])


class CompanySuggestion(BaseModel):
    """Response model for company suggestions"""
    id: int
    name: str


@router.get("/hr/companies/suggest", response_model=List[CompanySuggestion])
async def suggest_companies(
    request: Request,
    q: str = Query(..., description="Search query for company name", min_length=0),
    limit: int = Query(10, description="Maximum number of suggestions", ge=1, le=50),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get company suggestions based on user input.
    Returns companies that the current user has access to, filtered by name.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Build base query
    if UserRole.SUPERUSER.value in current_user.roles or UserRole.ADMIN.value in current_user.roles:
        # Superusers and admins can see all companies
        query = select(Company)
    else:
        # Regular HR users can only see companies they have access to
        query = select(Company).join(HRToCompanyAccess).filter(
            HRToCompanyAccess.user_id == current_user.id
        )
    
    # Apply search filter - case insensitive search
    search_term = f"%{q.lower()}%"
    query = query.filter(
        Company.name.ilike(search_term),
    ).order_by(
        func.length(Company.name),
        Company.name,
    ).limit(limit)
    
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [
        CompanySuggestion(
            id=company.id,
            name=company.name,
        )
        for company in companies
    ]
