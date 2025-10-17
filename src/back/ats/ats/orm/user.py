from sqlalchemy import Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import List, Optional
from datetime import datetime
from .base import Base


class UserRole(Enum):
    """Enum for user roles in the system"""
    ADMIN = "admin"           # Администратор ОЭЗ
    HR = "hr"                 # HR компании  
    UNIVERSITY = "university" # Представитель вуза
    CANDIDATE = "candidate"   # Соискатель


class User(Base):
    """User model representing users in the system"""
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    telegram: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to user roles
    roles: Mapped[List["UserRoleAssociation"]] = relationship("UserRoleAssociation", back_populates="user")


class UserRoleAssociation(Base):
    """Association table for user roles (many-to-many relationship)"""
    __tablename__ = "user_roles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole))
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="roles")
    