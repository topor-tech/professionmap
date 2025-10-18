from sqlalchemy import Integer, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from enum import Enum
from datetime import datetime
from typing import Optional
from .base import Base


class VacancyStatus(Enum):
    """Enum for vacancy status"""
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    ON_REVIEW = "ON_REVIEW"


class Vacancy(Base):
    """Vacancy model representing job vacancies in the system"""
    __tablename__ = "vacancies"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[VacancyStatus] = mapped_column(SQLEnum(VacancyStatus), default=VacancyStatus.ON_REVIEW)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
        