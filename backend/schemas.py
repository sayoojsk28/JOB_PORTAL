
from datetime import date ,datetime

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
    profile_photo: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class EmployeeStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Active|Rejected)$")



class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10)
    qualification: str = Field(min_length=2, max_length=150)
    department: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=150)
    salary: str | None = None
    employment_type: str = Field(min_length=2, max_length=50)
    vacancies: int = Field(ge=1)


class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    qualification: str
    department: str
    location: str
    salary: str | None
    employment_type: str
    vacancies: int
    status: str
    created_by: int

    class Config:
        from_attributes = True

class AdminChangePassword(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    industry: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1, max_length=500)
    website: str | None = None
    contact_number: str = Field(..., min_length=1, max_length=20)
    email: EmailStr
    size: str | None = Field(default=None, max_length=50)
    description: str | None = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    industry: str
    address: str
    website: str | None
    contact_number: str
    email: str
    size: str | None
    description: str | None
    logo: str | None
    is_active: str
    created_at: datetime

    class Config:
        from_attributes = True

class VacancyCreate(BaseModel):
    company_id: int = Field(ge=1)
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10)
    required_skills: str = Field(min_length=1, max_length=1000)
    qualification: str = Field(min_length=2, max_length=150)
    location: str = Field(min_length=2, max_length=150)
    salary_range: str | None = Field(default=None, max_length=100)
    employment_type: str = Field(min_length=2, max_length=50)
    openings: int = Field(ge=1)


class VacancyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    title: str
    description: str
    required_skills: str
    qualification: str
    location: str
    salary_range: str | None
    employment_type: str
    openings: int
    status: str
    created_by: int
    created_at: datetime


class ApplicationCreate(BaseModel):
    vacancy_id: int
    resume_id: int

