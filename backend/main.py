
from fastapi.middleware.cors import CORSMiddleware
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
    EmployeeStatusUpdate,
    JobCreate, 
    JobResponse,
    AdminChangePassword,
    CompanyCreate, 
    CompanyResponse,
    VacancyCreate,
    VacancyResponse,
    ApplicationCreate,
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

import jwt
os.makedirs("uploads/employee_photos", exist_ok=True)


load_dotenv()
app = FastAPI(title="Job Portal API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
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




class ChatbotQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=1000)

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
    full_name: str = Form(..., min_length=2, max_length=100),
    email: EmailStr = Form(...),
    phone: str = Form(..., min_length=7, max_length=20),
    designation: str = Form(..., min_length=2, max_length=100),
    password: str = Form(..., min_length=8, max_length=128),
    profile_photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    existing_employee = (
        db.query(models.Employee)
        .filter(models.Employee.email == email)
        .first()
    )

    if existing_employee:
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

    new_employee = models.Employee(
        full_name=full_name,
        email=email,
        phone=phone,
        designation=designation,
        hashed_password=password_hash.hash(password),
        profile_photo=photo_path,
    )

    try:
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
    except IntegrityError:
        db.rollback()

        if photo_path and os.path.exists(photo_path):
            os.remove(photo_path)

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

@app.post("/auth/admin/change-password")
def change_admin_password(
    password_data: AdminChangePassword,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not password_hash.verify(
        password_data.current_password,
        admin.hashed_password,
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

    admin.hashed_password = password_hash.hash(
        password_data.new_password
    )

    db.commit()
    db.refresh(admin)

    return {
        "message": "Password changed successfully"
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


@app.post("/auth/student/login", response_model=LoginResponse)
def student_login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    student = db.query(models.Student).filter(
        models.Student.email == login_data.email
    ).first()

    if not student or not password_hash.verify(
        login_data.password, student.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if student.status != "Active":
        raise HTTPException(
            status_code=403,
            detail=f"Your account status is {student.status}. Access denied.",
        )

    token = create_access_token(student.id, "student")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student",
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

    employee.status = status_data.status
    db.commit()
    db.refresh(employee)

    return {
        "message": f"Employee status updated to {employee.status}",
        "employee_id": employee.id,
        "status": employee.status,
    }


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

    student.status = status_data.status
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
        }
        for student in students
    ]


@app.get("/student/me")
def get_student_profile(
    student=Depends(require_student),
):
    return {
        "id": student.id,
        "full_name": student.full_name,
        "email": student.email,
        "status": student.status,
    }


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

    application.status = "Sent"
    db.commit()
    db.refresh(application)

    return {
        "message": "Application status updated successfully",
        "application_id": application.application_id,
        "status": application.status,
    }







