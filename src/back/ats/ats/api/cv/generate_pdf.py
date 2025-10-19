"""CV PDF generation endpoint for converting CV files to PDF and saving to database."""

import aiohttp
import tempfile
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ats.database import get_async_db
from ats.orm.file import File, CVFile
from ats.libs.s3 import download_file_from_s3, upload_file_to_s3
from ats.config import settings

router = APIRouter(prefix="", tags=["cv"])


class GeneratePDFResponse(BaseModel):
    """Response model for CV PDF generation."""
    cv_id: int
    pdf_file_id: int
    pdf_s3_key: str


async def convert_to_pdf_with_gotenberg(file_path: str, original_filename: str) -> str:
    """Convert a document to PDF using Gotenberg.
    
    Args:
        file_path: Path to the local file to convert
        original_filename: Original filename for the converted file
        
    Returns:
        Path to the converted PDF file
    """
    # Create output filename with .pdf extension
    output_path = tempfile.mktemp(suffix=".pdf")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Prepare the form data
            with open(file_path, 'rb') as file:
                form_data = aiohttp.FormData()
                form_data.add_field('files', file, filename=original_filename)
                
                # Make the request to Gotenberg
                async with session.post(
                    f"{settings.GOTENBERG_URL}/forms/libreoffice/convert",
                    data=form_data
                ) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=500, 
                            detail=f"Gotenberg conversion failed with status {response.status}"
                        )
                    
                    # Save the converted PDF
                    with open(output_path, 'wb') as pdf_file:
                        async for chunk in response.content.iter_chunked(8192):
                            pdf_file.write(chunk)
                    
                    return output_path
    except aiohttp.ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Gotenberg: {str(e)}")


@router.post("/cv/generate-pdf/{file_id}", response_model=GeneratePDFResponse)
async def generate_pdf_for_cv(
    cv_id: int,
    session: AsyncSession = Depends(get_async_db)
) -> GeneratePDFResponse:
    """Generate PDF for a file and save it to the database.
    
    Args:
        file_id: The ID of the file to generate PDF for
        session: Database session dependency
        
    Returns:
        GeneratePDFResponse with PDF file information
        
    Raises:
        HTTPException: If file not found, file conversion fails, or database operation fails
    """
    # Get file from database
    result = await session.execute(
        select(
            CVFile,
            File,
        ).join(
            File,
            CVFile.file_id == File.id
        ).where(CVFile.id == cv_id)
    )
    cv_data, original_file = result.one()
    
    if not cv_data:
        raise HTTPException(status_code=404, detail="CV not found")
    
    
    # Check if PDF already exists
    if cv_data.pdf_file_id:
        # Get existing PDF file info
        pdf_result = await session.execute(
            select(File).where(File.id == cv_data.pdf_file_id)
        )
        pdf_file = pdf_result.scalar_one_or_none()
        
        if pdf_file:
            return GeneratePDFResponse(
                file_id=cv_data.file_id,
                pdf_file_id=pdf_file.id,
                pdf_s3_key=str(pdf_file.s3_key),
            )
    
    # Download original file from S3
    local_file_path, original_filename = await download_file_from_s3(str(original_file.s3_key))
    file_extension = original_filename.split(".")[-1].lower()
    
    try:
        # If already PDF, just link the existing file as PDF
        if file_extension == "pdf":
            # Update CV with existing file as PDF
            cv_data.pdf_file_id = cv_data.id
            # Commit the transaction
            await session.commit()
            
            return GeneratePDFResponse(
                file_id=cv_data.file_id,
                pdf_file_id=cv_data.pdf_file_id,
                pdf_s3_key=str(cv_data.s3_key),
            )
        else:
            # Check if file type is supported for conversion
            if file_extension in ("doc", "docx", "rtf"):
                pdf_file_path = await convert_to_pdf_with_gotenberg(local_file_path, original_filename)
                
                # Upload converted PDF to S3
                with open(pdf_file_path, "rb") as pdf_file:
                    pdf_content = pdf_file.read()
                
                # Generate new S3 key for the converted PDF
                pdf_filename = Path(original_filename).stem + ".pdf"
                uploaded_s3_key = await upload_file_to_s3(pdf_filename, pdf_content, "application/pdf")
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file extension: {file_extension}")
        
        # Create new File record for the PDF
        pdf_file = File(
            original_filename=pdf_filename,
            extension="pdf",
            s3_key=uploaded_s3_key,
            content_type="application/pdf",
            file_size=len(pdf_content)
        )
        
        session.add(pdf_file)
        await session.flush()  # Get the ID of the new file
        
        # Update CV with PDF file ID
        original_file.pdf_file_id = pdf_file.id
        
        # Commit the transaction
        await session.commit()
        
        return GeneratePDFResponse(
            file_id=original_file.id,
            pdf_file_id=pdf_file.id,
            pdf_s3_key=uploaded_s3_key,
        )
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
        
    finally:
        # Clean up temporary files
        if os.path.exists(local_file_path):
            os.unlink(local_file_path)
        if 'pdf_file_path' in locals() and os.path.exists(pdf_file_path):
            os.unlink(pdf_file_path)
