
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status,BackgroundTasks

from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pwdlib import PasswordHash
from sqlalchemy.dialects.postgresql import insert as pg_insert
import re


from database import engine, Base, SessionLocal
import models
from schemas import (
    StudentRegister,
    StudentResponse,
    EmployeeRegister,
    EmployeeResponse,
    LoginRequest,
    LoginResponse,
    EmployeeStatusUpdate,
    JobCreate, 
    JobResponse,
    AdminChangePassword,
    CompanyCreate, 
    CompanyResponse,
    VacancyCreate,
    VacancyResponse,
    ApplicationCreate,
    InterviewCreate,
    InterviewResponse,
    InterviewAttendanceUpdate,
    InterviewResultResponse,
    InterviewResultCreate,
    StudentInterviewResultResponse,
    AnnouncementCreate,
    StudentFeedbackCreate,
    EmployeeAnnouncementCreate,
    TrainingCourseCreate,
)
import os
import uuid
from fastapi import File, Form, UploadFile
from pydantic import EmailStr,BaseModel, Field
from chatbot.rag_service import answer_question
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from fastapi.staticfiles import StaticFiles
from fastapi import Body
from pathlib import Path
from datetime import date
import jwt
from fastapi import Query
from training_generator import generate_part_one
os.makedirs("uploads/employee_photos", exist_ok=True)


load_dotenv()
app = FastAPI(title="Job Portal API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
TRAINING_DOCUMENTS_DIR = os.path.join(BASE_DIR, "training_documents")
os.makedirs(TRAINING_DOCUMENTS_DIR, exist_ok=True)
COMPANY_LOGOS_DIR = os.path.join(UPLOADS_DIR, "company_logos")
os.makedirs(COMPANY_LOGOS_DIR, exist_ok=True)

os.makedirs(os.path.join(UPLOADS_DIR, "employee_photos"), exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "resumes"), exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_DIR),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def log_action(
    db: Session,
    user_id: int | None,
    action: str,
    target_type: str | None = None,
    target_id: int | None = None,
    details: str | None = None,
    ip_address: str | None = None,
):
    audit_log = models.AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip_address,
    )

    db.add(audit_log)
def get_student_rejection_count(
    db: Session,
    student_id: int
) -> int:

    # Find the latest completed training cycle
    last_completed_at = (
        db.query(
            func.max(models.TrainingEnrollment.completed_at)
        )
        .filter(
            models.TrainingEnrollment.student_id == student_id,
            models.TrainingEnrollment.completed_at.isnot(None)
        )
        .scalar()
    )

    # Count distinct rejected applications
    query = (
        db.query(
            func.count(
                func.distinct(models.Application.application_id)
            )
        )
        .join(
            models.Interview,
            models.Interview.application_id
            == models.Application.application_id
        )
        .join(
            models.InterviewResult,
            models.InterviewResult.interview_id
            == models.Interview.interview_id
        )
        .filter(
            models.Application.student_id == student_id,
            models.InterviewResult.result == "Rejected",
            models.InterviewResult.is_published.is_(True)
        )
    )

    # For subsequent cycles, count only applications
    # submitted after the previous training completion
    if last_completed_at is not None:
        query = query.filter(
            models.Application.applied_at > last_completed_at
        )

    return query.scalar() or 0

def create_training_eligibility_if_eligible(
    db: Session,
    student_id: int
):
    # 1. Get the student
    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    if not student:
        return False

    # 2. Placed students are not eligible
    if student.is_placed:
        return False

    # 3. Check published rejected applications
    rejection_count = get_student_rejection_count(
        db,
        student_id
    )

    if rejection_count < 3:
        return False

    # 4. Find the latest completed training cycle
    latest_completed_cycle = (
        db.query(models.TrainingEligibility.cycle_number)
        .join(
            models.TrainingEnrollment,
            models.TrainingEnrollment.eligibility_id
            == models.TrainingEligibility.id
        )
        .filter(
            models.TrainingEnrollment.student_id == student_id,
            models.TrainingEnrollment.completed_at.isnot(None)
        )
        .order_by(
            models.TrainingEnrollment.completed_at.desc(),
            models.TrainingEnrollment.id.desc()
        )
        .first()
    )

    cycle_number = (
        latest_completed_cycle[0] + 1
        if latest_completed_cycle
        else 1
    )

    # 5. Create eligibility without allowing duplicates
    eligibility_id = db.execute(
        pg_insert(models.TrainingEligibility)
        .values(
            student_id=student_id,
            rejected_application_count=rejection_count,
            cycle_number=cycle_number,
            status="Pending"
        )
        .on_conflict_do_nothing(
            constraint="uq_training_eligibility_student_cycle"
        )
        .returning(models.TrainingEligibility.id)
    ).scalar_one_or_none()

    # Already exists for this cycle
    if eligibility_id is None:
        return False

    # 6. Get all employees
    employee_ids = [
        employee_id
        for (employee_id,) in db.query(
            models.Employee.id
        ).all()
    ]

    # 7. Create one notification per employee
    if employee_ids:
        db.execute(
            pg_insert(models.EmployeeNotification)
            .values([
                {
                    "employee_id": employee_id,
                    "training_eligibility_id": eligibility_id,
                    "message": (
                        f"{student.full_name} has reached "
                        f"{rejection_count} published rejected "
                        f"applications and is eligible for training review."
                    )
                }
                for employee_id in employee_ids
            ])
            .on_conflict_do_nothing(
                constraint="uq_employee_training_notification"
            )
        )

    return True

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

    # Find the common user account
    user = (
        db.query(models.User)
        .filter(models.User.user_id == user_id)
        .first()
    )

    if not user or user.role != role:
        raise HTTPException(
            status_code=401,
            detail="User account not found",
        )

    # Check common account status
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is not approved",
        )

    # Fetch the corresponding profile
    if role == "admin":
        profile = db.query(models.Admin).filter(
            models.Admin.user_id == user.user_id
        ).first()

    elif role == "employee":
        profile = db.query(models.Employee).filter(
            models.Employee.user_id == user.user_id
        ).first()

    elif role == "student":
        profile = db.query(models.Student).filter(
            models.Student.user_id == user.user_id
        ).first()

    else:
        raise HTTPException(
            status_code=401,
            detail="Invalid user role",
        )

    if not profile:
        raise HTTPException(
            status_code=401,
            detail="User profile not found",
        )

    return profile



def require_admin(
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Admin):
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return current_user

def require_employee(
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Employee access required",
        )

    return current_user


def require_student(
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Student):
        raise HTTPException(
            status_code=403,
            detail="Student access required",
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

        # Check whether the admin already exists
        existing_user = (
            db.query(models.User)
            .filter(models.User.email == admin_email)
            .first()
        )

        if existing_user:
            if existing_user.role != "admin":
                raise ValueError(
                    "ADMIN_EMAIL is already registered with another role"
                )

            existing_admin = (
                db.query(models.Admin)
                .filter(models.Admin.user_id == existing_user.user_id)
                .first()
            )

            if not existing_admin:
                raise ValueError(
                    "Admin user exists, but admin profile is missing"
                )

            print("Default Admin already exists.")
            return

        # Hash password once for both tables
        hashed_password = password_hash.hash(admin_password)

        # Create central user account
        new_user = models.User(
            name=admin_name,
            email=admin_email,
            password_hash=hashed_password,
            role="admin",
            is_active=True,
        )

        db.add(new_user)
        db.flush()

        # Create admin profile linked to the user
        new_admin = models.Admin(
            user_id=new_user.user_id,
            full_name=admin_name,
            email=admin_email,
            hashed_password=hashed_password,
            status="Active",
        )

        db.add(new_admin)
        db.commit()

        print("Default Admin created successfully!")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()




class ChatbotQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=1000)

