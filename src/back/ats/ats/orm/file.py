"""File model for storing file metadata."""

from datetime import datetime
from typing import Optional
from uuid import UUID as UUIDType

from sqlalchemy import DateTime, Integer, String, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class File(Base):
    """Model for storing file metadata and information."""
    
    __tablename__ = "files"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    extension: Mapped[str] = mapped_column(String(10), nullable=False)
    s3_key: Mapped[UUIDType] = mapped_column(String, nullable=False)  # Using String for UUID storage
    content_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    

class CVFile(Base):
    """Model for storing CV file metadata and information."""
    
    __tablename__ = "cv_filse"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    file_id: Mapped[int] = mapped_column(ForeignKey("files.id"))
    pdf_file_id: Mapped[Optional[int]] = mapped_column(ForeignKey("files.id"), nullable=True)
