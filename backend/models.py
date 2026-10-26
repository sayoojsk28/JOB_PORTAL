
from sqlalchemy import Column, Integer, String, Date
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