# @app.post("/test-audit-log")
# def test_audit_log(db: Session = Depends(get_db)):
#     log_action(
#         db=db,
#         user_id=1,
#         action="TEST_AUDIT_LOG",
#         target_type="system",
#         target_id=1,
#         details="Testing audit log insertion",
#     )

#     db.commit()

#     return {"message": "Audit log created successfully"}

create_default_admin()


@app.get("/")
def home():
    return {"message": "Job Portal API is running!"}


@app.post(
    "/students/register",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)


async def register_student(
    full_name: str = Form(..., min_length=2, max_length=100),
    email: EmailStr = Form(...),
    phone: str = Form(..., min_length=7, max_length=20),
    date_of_birth: date = Form(...),
    gender: str = Form(..., min_length=1, max_length=20),
    address: str = Form(..., min_length=5, max_length=500),
    qualification: str = Form(..., min_length=2, max_length=100),
    department: str = Form(..., min_length=2, max_length=100),
    year_of_passing: int = Form(..., ge=1950, le=2100),
    skills: str = Form(..., min_length=1, max_length=1000),
    password: str = Form(..., min_length=8, max_length=128),
    profile_photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # Validate photo format
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
    }

    if profile_photo.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG and PNG images are allowed",
        )

    # Read and validate photo size (maximum 5 MB)
    photo_data = await profile_photo.read()

    if len(photo_data) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Profile photo must be smaller than 5 MB",
        )

    if not photo_data:
        raise HTTPException(
            status_code=400,
            detail="Profile photo is required",
        )

    # Create a unique filename
    extension = allowed_types[profile_photo.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"

    upload_dir = Path(__file__).resolve().parent / "uploads" / "student_profiles"
    upload_dir.mkdir(parents=True, exist_ok=True)

    photo_path = upload_dir / filename
    relative_photo_path = f"uploads/student_profiles/{filename}"

    # Save photo
    photo_path.write_bytes(photo_data)

    hashed_password = password_hash.hash(password)

    new_user = models.User(
        name=full_name,
        email=email,
        password_hash=hashed_password,
        role="student",
        is_active=False,
    )

    try:
        db.add(new_user)
        db.flush()

        new_student = models.Student(
            user_id=new_user.user_id,
            full_name=full_name,
            email=email,
            phone=phone,
            date_of_birth=date_of_birth,
            gender=gender,
            address=address,
            qualification=qualification,
            department=department,
            year_of_passing=year_of_passing,
            skills=skills,
            hashed_password=hashed_password,
            profile_photo=relative_photo_path,
        )

        db.add(new_student)
        db.commit()
        db.refresh(new_student)

    except IntegrityError:
        db.rollback()
        photo_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    except Exception:
        db.rollback()
        photo_path.unlink(missing_ok=True)
        raise

    return new_student


@app.post(
    "/employees/register",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_employee(
    full_name: str = Form(..., min_length=2, max_length=100),
    email: EmailStr = Form(...),
    phone: str = Form(..., min_length=7, max_length=20),
    designation: str = Form(..., min_length=2, max_length=100),
    password: str = Form(..., min_length=8, max_length=128),
    profile_photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    photo_path = None

    if profile_photo and profile_photo.filename:
        allowed_types = {"image/jpeg", "image/png", "image/webp"}

        if profile_photo.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG, and WEBP images are allowed",
            )

        extension = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }[profile_photo.content_type]

        os.makedirs("uploads/employee_photos", exist_ok=True)

        filename = f"{uuid.uuid4().hex}{extension}"
        photo_path = f"uploads/employee_photos/{filename}"

        try:
            with open(photo_path, "wb") as image_file:
                image_file.write(profile_photo.file.read())
        finally:
            profile_photo.file.close()

    hashed_password = password_hash.hash(password)

    new_user = models.User(
        name=full_name,
        email=email,
        password_hash=hashed_password,
        role="employee",
        is_active=False,
    )

    try:
        db.add(new_user)
        db.flush()

        new_employee = models.Employee(
            user_id=new_user.user_id,
            full_name=full_name,
            email=email,
            phone=phone,
            designation=designation,
            hashed_password=hashed_password,
            profile_photo=photo_path,
        )

        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)

    except IntegrityError:
        db.rollback()

        if photo_path and os.path.exists(photo_path):
            os.remove(photo_path)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    return new_employee


@app.post("/auth/admin/login", response_model=LoginResponse)
def admin_login(login_data: LoginRequest, db: Session = Depends(get_db)):

    user = (
        db.query(models.User)
        .filter(
            models.User.email == login_data.email,
            models.User.role == "admin"
        )
        .first()
    )

    # Failed login
    if not user or not password_hash.verify(
        login_data.password, user.password_hash
    ):
        log_action(
            db=db,
            user_id=user.user_id if user else None,
            action="LOGIN_FAILED",
            target_type="user",
            target_id=user.user_id if user else None,
            details="Admin login failed: Invalid credentials",
        )
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Inactive account
    if not user.is_active:
        log_action(
            db=db,
            user_id=user.user_id,
            action="LOGIN_BLOCKED",
            target_type="user",
            target_id=user.user_id,
            details="Admin login blocked: Account inactive",
        )
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )

    # Successful login
    user.last_login = datetime.now(timezone.utc)

    log_action(
        db=db,
        user_id=user.user_id,
        action="LOGIN_SUCCESS",
        target_type="user",
        target_id=user.user_id,
        details="Admin logged in successfully",
    )

    db.commit()

    token = create_access_token(user.user_id, "admin")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "admin"
    }


@app.post("/auth/admin/change-password")
def change_admin_password(
    password_data: AdminChangePassword,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    new_password = password_data.new_password

    # Password length validation
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long",
        )

    # Uppercase letter validation
    if not re.search(r"[A-Z]", new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter",
        )

    # Number validation
    if not re.search(r"[0-9]", new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number",
        )

    # Special character validation
    if not re.search(r"[^A-Za-z0-9\s]", new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character",
        )

    # Verify current password
    if not password_hash.verify(
        password_data.current_password,
        admin.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    # Ensure new password is different
    if password_data.current_password == new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )

    user = db.query(models.User).filter(
        models.User.user_id == admin.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Associated user account not found",
        )

    # Hash and update password
    new_hashed_password = password_hash.hash(new_password)

    admin.hashed_password = new_hashed_password
    user.password_hash = new_hashed_password

    db.commit()
    db.refresh(admin)

    return {
        "message": "Password changed successfully"
    }


