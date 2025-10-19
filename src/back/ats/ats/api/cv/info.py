"""CV info endpoint for retrieving CV details by ID."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import aliased

from ats.database import get_async_db
from ats.orm.file import File, CVFile

router = APIRouter(prefix="", tags=["cv"])

PDFFile = aliased(File)


class CVResponse(BaseModel):
    """Response model for CV info endpoint."""
    id: int
    name: str
    uploaded_at: datetime
    file_id: int
    file_original_filename: str | None
    file_s3_key: str | None
    file_extension: str | None
    pdf_file_id: int | None
    pdf_file_original_filename: str | None
    pdf_file_s3_key: str | None
    pdf_file_extension: str | None


@router.get("/cv/info/{cv_id}", response_model=CVResponse)
async def get_cv_by_id(
    cv_id: int,
    session: AsyncSession = Depends(get_async_db)
) -> CVResponse:
    """
    Get file information by ID.
    
    Args:
        file_id: The ID of the file to retrieve
        session: Database session dependency
        
    Returns:
        CVResponse object containing CV information
        
    Raises:
        HTTPException: If CV with given ID is not found
    """
    # Query CV by ID
    result = await session.execute(
        select(
            File.id,
            File.uploaded_at,
            File.file_id,
            File.pdf_file_id,
            File.original_filename,
            File.extension,
            File.s3_key,
            PDFFile.original_filename.label("pdf_original_filename"),
            PDFFile.extension.label("pdf_extension"),
            PDFFile.s3_key.label("pdf_s3_key"),
        ).join(
            CVFile,
            CVFile.file_id == File.id
        ).outerjoin(
            PDFFile,
            CVFile.pdf_file_id == PDFFile.id,
        ).where(CVFile.id == cv_id)
    )
    cv = result.one_or_none()
    
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    
    # Convert to response model
    return CVResponse(
        id=cv.id,   
        name=cv.name,               
        uploaded_at=cv.uploaded_at,                   
        file_id=cv.file_id,   
        pdf_file_id=cv.pdf_file_id,   
        file_original_filename=cv.original_filename,   
        file_extension=cv.extension,                   
        file_s3_key=str(cv.s3_key),                   
        pdf_file_original_filename=cv.pdf_original_filename,                   
        pdf_file_s3_key=str(cv.pdf_s3_key),                   
        pdf_file_extension=cv.pdf_extension,
    )
