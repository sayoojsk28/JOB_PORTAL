
from datetime import date

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class StudentRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    date_of_birth: date
    gender: str = Field(min_length=1, max_length=20)
    address: str = Field(min_length=5, max_length=500)
    qualification: str = Field(min_length=2, max_length=100)
    department: str = Field(min_length=2, max_length=100)
    year_of_passing: int = Field(ge=1950, le=2100)
    skills: str = Field(min_length=1, max_length=1000)
    password: str = Field(min_length=8, max_length=128)


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str
    qualification: str
    department: str
    year_of_passing: int


class EmployeeRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    designation: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str
    designation: str
    status: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class EmployeeStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Active|Rejected)$")