@app.post("/auth/employee/login", response_model=LoginResponse)
def employee_login(login_data: LoginRequest, db: Session = Depends(get_db)):

    user = (
        db.query(models.User)
        .filter(
            models.User.email == login_data.email,
            models.User.role == "employee"
        )
        .first()
    )

    # Failed login
    if not user or not password_hash.verify(
        login_data.password, user.password_hash
    ):
        log_action(
            db=db,
            user_id=user.user_id if user else None,
            action="LOGIN_FAILED",
            target_type="user",
            target_id=user.user_id if user else None,
            details="Employee login failed: Invalid credentials",
        )
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Inactive account
    if not user.is_active:
        log_action(
            db=db,
            user_id=user.user_id,
            action="LOGIN_BLOCKED",
            target_type="user",
            target_id=user.user_id,
            details="Employee login blocked: Account inactive",
        )
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Your account is not approved"
        )

    # Successful login
    user.last_login = datetime.now(timezone.utc)

    log_action(
        db=db,
        user_id=user.user_id,
        action="LOGIN_SUCCESS",
        target_type="user",
        target_id=user.user_id,
        details="Employee logged in successfully",
    )

    db.commit()

    token = create_access_token(user.user_id, "employee")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "employee"
    }



@app.post("/auth/student/login", response_model=LoginResponse)
def student_login(login_data: LoginRequest, db: Session = Depends(get_db)):

    user = (
        db.query(models.User)
        .filter(
            models.User.email == login_data.email,
            models.User.role == "student"
        )
        .first()
    )

    # Failed login
    if not user or not password_hash.verify(
        login_data.password, user.password_hash
    ):
        log_action(
            db=db,
            user_id=user.user_id if user else None,
            action="LOGIN_FAILED",
            target_type="user",
            target_id=user.user_id if user else None,
            details="Student login failed: Invalid credentials",
        )
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Inactive account
    if not user.is_active:
        log_action(
            db=db,
            user_id=user.user_id,
            action="LOGIN_BLOCKED",
            target_type="user",
            target_id=user.user_id,
            details="Student login blocked: Account inactive",
        )
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Your account is not approved"
        )

    # Successful login
    user.last_login = datetime.now(timezone.utc)

    log_action(
        db=db,
        user_id=user.user_id,
        action="LOGIN_SUCCESS",
        target_type="user",
        target_id=user.user_id,
        details="Student logged in successfully",
    )

    db.commit()

    token = create_access_token(user.user_id, "student")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student"
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
            "profile_photo": (
            f"/{employee.profile_photo}"
            if employee.profile_photo
            else None
            ),
            "status": employee.status,
        }
        for employee in employees
    ]


