"""
Authentication Schemas
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response (without password)."""

    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRegisterResponse(BaseModel):
    """Schema for registration response."""

    id: int
    email: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: int  # user_id
    exp: datetime
