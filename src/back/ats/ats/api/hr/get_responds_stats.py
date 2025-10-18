from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ats.database import get_async_db
from ats.libs.jwt import get_current_user_from_token
from ats.services.responds_stats_service import get_responds_statistics

router = APIRouter(tags=["hr-responds-stats"])


class StatusStats(BaseModel):
    """Response model for status statistics"""
    status: str
    count: int


class VacancyStats(BaseModel):
    """Response model for vacancy statistics"""
    vacancy_id: int
    vacancy_title: str
    company_name: str
    total_responds: int
    status_breakdown: List[StatusStats]


class RespondsStatsResponse(BaseModel):
    """Response model for employee responds statistics"""
    total_responds: int
    vacancies: List[VacancyStats]
    overall_status_breakdown: List[StatusStats]


@router.get("/hr/responds/stats", response_model=RespondsStatsResponse)
async def get_responds_stats(
    request: Request,
    vacancy_ids: List[int] = Query(..., description="List of vacancy IDs to get statistics for"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get employee responds statistics for specified vacancies.
    Returns statistics grouped by status for each vacancy and overall.
    Requires valid JWT authentication.
    """
    # Verify JWT token and get current user
    current_user = get_current_user_from_token(request)
    
    # Use the service function to get statistics
    return await get_responds_statistics(current_user, vacancy_ids, db)