@app.get("/admin/employees")
def get_active_employees(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    employees = db.query(models.Employee).filter(
        models.Employee.status == "Active"
    ).all()

    return [
        {
            "id": employee.id,
            "full_name": employee.full_name,
            "email": employee.email,
            "phone": employee.phone,
            "designation": employee.designation,
            "profile_photo": (
            f"/{employee.profile_photo}"
            if employee.profile_photo
            else None
            ),
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

    user = db.query(models.User).filter(
        models.User.user_id == employee.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Associated user account not found",
        )

    # Store previous status
    previous_status = employee.status

    employee.status = status_data.status
    user.is_active = status_data.status == "Active"

    # Log only actual status changes
    if previous_status != status_data.status:
        log_action(
            db=db,
            user_id=admin.user_id,
            action="EMPLOYEE_STATUS_UPDATED",
            target_type="employee",
            target_id=employee.id,
            details=(
                f"Employee status changed from "
                f"{previous_status} to {employee.status}"
            ),
        )

    db.commit()
    db.refresh(employee)

    return {
        "message": f"Employee status updated to {employee.status}",
        "employee_id": employee.id,
        "status": employee.status,
    }

@app.get("/admin/employees/status-history")
def get_employee_status_history(
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    employees = (
        db.query(models.Employee)
        .filter(
            models.Employee.status.in_(["Active", "Rejected"])
        )
        .order_by(models.Employee.id.desc())
        .all()
    )

    result = []

    for employee in employees:
        history = (
            db.query(models.AuditLog)
            .filter(
                models.AuditLog.target_type == "employee",
                models.AuditLog.target_id == employee.id,
                models.AuditLog.action == "EMPLOYEE_STATUS_UPDATED",
            )
            .order_by(models.AuditLog.created_at.desc())
            .all()
        )

        result.append({
            "id": employee.id,
            "full_name": employee.full_name,
            "email": employee.email,
            "phone": employee.phone,
            "designation": employee.designation,
            "status": employee.status,
            "history": [
                {
                    "action": log.action,
                    "details": log.details,
                    "changed_at": log.created_at,
                }
                for log in history
            ],
        })

    return result

@app.patch("/employee/students/{student_id}/status")
def update_student_status(
    student_id: int,
    status_data: EmployeeStatusUpdate,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    user = db.query(models.User).filter(
        models.User.user_id == student.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Associated user account not found",
        )

    # Store the previous status before updating
    previous_status = student.status

    student.status = status_data.status
    user.is_active = status_data.status == "Active"

    # Create audit log
    # Create audit log only when status actually changes
    if previous_status != status_data.status:
        log_action(
            db=db,
            user_id=employee.user_id,
            action="STUDENT_STATUS_UPDATED",
            target_type="student",
            target_id=student.id,
            details=(
            f"Student status changed from "
            f"{previous_status} to {student.status}"
        ),
    )

    db.commit()
    db.refresh(student)

    return {
        "message": f"Student status updated to {student.status}",
        "student_id": student.id,
        "status": student.status,
    }


@app.get("/employee/students/pending")
def get_pending_students(
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    students = db.query(models.Student).filter(
        models.Student.status == "Pending"
    ).all()

    return [
        {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "phone": student.phone,
            "qualification": student.qualification,
            "department": student.department,
            "year_of_passing": student.year_of_passing,
            "skills": student.skills,
            "profile_photo": student.profile_photo,
        }
        for student in students
    ]

@app.post("/employee/jobs", response_model=JobResponse, status_code=201)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    new_job = models.Job(
        **job_data.model_dump(),
        created_by=employee.id,
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return new_job

@app.get("/student/jobs", response_model=list[JobResponse])
def get_open_jobs(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    jobs = (
        db.query(models.Job)
        .filter(models.Job.status == "Open")
        .order_by(models.Job.id.desc())
        .all()
    )

    return jobs

@app.post("/chatbot/ask")
def ask_chatbot(
    payload: ChatbotQuestion,
    current_user=Depends(require_student),
):
    return answer_question(payload.question)



@app.post("/companies", response_model=CompanyResponse, status_code=201)
def create_company(
    name: str = Form(...),
    industry: str = Form(...),
    address: str = Form(...),
    contact_number: str = Form(...),
    email: EmailStr = Form(...),
    website: str | None = Form(None),
    size: str | None = Form(None),
    description: str | None = Form(None),
    logo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Only employees can register companies",
        )

    logo_path = None

    if logo and logo.filename:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        extension = allowed_types.get(logo.content_type)

        if not extension:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed",
            )

        filename = f"{uuid.uuid4().hex}{extension}"
        file_path = os.path.join(COMPANY_LOGOS_DIR, filename)

        try:
            with open(file_path, "wb") as file:
                file.write(logo.file.read())

            logo_path = f"/uploads/company_logos/{filename}"
        finally:
            logo.file.close()

    new_company = models.Company(
        name=name,
        industry=industry,
        address=address,
        website=website,
        contact_number=contact_number,
        email=str(email),
        size=size,
        description=description,
        logo=logo_path,
    )

    db.add(new_company)

    try:
        db.commit()
        db.refresh(new_company)
    except Exception:
        db.rollback()

        if logo_path:
            saved_file = os.path.join(
                COMPANY_LOGOS_DIR,
                os.path.basename(logo_path),
            )
            if os.path.exists(saved_file):
                os.remove(saved_file)

        raise HTTPException(
            status_code=500,
            detail="Could not register company",
        )

    return new_company

@app.get("/companies", response_model=list[CompanyResponse])
def get_companies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Only employees can view companies",
        )

    companies = (
        db.query(models.Company)
        .order_by(models.Company.created_at.desc())
        .all()
    )

    return companies


@app.patch("/companies/{company_id}/status", response_model=CompanyResponse)
def update_company_status(
    company_id: int,
    status: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Only employees can update company status",
        )

    allowed_statuses = {"waiting", "accepted", "rejected"}

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Status must be waiting, accepted or rejected",
        )

    company = db.query(models.Company).filter(
        models.Company.id == company_id
    ).first()

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    company.is_active = status
    db.commit()
    db.refresh(company)

    return company

@app.post(
    "/vacancies",
    response_model=VacancyResponse,
    status_code=201,
)
def create_vacancy(
    vacancy: VacancyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Only employees can post vacancies
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Only employees can post vacancies",
        )

    # Check whether the company exists
    company = db.query(models.Company).filter(
        models.Company.id == vacancy.company_id
    ).first()

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    # Only accepted companies can have vacancies
    if company.is_active != "accepted":
        raise HTTPException(
            status_code=400,
            detail="Vacancies can only be posted for accepted companies",
        )

    # Save the vacancy
    new_vacancy = models.Vacancy(
        **vacancy.model_dump(),
        created_by=current_user.id,
    )

    db.add(new_vacancy)
    db.commit()
    db.refresh(new_vacancy)

    return new_vacancy

@app.get("/vacancies", response_model=list[VacancyResponse])
def get_vacancies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Only employees can view vacancies",
        )

    vacancies = (
        db.query(models.Vacancy)
        .order_by(models.Vacancy.created_at.desc())
        .all()
    )

    return vacancies


@app.get("/student/vacancies", response_model=list[VacancyResponse])
def get_student_vacancies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not isinstance(current_user, models.Student):
        raise HTTPException(
            status_code=403,
            detail="Only students can view vacancies",
        )

    vacancies = (
        db.query(models.Vacancy)
        .order_by(models.Vacancy.created_at.desc())
        .all()
    )

    return vacancies


@app.post("/student/resumes/upload")
def upload_student_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    # 1. Allow PDF files only
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed",
        )

    # 2. Generate a unique filename
    filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(UPLOADS_DIR, "resumes", filename)

    # 3. Read and validate the file
    file_content = file.file.read()

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    # 4. Save the file
    with open(file_path, "wb") as f:
        f.write(file_content)

    # 5. Save file details in the database
    new_resume = models.Resume(
        student_id=student.id,
        file_type="application/pdf",
        file_size=len(file_content),
        file_path=f"resumes/{filename}",
        is_active="active",
    )

    try:
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
    except Exception:
        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=500,
            detail="Failed to save resume details",
        )

    return {
        "message": "Resume uploaded successfully",
        "resume_id": new_resume.resume_id,
        "file_name": filename,
        "file_size": new_resume.file_size,
        "status": new_resume.is_active,
    }


@app.post("/student/applications")
def submit_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    # 1. Check whether the vacancy exists and is open
    vacancy = (
        db.query(models.Vacancy)
        .filter(
            models.Vacancy.id == application.vacancy_id,
            models.Vacancy.status == "Open",
        )
        .first()
    )

    if not vacancy:
        raise HTTPException(
            status_code=404,
            detail="Open vacancy not found",
        )

    # 2. Check whether the resume belongs to this student
    resume = (
        db.query(models.Resume)
        .filter(
            models.Resume.resume_id == application.resume_id,
            models.Resume.student_id == student.id,
            models.Resume.is_active == "active",
        )
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Active resume not found for this student",
        )

    # 3. Create the application
    new_application = models.Application(
        student_id=student.id,
        vacancy_id=vacancy.id,
        resume_id=resume.resume_id,
        status="Not Sent",
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {
        "message": "Application submitted successfully",
        "application_id": new_application.application_id,
        "vacancy_id": new_application.vacancy_id,
        "resume_id": new_application.resume_id,
        "status": new_application.status,
    }


@app.get("/employee/applications")
def get_all_applications(
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    applications = (
        db.query(models.Application)
        .order_by(models.Application.applied_at.desc())
        .all()
    )

    result = []

    for application in applications:
        student = db.query(models.Student).filter(
            models.Student.id == application.student_id
        ).first()

        vacancy = db.query(models.Vacancy).filter(
            models.Vacancy.id == application.vacancy_id
        ).first()

        resume = db.query(models.Resume).filter(
            models.Resume.resume_id == application.resume_id
        ).first()

        company = None

        if vacancy:
            company = db.query(models.Company).filter(
                models.Company.id == vacancy.company_id
            ).first()

        result.append({
            "application_id": application.application_id,
            "student_id": application.student_id,
            "student_name": student.full_name if student else None,
            "student_email": student.email if student else None,
            "vacancy_id": application.vacancy_id,
            "vacancy_title": vacancy.title if vacancy else None,
            "company_name": company.name if company else None,
            "resume_id": resume.resume_id if resume else None,
            "resume_url": (
                f"/uploads/{resume.file_path}"
                if resume else None
            ),
            "status": application.status,
            "applied_at": application.applied_at,
        })

    return result


class ApplicationStatusUpdate(BaseModel):
    status: str


@app.patch("/employee/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    if data.status != "Sent":
        raise HTTPException(
            status_code=400,
            detail="Only the Sent status is allowed",
        )

    application = db.query(models.Application).filter(
        models.Application.application_id == application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    if application.status == "Sent":
        raise HTTPException(
            status_code=400,
            detail="Application is already marked as Sent",
        )

    vacancy = db.query(models.Vacancy).filter(
        models.Vacancy.id == application.vacancy_id
    ).first()

    if not vacancy:
        raise HTTPException(
            status_code=404,
            detail="Vacancy not found",
        )

    company = db.query(models.Company).filter(
        models.Company.id == vacancy.company_id
    ).first()

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    application.status = "Sent"

    notification = models.Notification(
        student_id=application.student_id,
        application_id=application.application_id,
        message=f"Your resume is sent to {company.name} for {vacancy.title} job role."
    )

    db.add(notification)
    db.commit()
    db.refresh(application)

    return {
        "message": "Application status updated successfully",
        "application_id": application.application_id,
        "status": application.status,
    }

@app.get("/student/notifications")
def get_student_notifications(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    notifications = (
        db.query(models.Notification)
        .filter(models.Notification.student_id == student.id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )

    return [
        {
            "notification_id": item.notification_id,
            "message": item.message,
            "is_read": item.is_read,
            "created_at": item.created_at,
        }
        for item in notifications
    ]

@app.patch("/student/notifications/read")
def mark_notifications_as_read(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    updated_count = (
        db.query(models.Notification)
        .filter(
            models.Notification.student_id == student.id,
            models.Notification.is_read == False
        )
        .update(
            {models.Notification.is_read: True},
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "message": "Notifications marked as read",
        "updated_count": updated_count
    }

@app.post("/employee/interviews", response_model=InterviewResponse)
def create_interview(
    data: InterviewCreate,
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    application = db.query(models.Application).filter(
        models.Application.application_id == data.application_id
    ).first()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    interview = models.Interview(
        application_id=data.application_id,
        interview_date=data.interview_date,
        interview_time=data.interview_time,
        mode=data.mode,
        meeting_link_or_venue=data.meeting_link_or_venue,
        notes=data.notes,
        created_by=employee.id
    )

    db.add(interview)
    notification = models.Notification(
    student_id=application.student_id,
    application_id=application.application_id,
    message=(
        f"An interview has been scheduled for your application. "
        f"Date: {data.interview_date}, "
        f"Time: {data.interview_time}, "
        f"Mode: {data.mode}."
    )
)

    db.add(notification)
    db.commit()
    db.refresh(interview)

    return interview

@app.get(
    "/employee/interviews",
    response_model=list[InterviewResponse]
)
def get_employee_interviews(
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    interviews = (
        db.query(models.Interview)
        .filter(models.Interview.created_by == employee.id)
        .order_by(models.Interview.created_at.desc())
        .all()
    )

    return interviews

@app.get("/student/interviews")
def get_student_interviews(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    interviews = (
        db.query(models.Interview)
        .join(
            models.Application,
            models.Interview.application_id
            == models.Application.application_id
        )
        .filter(
            models.Application.student_id == student.id,
            models.Interview.student_attendance == "Waiting"
        )
        .order_by(models.Interview.interview_date.asc())
        .all()
    )

    return [
        {
            "interview_id": interview.interview_id,
            "application_id": interview.application_id,
            "interview_date": interview.interview_date,
            "interview_time": interview.interview_time,
            "mode": interview.mode,
            "meeting_link_or_venue": interview.meeting_link_or_venue,
            "status": interview.status,
            "student_attendance": interview.student_attendance,
            "notes": interview.notes,
        }
        for interview in interviews
    ]

@app.patch("/student/interviews/{interview_id}/attendance")
def update_student_attendance(
    interview_id: int,
    data: InterviewAttendanceUpdate,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    interview = (
        db.query(models.Interview)
        .join(
            models.Application,
            models.Interview.application_id
            == models.Application.application_id
        )
        .filter(
            models.Interview.interview_id == interview_id,
            models.Application.student_id == student.id
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="Interview not found"
        )

    interview.student_attendance = data.student_attendance

    db.commit()
    db.refresh(interview)

    return {
        "message": "Attendance updated successfully",
        "interview_id": interview.interview_id,
        "student_attendance": interview.student_attendance
    }

@app.post(
    "/employee/interview-results",
    response_model=InterviewResultResponse
)
def create_interview_result(
    data: InterviewResultCreate,
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    interview = db.query(models.Interview).filter(
        models.Interview.interview_id == data.interview_id
    ).first()

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="Interview not found"
        )

    existing_result = db.query(models.InterviewResult).filter(
        models.InterviewResult.interview_id == data.interview_id
    ).first()

    if existing_result:
        raise HTTPException(
            status_code=400,
            detail="Result already exists for this interview"
        )

    if data.result not in ["Selected", "Rejected", "On Hold"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid result. Choose Selected, Rejected, or On Hold"
        )

    interview_result = models.InterviewResult(
        interview_id=data.interview_id,
        result=data.result,
        score=data.score,
        feedback=data.feedback
    )

    db.add(interview_result)
    db.commit()
    db.refresh(interview_result)

    return interview_result

@app.get(
    "/employee/interview-results",
    response_model=list[InterviewResultResponse]
)
def get_employee_interview_results(
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    results = (
        db.query(models.InterviewResult)
        .join(
            models.Interview,
            models.InterviewResult.interview_id
            == models.Interview.interview_id
        )
        .filter(
            models.Interview.created_by == employee.id
        )
        .order_by(models.InterviewResult.created_at.desc())
        .all()
    )

    return results



@app.patch("/employee/interview-results/{result_id}/publish")
def publish_interview_result(
    result_id: int,
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    interview_result = db.query(models.InterviewResult).filter(
        models.InterviewResult.result_id == result_id
    ).first()

    if not interview_result:
        raise HTTPException(
            status_code=404,
            detail="Interview result not found"
        )

    was_already_published = interview_result.is_published

    if not was_already_published:
        interview_result.is_published = True
        interview_result.published_on = datetime.now(timezone.utc)

        interview = db.query(models.Interview).filter(
            models.Interview.interview_id == interview_result.interview_id
        ).first()

        if not interview:
            raise HTTPException(
                status_code=404,
                detail="Interview not found"
            )

        application = db.query(models.Application).filter(
            models.Application.application_id == interview.application_id
        ).first()

        if not application:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        # Create student notification
        notification = models.Notification(
            student_id=application.student_id,
            application_id=application.application_id,
            message=(
                f"Your interview result has been published. "
                f"Result: {interview_result.result}. "
                f"Please check your Interview Results page."
            )
        )

        db.add(notification)

        if interview_result.result == "Rejected":

            # IMPORTANT: Flush pending changes before counting rejections
            db.flush()

            student = db.query(models.Student).filter(
                models.Student.id == application.student_id
            ).first()

            rejection_count = get_student_rejection_count(
                db,
                application.student_id
            )

            print("DEBUG STUDENT ID:", application.student_id)
            print("DEBUG REJECTION COUNT:", rejection_count)
            print(
                "DEBUG PLACED STATUS:",
                student.is_placed if student else "Student not found"
            )

            eligibility_created = create_training_eligibility_if_eligible(
                db,
                application.student_id
            )

            print(
                "DEBUG ELIGIBILITY CREATED:",
                eligibility_created
            )

    db.commit()
    db.refresh(interview_result)

    return {
        "message": "Interview result published successfully",
        "result_id": interview_result.result_id,
        "is_published": interview_result.is_published,
        "published_on": interview_result.published_on
    }


@app.get(
    "/student/interview-results",
    response_model=list[StudentInterviewResultResponse]
)
def get_student_interview_results(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    results = (
        db.query(
            models.InterviewResult,
            models.Interview
        )
        .join(
            models.Interview,
            models.InterviewResult.interview_id
            == models.Interview.interview_id
        )
        .join(
            models.Application,
            models.Interview.application_id
            == models.Application.application_id
        )
        .filter(
            models.Application.student_id == student.id,
            models.InterviewResult.is_published == True
        )
        .order_by(
            models.InterviewResult.published_on.desc()
        )
        .all()
    )

    return [
        {
            "result_id": result.result_id,
            "interview_id": interview.interview_id,
            "interview_date": interview.interview_date,
            "interview_time": interview.interview_time,
            "mode": interview.mode,
            "result": result.result,
            "score": result.score,
            "feedback": result.feedback,
            "published_on": result.published_on,
        }
        for result, interview in results
    ]

@app.get("/admin/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    query = db.query(models.AuditLog)

    total = query.count()

    logs = (
        query
        .order_by(models.AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    total_pages = (total + limit - 1) // limit

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@app.get("/employee/audit-logs")
def get_employee_audit_logs(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    # Validate pagination
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than 0"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100"
        )

    # Base query
    query = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == employee.user_id,
        models.AuditLog.action.in_([
            "LOGIN_SUCCESS",
            "LOGIN_FAILED",
            "LOGIN_BLOCKED",
            "STUDENT_STATUS_UPDATED",
        ])
    )

    # Total number of logs
    total = query.count()

    # Calculate total pages
    total_pages = (total + limit - 1) // limit

    # Fetch paginated logs
    logs = (
        query
        .order_by(models.AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@app.get("/admin/students/active")
def get_active_students(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    # Validate pagination values
    page = max(page, 1)
    limit = min(max(limit, 1), 100)

    # Base query: only active students
    query = db.query(models.Student).filter(
        models.Student.status == "Active"
    )

    # Search across name, email, phone and department
    search = search.strip()

    if search:
        search_pattern = f"%{search}%"

        query = query.filter(
            models.Student.full_name.ilike(search_pattern)
            | models.Student.email.ilike(search_pattern)
            | models.Student.phone.ilike(search_pattern)
            | models.Student.department.ilike(search_pattern)
        )

    # Total matching students (before pagination)
    total = query.count()

    # Calculate total pages
    total_pages = (total + limit - 1) // limit

    # Keep requested page within valid range
    page = min(page, max(total_pages, 1))

    # Fetch only the required page
    students = (
        query
        .order_by(models.Student.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "students": [
            {
                "id": student.id,
                "full_name": student.full_name,
                "email": student.email,
                "phone": student.phone,
                "qualification": student.qualification,
                "department": student.department,
                "year_of_passing": student.year_of_passing,
                "status": student.status,
            }
            for student in students
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }

@app.get("/employee/notifications")
def get_employee_notifications(
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    notifications = (
        db.query(models.EmployeeNotification)
        .filter(
            models.EmployeeNotification.employee_id == employee.id
        )
        .order_by(
            models.EmployeeNotification.created_at.desc()
        )
        .all()
    )

    return [
        {
            "notification_id": item.notification_id,
            "message": item.message,
            "is_read": item.is_read,
            "created_at": item.created_at,
        }
        for item in notifications
    ]

@app.patch("/employee/notifications/read")
def mark_employee_notifications_as_read(
    db: Session = Depends(get_db),
    employee: models.Employee = Depends(require_employee),
):
    updated_count = (
        db.query(models.EmployeeNotification)
        .filter(
            models.EmployeeNotification.employee_id == employee.id,
            models.EmployeeNotification.is_read == False
        )
        .update(
            {models.EmployeeNotification.is_read: True},
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "message": "Notifications marked as read",
        "updated_count": updated_count
    }

@app.post("/admin/announcements")
def send_announcement(
    announcement: AnnouncementCreate,
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(require_admin),
):
    message = announcement.message.strip()
    recipient_type = announcement.recipient_type

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Announcement message cannot be empty"
        )

    if len(message) > 500:
        raise HTTPException(
            status_code=400,
            detail="Announcement cannot exceed 500 characters"
        )

    if recipient_type not in ["employees", "students", "both"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid recipient type"
        )

    employee_count = 0
    student_count = 0

    if recipient_type in ["employees", "both"]:
        employees = (
            db.query(models.Employee)
            .filter(models.Employee.status == "Active")
            .all()
        )

        for employee in employees:
            notification = models.EmployeeNotification(
                employee_id=employee.id,
                message=message
            )
            db.add(notification)

        employee_count = len(employees)

    if recipient_type in ["students", "both"]:
        students = (
            db.query(models.Student)
            .filter(models.Student.status == "Active")
            .all()
        )

        for student in students:
            notification = models.Notification(
                student_id=student.id,
                application_id=None,
                message=message
            )
            db.add(notification)

        student_count = len(students)

    db.commit()

    return {
        "message": "Announcement sent successfully",
        "employees_notified": employee_count,
        "students_notified": student_count
    }
@app.post("/student/feedback")
def submit_student_feedback(
    feedback: StudentFeedbackCreate,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    message = feedback.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Feedback cannot be empty"
        )

    if len(message) > 500:
        raise HTTPException(
            status_code=400,
            detail="Feedback cannot exceed 500 characters"
        )

    new_feedback = models.StudentFeedback(
        student_id=student.id,
        message=message
    )

    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    return {
        "message": "Feedback submitted successfully",
        "feedback_id": new_feedback.feedback_id
    }

@app.get("/admin/student-feedback")
def get_student_feedback(
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(require_admin),
):
    feedbacks = (
        db.query(models.StudentFeedback)
        .join(
            models.Student,
            models.StudentFeedback.student_id == models.Student.id
        )
        .order_by(models.StudentFeedback.created_at.desc())
        .all()
    )

    return [
        {
            "feedback_id": item.feedback_id,
            "student_name": item.student.full_name,
            "student_email": item.student.email,
            "message": item.message,
            "created_at": item.created_at,
        }
        for item in feedbacks
    ]


@app.get("/admin/feedback-notifications")
def get_admin_feedback_notifications(
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(require_admin),
):
    # Fetch all student feedback
    feedbacks = (
        db.query(models.StudentFeedback)
        .join(
            models.Student,
            models.StudentFeedback.student_id == models.Student.id
        )
        .order_by(models.StudentFeedback.created_at.desc())
        .all()
    )

    # Fetch feedback notifications already seen by this admin
    seen_ids = {
        item.feedback_id
        for item in db.query(models.AdminNotificationRead.feedback_id)
        .filter(
            models.AdminNotificationRead.admin_id == admin.id
        )
        .all()
    }

    return [
        {
            "notification_id": item.feedback_id,
            "feedback_id": item.feedback_id,
            "student_name": item.student.full_name,
            "student_email": item.student.email,
            "message": f"{item.student.full_name} submitted new feedback",
            "created_at": item.created_at,
            "is_read": item.feedback_id in seen_ids,
            "feedback": {
                "feedback_id": item.feedback_id,
                "student_name": item.student.full_name,
                "student_email": item.student.email,
                "message": item.message,
                "created_at": item.created_at,
            }
        }
        for item in feedbacks
    ]


@app.patch("/admin/feedback-notifications/seen")
def mark_admin_feedback_notifications_seen(
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(require_admin),
):
    # Get all feedback IDs
    feedback_ids = [
        item.feedback_id
        for item in db.query(models.StudentFeedback.feedback_id).all()
    ]

    if not feedback_ids:
        return {
            "message": "No feedback notifications available",
            "updated_count": 0
        }

    # Get feedback IDs already seen by this admin
    existing_ids = {
        item.feedback_id
        for item in db.query(models.AdminNotificationRead.feedback_id)
        .filter(
            models.AdminNotificationRead.admin_id == admin.id,
            models.AdminNotificationRead.feedback_id.in_(feedback_ids)
        )
        .all()
    }

    # Insert only unseen notifications
    new_records = [
        {
            "admin_id": admin.id,
            "feedback_id": feedback_id
        }
        for feedback_id in feedback_ids
        if feedback_id not in existing_ids
    ]

    updated_count = 0

    if new_records:
        statement = (
            pg_insert(models.AdminNotificationRead)
            .values(new_records)
            .on_conflict_do_nothing(
                index_elements=["admin_id", "feedback_id"]
            )
        )

        result = db.execute(statement)
        updated_count = result.rowcount

    db.commit()

    return {
        "message": "Admin feedback notifications marked as seen",
        "updated_count": updated_count
    }
@app.post("/auth/employee/change-password")
def change_employee_password(
    password_data: AdminChangePassword,
    employee=Depends(require_employee),
    db: Session = Depends(get_db),
):
    if not password_hash.verify(
        password_data.current_password,
        employee.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )

    user = db.query(models.User).filter(
        models.User.user_id == employee.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Associated user account not found",
        )

    new_hashed_password = password_hash.hash(
        password_data.new_password
    )

    employee.hashed_password = new_hashed_password
    user.password_hash = new_hashed_password

    db.commit()
    db.refresh(employee)

    return {
        "message": "Password changed successfully"
    }

@app.get("/employee/announcements")
def get_employee_announcements(
    employee=Depends(require_employee),
    db: Session = Depends(get_db),
):
    announcements = (
        db.query(models.EmployeeNotification)
        .filter(
            models.EmployeeNotification.employee_id == employee.id
        )
        .order_by(
            models.EmployeeNotification.created_at.desc(),
            models.EmployeeNotification.notification_id.desc()
        )
        .all()
    )

    return [
        {
            "notification_id": item.notification_id,
            "message": item.message,
            "created_at": item.created_at,
        }
        for item in announcements
    ]

@app.post("/employee/announcements")
def send_employee_announcement(
    announcement: EmployeeAnnouncementCreate,
    employee=Depends(require_employee),
    db: Session = Depends(get_db),
):
    message = announcement.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Announcement message cannot be empty"
        )

    if len(message) > 500:
        raise HTTPException(
            status_code=400,
            detail="Announcement cannot exceed 500 characters"
        )

    students = (
        db.query(models.Student)
        .filter(models.Student.status == "Active")
        .all()
    )

    for student in students:
        notification = models.Notification(
            student_id=student.id,
            application_id=None,
            message=message
        )
        db.add(notification)

    db.commit()

    return {
        "message": "Announcement sent successfully",
        "students_notified": len(students)
    }


@app.get("/employee/training-eligibilities")
def get_training_eligibilities(
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    eligibilities = (
        db.query(
            models.TrainingEligibility,
            models.Student,
            models.TrainingCourse,
        )
        .join(
            models.Student,
            models.Student.id == models.TrainingEligibility.student_id
        )
        .outerjoin(
            models.TrainingEnrollment,
            models.TrainingEnrollment.eligibility_id == models.TrainingEligibility.id
        )
        .outerjoin(
            models.TrainingCourse,
            models.TrainingCourse.id == models.TrainingEnrollment.course_id
        )
        .order_by(
            models.TrainingEligibility.created_at.desc()
        )
        .all()
    )

    return [
        {
            "eligibility_id": eligibility.id,
            "student_id": student.id,
            "student_name": student.full_name,
            "student_email": student.email,
            "rejected_application_count": eligibility.rejected_application_count,
            "cycle_number": eligibility.cycle_number,
            "status": eligibility.status,
            "claimed_by": eligibility.claimed_by,
            "claimed_at": eligibility.claimed_at,
            "reviewed_by": eligibility.reviewed_by,
            "reviewed_at": eligibility.reviewed_at,
            "created_at": eligibility.created_at,

            "course_id": course.id if course else None,
            "course_created_by": course.created_by if course else None,
            "can_add_course_details": (
                eligibility.status == "Approved"
                and eligibility.claimed_by == employee.id
                and course is None
            ),
            "can_view_progress": (
                course is not None
                and course.created_by == employee.id
            ),
        }
        for eligibility, student, course in eligibilities
    ]

@app.patch("/employee/training-eligibilities/{eligibility_id}/claim")
def claim_training_eligibility(
    eligibility_id: int,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    eligibility = db.query(models.TrainingEligibility).filter(
        models.TrainingEligibility.id == eligibility_id
    ).first()

    if not eligibility:
        raise HTTPException(
            status_code=404,
            detail="Training eligibility not found"
        )

    if eligibility.status != "Pending":
        raise HTTPException(
            status_code=409,
            detail="This eligibility is no longer pending"
        )

    if eligibility.claimed_by == employee.id:
        return {
            "message": "You have already claimed this eligibility",
            "eligibility_id": eligibility_id,
            "claimed_by": employee.id,
        }

    if eligibility.claimed_by is not None:
        raise HTTPException(
            status_code=409,
            detail="This eligibility has already been claimed by another employee"
        )

    # Atomically claim only if it is still unclaimed
    updated_count = (
        db.query(models.TrainingEligibility)
        .filter(
            models.TrainingEligibility.id == eligibility_id,
            models.TrainingEligibility.claimed_by.is_(None),
            models.TrainingEligibility.status == "Pending"
        )
        .update(
            {
                models.TrainingEligibility.claimed_by: employee.id,
                models.TrainingEligibility.claimed_at: datetime.now(timezone.utc),
            },
            synchronize_session=False
        )
    )

    if updated_count == 0:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This eligibility has already been claimed"
        )

    # Mark only this employee's matching notification as read
    db.query(models.EmployeeNotification).filter(
        models.EmployeeNotification.employee_id == employee.id,
        models.EmployeeNotification.training_eligibility_id == eligibility_id
    ).update(
        {
            models.EmployeeNotification.is_read: True
        },
        synchronize_session=False
    )

    db.commit()

    return {
        "message": "Training eligibility claimed successfully",
        "eligibility_id": eligibility_id,
        "claimed_by": employee.id,
    }

@app.patch("/employee/training-eligibilities/{eligibility_id}/approve")
def approve_training_eligibility(
    eligibility_id: int,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    eligibility = db.query(models.TrainingEligibility).filter(
        models.TrainingEligibility.id == eligibility_id
    ).first()

    if not eligibility:
        raise HTTPException(status_code=404, detail="Training eligibility not found")

    if eligibility.claimed_by != employee.id:
        raise HTTPException(
            status_code=403,
            detail="Only the employee who claimed this eligibility can approve it"
        )

    if eligibility.status != "Pending":
        raise HTTPException(
            status_code=409,
            detail="This eligibility has already been reviewed"
        )

    eligibility.status = "Approved"
    eligibility.reviewed_by = employee.id
    eligibility.reviewed_at = datetime.now()

    db.commit()
    db.refresh(eligibility)

    return {
        "message": "Training eligibility approved successfully",
        "eligibility_id": eligibility.id,
        "status": eligibility.status,
        "reviewed_by": eligibility.reviewed_by,
    }
@app.post("/employee/training-eligibilities/{eligibility_id}/course")
def create_training_course(
    eligibility_id: int,
    course_data: TrainingCourseCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    eligibility = db.query(models.TrainingEligibility).filter(
        models.TrainingEligibility.id == eligibility_id
    ).first()

    if not eligibility:
        raise HTTPException(
            status_code=404,
            detail="Training eligibility not found"
        )

    if eligibility.claimed_by != employee.id:
        raise HTTPException(
            status_code=403,
            detail="Only the claiming employee can create this course"
        )

    if eligibility.status != "Approved":
        raise HTTPException(
            status_code=409,
            detail="Training eligibility must be approved first"
        )

    existing_enrollment = db.query(models.TrainingEnrollment).filter(
        models.TrainingEnrollment.eligibility_id == eligibility_id
    ).first()

    if existing_enrollment:
        raise HTTPException(
            status_code=409,
            detail="Training course already created for this eligibility"
        )

    try:
        # Create course
        course = models.TrainingCourse(
            course_type=course_data.course_type,
            job_role=course_data.job_role.strip(),
            created_by=employee.id,
        )

        db.add(course)
        db.flush()

        # Create student enrollment
        enrollment = models.TrainingEnrollment(
            eligibility_id=eligibility.id,
            student_id=eligibility.student_id,
            course_id=course.id,
        )

        db.add(enrollment)
        db.flush()

        # Create only Part 1 initially
        part = models.TrainingPart(
            enrollment_id=enrollment.id,
            part_number=1,
            title="Job Role Knowledge",
            generation_status="Pending",
        )

        db.add(part)
        db.flush()

        course_id = course.id
        enrollment_id = enrollment.id
        part_id = part.id

        db.commit()

    except Exception:
        db.rollback()
        raise

    # Start AI generation after successful database commit
    background_tasks.add_task(
        generate_part_one,
        part_id,
        course_data.job_role.strip()
    )

    return {
        "message": "Training course created. Part 1 generation started.",
        "eligibility_id": eligibility_id,
        "course_id": course_id,
        "enrollment_id": enrollment_id,
        "part_id": part_id,
        "generation_status": "Pending",
    }

@app.patch("/employee/training-eligibilities/{eligibility_id}/reject")
def reject_training_eligibility(
    eligibility_id: int,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    eligibility = db.query(models.TrainingEligibility).filter(
        models.TrainingEligibility.id == eligibility_id
    ).first()

    if not eligibility:
        raise HTTPException(status_code=404, detail="Training eligibility not found")

    if eligibility.claimed_by != employee.id:
        raise HTTPException(
            status_code=403,
            detail="Only the employee who claimed this eligibility can reject it"
        )

    if eligibility.status != "Pending":
        raise HTTPException(
            status_code=409,
            detail="This eligibility has already been reviewed"
        )

    eligibility.status = "Rejected"
    eligibility.reviewed_by = employee.id
    eligibility.reviewed_at = datetime.now()

    db.commit()
    db.refresh(eligibility)

    return {
        "message": "Training eligibility rejected successfully",
        "eligibility_id": eligibility.id,
        "status": eligibility.status,
        "reviewed_by": eligibility.reviewed_by,
    }

@app.get("/employee/students/active")
def get_active_students(
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    students = db.query(models.Student).filter(
        models.Student.status == "Active"
    ).all()

    return [
        {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "phone": student.phone,
            "qualification": student.qualification,
            "department": student.department,
            "year_of_passing": student.year_of_passing,
            "skills": student.skills,
            "profile_photo": student.profile_photo,
            "status": student.status,
        }
        for student in students
    ]

@app.get("/employee/students/status-history")
def get_student_status_history(
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    students = db.query(models.Student).filter(
        models.Student.status.in_(["Active", "Rejected"])
    ).all()

    return [
        {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "phone": student.phone,
            "qualification": student.qualification,
            "department": student.department,
            "year_of_passing": student.year_of_passing,
            "skills": student.skills,
            "profile_photo": student.profile_photo,
            "status": student.status,
        }
        for student in students
    ]

@app.get("/admin/students/{student_id}")
def get_admin_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return {
        "id": student.id,
        "full_name": student.full_name,
        "email": student.email,
        "phone": student.phone,
        "date_of_birth": student.date_of_birth,
        "gender": student.gender,
        "address": student.address,
        "qualification": student.qualification,
        "department": student.department,
        "year_of_passing": student.year_of_passing,
        "skills": student.skills,
        "profile_photo": student.profile_photo,
        "status": student.status,
    }

@app.get("/employee/students/{student_id}")
def get_student_profile(
    student_id: int,
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return {
        "id": student.id,
        "full_name": student.full_name,
        "email": student.email,
        "phone": student.phone,
        "date_of_birth": student.date_of_birth,
        "gender": student.gender,
        "address": student.address,
        "qualification": student.qualification,
        "department": student.department,
        "year_of_passing": student.year_of_passing,
        "skills": student.skills,
        "profile_photo": student.profile_photo,
        "status": student.status,
    }

@app.get("/student/my-profile")
def get_my_student_profile(
    current_user=Depends(require_student),
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "profile_photo": current_user.profile_photo,
        "is_placed": current_user.is_placed,
    }


@app.get("/student/announcements")
def get_student_announcements(
    student=Depends(require_student),
    db: Session = Depends(get_db),
):
    announcements = (
        db.query(models.Notification)
        .filter(
            models.Notification.student_id == student.id,
            models.Notification.application_id.is_(None)
        )
        .order_by(
            models.Notification.created_at.desc(),
            models.Notification.notification_id.desc()
        )
        .all()
    )

    return [
        {
            "notification_id": item.notification_id,
            "message": item.message,
            "created_at": item.created_at,
        }
        for item in announcements
    ]

@app.get("/student/applications/history")
def get_my_application_history(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    applications = (
        db.query(models.Application)
        .filter(models.Application.student_id == student.id)
        .order_by(models.Application.applied_at.desc())
        .all()
    )

    result = []

    for application in applications:
        vacancy = db.query(models.Vacancy).filter(
            models.Vacancy.id == application.vacancy_id
        ).first()

        company = None

        if vacancy:
            company = db.query(models.Company).filter(
                models.Company.id == vacancy.company_id
            ).first()

        result.append({
            "application_id": application.application_id,
            "vacancy_id": application.vacancy_id,
            "vacancy_title": vacancy.title if vacancy else None,
            "company_name": company.name if company else None,
            "status": application.status,
            "applied_at": application.applied_at,
        })

    return result


@app.post("/auth/student/change-password")
def change_student_password(
    password_data: AdminChangePassword,
    student=Depends(require_student),
    db: Session = Depends(get_db),
):
    if not password_hash.verify(
        password_data.current_password,
        student.hashed_password,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password",
        )

    new_password = password_data.new_password

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long",
        )

    if not re.search(r"[A-Z]", new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter",
        )

    if not re.search(r"[0-9]", new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number",
        )

    if not re.search(r"[^A-Za-z0-9]", new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character",
        )

    user = db.query(models.User).filter(
        models.User.user_id == student.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Associated user account not found",
        )

    new_hashed_password = password_hash.hash(new_password)

    student.hashed_password = new_hashed_password
    user.password_hash = new_hashed_password

    db.commit()
    db.refresh(student)

    return {
        "message": "Password changed successfully"
    }


@app.delete("/admin/student-feedback/{feedback_id}")
def delete_student_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    admin: models.Admin = Depends(require_admin),
):
    feedback = db.query(models.StudentFeedback).filter(
        models.StudentFeedback.feedback_id == feedback_id
    ).first()

    if not feedback:
        raise HTTPException(
            status_code=404,
            detail="Feedback not found",
        )

    db.delete(feedback)
    db.commit()

    return {
        "message": "Feedback deleted successfully"
    }

@app.patch("/student/my-profile/placed")
def update_my_placed_status(
    is_placed: bool,
    current_user=Depends(require_student),
    db: Session = Depends(get_db),
):
    was_placed = current_user.is_placed

    current_user.is_placed = is_placed

    # Check eligibility only when Placed changes from ON to OFF
    if was_placed and not is_placed:
        create_training_eligibility_if_eligible(
            db,
            current_user.id
        )

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Placed status updated successfully",
        "is_placed": current_user.is_placed,
    }