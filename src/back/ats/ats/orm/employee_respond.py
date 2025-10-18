from sqlalchemy import Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional
from datetime import datetime
from .base import Base


class EmployeeRespondStatus(Enum):
    """Enum for employee respond status"""
    PENDING = "pending"       # Ожидает рассмотрения
    REJECTED = "rejected"     # Отклонено
    INTERVIEW_PENDING = "interview_pending"    
    JOB_OFFER = "job_offer"
    JOB_ACCEPTED = "job_accepted"


class EmployeeRespond(Base):
    """Employee respond model representing job applications in the system"""
    __tablename__ = "employee_responds"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[EmployeeRespondStatus] = mapped_column(SQLEnum(EmployeeRespondStatus), default=EmployeeRespondStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
