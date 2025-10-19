"""file add endpoint for uploading files to S3 and saving records to database."""
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ats.libs.s3 import upload_file_to_s3
from ats.database import get_async_db
from ats.orm.file import File as FileModel, CVFile
from ats.libs.jwt import get_current_user_from_token

router = APIRouter(prefix="", tags=["cv"])


class AddCVResponse(BaseModel):
    """Response model for CV add endpoint."""
    cv_id: int
    file_id: int
    s3_key: str


@router.post("/cv/add")
async def add_cv(
    request: Request,
    file: UploadFile = File(...),
    name: str | None = None,
    session: AsyncSession = Depends(get_async_db)
) -> AddCVResponse:
    """
    Add a CV file to S3 and save record in database.
    
    Args:
        file: The CV file to upload
        name: Optional name for the CV (defaults to filename without extension)
        session: Database session dependency
        
    Returns:
        AddCVResponse with CV ID, file ID, S3 key, and success message
    """

    current_user = get_current_user_from_token(request)

    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Read file content
        content = await file.read()
        content_type = file.content_type or "application/octet-stream"
        filename = file.filename
        
        # Generate CV name if not provided
        if not name:
            name = Path(filename).stem
        
        # Upload file to S3
        s3_key = await upload_file_to_s3(filename, content, content_type)
        
        # Create File record in database
        file_record = FileModel(
            original_filename=filename,
            extension=Path(filename).suffix.lower(),
            s3_key=s3_key,
            content_type=content_type,
            file_size=len(content)
        )
        
        session.add(file_record)
        await session.flush()  # Flush to get the file ID
        
        # Create CV record in database
        cv_record = CVFile(
            user_id=current_user.id,
            file_id=file_record.id
        )
        
        session.add(cv_record)
        await session.commit()
        
        # Refresh to get the actual ID values
        await session.refresh(file_record)
        await session.refresh(cv_record)
        
        return AddCVResponse(
            cv_id=cv_record.id,
            file_id=file_record.id,
            s3_key=s3_key,
        )
    
    finally:
        await file.close()
