
from sqlalchemy import Column, Integer, String, Date , Text, ForeignKey, DateTime, func
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


