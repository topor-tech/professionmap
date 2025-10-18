from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ats.database import get_async_db
from ats.orm.company import Company

router = APIRouter(tags=["feed"])


class CompanySuggestionResponse(BaseModel):
    """Response model for company suggestions"""
    id: int
    name: str
    public_description: str | None


@router.get("/feed/companies/suggest", response_model=List[CompanySuggestionResponse])
async def suggest_companies(
    q: str = Query(..., description="Search query for company name"),
    limit: Optional[int] = Query(10, ge=1, le=50, description="Number of suggestions to return"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Search companies by name for public consumption.
    No authentication required.
    Returns companies that match the search query.
    """
    # Build query to search companies by name
    query = select(Company).where(
        func.lower(Company.name).contains(func.lower(q))
    ).order_by(
        Company.name
    ).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    companies = result.scalars().all()
    
    return [
        CompanySuggestionResponse(
            id=company.id,
            name=company.name,
            public_description=company.public_description,
        )
        for company in companies
    ]
