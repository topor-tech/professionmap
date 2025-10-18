from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.vacancy import Vacancy, VacancyStatus
from ats.orm.company import Company

router = APIRouter(tags=["feed"])


class VacancyInfoResponse(BaseModel):
    """Response model for detailed vacancy information"""
    id: int
    company_id: int
    title: str
    description: str | None
    requirements: str | None
    status: str
    expires_at: datetime | None
    created_at: datetime
    company_name: str


@router.get("/feed/vacancies/{vacancy_id}", response_model=VacancyInfoResponse)
async def get_vacancy_info(
    vacancy_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get detailed information about a specific vacancy by ID.
    No authentication required.
    """
    # Build query to get vacancy with company information
    query = select(
        Vacancy,
        Company.name.label("company_name")
    ).join(
        Company,
        Vacancy.company_id == Company.id
    ).filter(
        Vacancy.id == vacancy_id
    )
    
    # Execute query
    result = await db.execute(query)
    vacancy_data = result.first()
    
    if not vacancy_data:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    
    vacancy, company_name = vacancy_data
    
    # Check if vacancy is active (only return active vacancies for public consumption)
    if vacancy.status != VacancyStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    
    return VacancyInfoResponse(
        id=vacancy.id,
        company_id=vacancy.company_id,
        title=vacancy.title,
        description=vacancy.description,
        requirements=vacancy.requirements,
        status=vacancy.status.value,
        expires_at=vacancy.expires_at,
        created_at=vacancy.created_at,
        company_name=company_name,
    )
