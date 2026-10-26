
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pwdlib import PasswordHash


from database import engine, Base, SessionLocal
import models
from schemas import (
    StudentRegister,
    StudentResponse,
    EmployeeRegister,
    EmployeeResponse,
    LoginRequest,
    LoginResponse,
    EmployeeStatusUpdate
)
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

import jwt


load_dotenv()
app = FastAPI(title="Job Portal API")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)


password_hash = PasswordHash.recommended()


JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

if not JWT_SECRET_KEY or JWT_SECRET_KEY == "replace_this_with_a_random_secret":
    raise ValueError("Set a strong JWT_SECRET_KEY in .env")


def create_access_token(user_id: int, role: str):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm="HS256",
    )


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=["HS256"],
        )

        user_id = int(payload["sub"])
        role = payload["role"]

    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if role == "admin":
        user = db.query(models.Admin).filter(
            models.Admin.id == user_id
        ).first()

    elif role == "employee":
        user = db.query(models.Employee).filter(
            models.Employee.id == user_id
        ).first()

    elif role == "student":
        user = db.query(models.Student).filter(
            models.Student.id == user_id
        ).first()

    else:
        raise HTTPException(
            status_code=401,
            detail="Invalid user role",
        )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User account not found",
        )

    if role != "admin" and user.status != "Active":
        raise HTTPException(
            status_code=403,
            detail="Your account is not approved",
        )

    return user


def require_admin(
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Admin):
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return current_user


def create_default_admin():
    db = SessionLocal()

    try:
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        admin_name = os.getenv("ADMIN_NAME", "System Admin")

        if not admin_email or not admin_password:
            raise ValueError(
                "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env"
            )

        existing_admin = (
            db.query(models.Admin)
            .filter(models.Admin.email == admin_email)
            .first()
        )

        if existing_admin:
            print("Default Admin already exists.")
            return

        admin = models.Admin(
            full_name=admin_name,
            email=admin_email,
            hashed_password=password_hash.hash(admin_password),
            status="Active",
        )

        db.add(admin)
        db.commit()
        print("Default Admin created successfully!")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()





create_default_admin()


@app.get("/")
def home():
    return {"message": "Job Portal API is running!"}


@app.post(
    "/students/register",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_student(
    student: StudentRegister,
    db: Session = Depends(get_db),
):
    existing_student = (
        db.query(models.Student)
        .filter(models.Student.email == student.email)
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    new_student = models.Student(
        full_name=student.full_name,
        email=student.email,
        phone=student.phone,
        date_of_birth=student.date_of_birth,
        gender=student.gender,
        address=student.address,
        qualification=student.qualification,
        department=student.department,
        year_of_passing=student.year_of_passing,
        skills=student.skills,
        hashed_password=password_hash.hash(student.password),
    )

    try:
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A student with these details already exists",
        )

    return new_student


@app.post(
    "/employees/register",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_employee(
    employee: EmployeeRegister,
    db: Session = Depends(get_db),
):
    existing_employee = (
        db.query(models.Employee)
        .filter(models.Employee.email == employee.email)
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    new_employee = models.Employee(
        full_name=employee.full_name,
        email=employee.email,
        phone=employee.phone,
        designation=employee.designation,
        hashed_password=password_hash.hash(employee.password),
    )

    try:
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with these details already exists",
        )

    return new_employee


@app.post("/auth/admin/login", response_model=LoginResponse)
def admin_login(login_data: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(models.Admin).filter(
        models.Admin.email == login_data.email
    ).first()

    if not admin or not password_hash.verify(
        login_data.password, admin.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if admin.status != "Active":
        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )

    token = create_access_token(admin.id, "admin")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "admin"
    }


@app.post("/auth/employee/login", response_model=LoginResponse)
def employee_login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    employee = db.query(models.Employee).filter(
        models.Employee.email == login_data.email
    ).first()

    if not employee or not password_hash.verify(
        login_data.password, employee.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if employee.status != "Active":
        raise HTTPException(
            status_code=403,
            detail=f"Your account status is {employee.status}. Access denied.",
        )

    token = create_access_token(employee.id, "employee")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "employee",
    }



@app.get("/auth/me")
def get_my_account(
    current_user=Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
    }


@app.get("/admin/dashboard")
def admin_dashboard(
    admin=Depends(require_admin),
):
    return {
        "message": "Welcome to Admin Dashboard",
        "admin_name": admin.full_name,
    }


@app.get("/admin/employees/pending")
def get_pending_employees(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Pending"
    ).all()

    return [
        {
            "id": employee.id,
            "full_name": employee.full_name,
            "email": employee.email,
            "phone": employee.phone,
            "designation": employee.designation,
            "status": employee.status,
        }
        for employee in employees
    ]


@app.patch("/admin/employees/{employee_id}/status")
def update_employee_status(
    employee_id: int,
    status_data: EmployeeStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    employee = db.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    employee.status = status_data.status
    db.commit()
    db.refresh(employee)

    return {
        "message": f"Employee status updated to {employee.status}",
        "employee_id": employee.id,
        "status": employee.status,
    }



