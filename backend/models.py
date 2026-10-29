
from sqlalchemy import Column, Integer, String, Date , Text,BigInteger, ForeignKey, DateTime, func
from sqlalchemy import text
from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    address = Column(String(500), nullable=False)
    qualification = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    year_of_passing = Column(Integer, nullable=False)
    skills = Column(String(1000), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    status = Column(String(20),nullable=False,default="Pending",server_default=text("'Pending'"))


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    designation = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default="Pending",
        server_default=text("'Pending'")
    )
    profile_photo = Column(String(255), nullable=True)

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default="Active",
        server_default=text("'Active'")
    )


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    qualification = Column(String, nullable=False)
    department = Column(String, nullable=False)
    location = Column(String, nullable=False)
    salary = Column(String, nullable=True)
    employment_type = Column(String, nullable=False)
    vacancies = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="Open")
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=False)
    address = Column(String(500), nullable=False)
    website = Column(String(255), nullable=True)
    contact_number = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    size = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    logo = Column(String(255), nullable=True)

    is_active = Column(
        String(20),
        nullable=False,
        default="waiting",
        server_default=text("'waiting'")
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(
        Integer,
        ForeignKey("companies.id"),
        nullable=False,
        index=True
    )

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(String(1000), nullable=False)
    qualification = Column(String(150), nullable=False)
    location = Column(String(150), nullable=False)
    salary_range = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=False)
    openings = Column(Integer, nullable=False, default=1)

    status = Column(
        String(20),
        nullable=False,
        default="Open",
        server_default=text("'Open'")
    )

    created_by = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class Resume(Base):
    __tablename__ = "resumes"

    resume_id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
    )

    file_type = Column(String(100), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_path = Column(String(500), nullable=False)

    uploaded_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    is_active = Column(
        String(20),
        nullable=False,
        default="active",
        server_default=text("'active'"),
    )


class Application(Base):
    __tablename__ = "applications"

    application_id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True,
    )

    vacancy_id = Column(
        Integer,
        ForeignKey("vacancies.id"),
        nullable=False,
        index=True,
    )

    resume_id = Column(
        Integer,
        ForeignKey("resumes.resume_id"),
        nullable=False,
        index=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="Not Sent",
        server_default=text("'Not Sent'"),
    )

    applied_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

