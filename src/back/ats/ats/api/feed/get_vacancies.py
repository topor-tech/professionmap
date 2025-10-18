from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company
from ats.config import settings

router = APIRouter(tags=["feed"])


class PublicVacancyResponse(BaseModel):
    """Response model for public vacancy information"""
    id: int
    company_id: int
    title: str
    description: str | None
    requirements: str | None
    created_at: datetime
    company_name: str
    link: str


@router.get("/feed/vacancies", response_model=List[PublicVacancyResponse])
async def get_active_vacancies(
    limit: Optional[int] = Query(50, ge=1, le=100, description="Number of vacancies to return"),
    offset: Optional[int] = Query(0, ge=0, description="Number of vacancies to skip"),
    company_id: Optional[str] = Query(None, description="Filter by company ID(s), comma-separated for multiple"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all active vacancies for public consumption.
    No authentication required.
    """
    # Build query for active vacancies only
    query = select(
        Vacancy,
        Company.name.label("company_name")
    ).join(
        Company,
        Vacancy.company_id == Company.id
    ).order_by(
        Vacancy.created_at.desc(),
    ).filter(
        Vacancy.status == VacancyStatus.ACTIVE
    )
    
    # Apply company filter if specified
    if company_id is not None:
        # Parse comma-separated company IDs
        company_ids = [int(id.strip()) for id in company_id.split(',') if id.strip()]
        if company_ids:
            query = query.filter(Vacancy.company_id.in_(company_ids))
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    # Order by creation date (newest first)
    query = query.order_by(Vacancy.created_at.desc())
    
    # Execute query
    result = await db.execute(query)
    vacancies = result.all()
    
    return [
        PublicVacancyResponse(
            id=vacancy.id,
            company_id=vacancy.company_id,
            title=vacancy.title,
            description=vacancy.description,
            requirements=vacancy.requirements,
            created_at=vacancy.created_at,
            company_name=company_name,
            link=f"{settings.base_url}/{vacancy.id}",
        )
        for vacancy, company_name in vacancies
    ]
