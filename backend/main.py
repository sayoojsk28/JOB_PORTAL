
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, status,BackgroundTasks

from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from pwdlib import PasswordHash
from sqlalchemy.dialects.postgresql import insert as pg_insert
import re
import json


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
    InterviewAnalysisCreate,
    VacancyUpdate,
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
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import date
import jwt
import fitz
import ollama
from fastapi import Query
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle,
)
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.lib.units import inch
from xml.sax.saxutils import escape
from training_generator import (
    generate_course_questionnaire,
       analyze_training_questionnaire_with_ai,
    generate_training_submission_pdf
)
os.makedirs("uploads/employee_photos", exist_ok=True)


load_dotenv()
class TrainingCourseAnswer(BaseModel):
    question_id: int
    answer: str


class TrainingCourseSubmissionRequest(BaseModel):
    answers: list[TrainingCourseAnswer] = Field(
        ...,
        min_length=20,
        max_length=20
    )
app = FastAPI(title="Job Portal API")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
TRAINING_DOCUMENTS_DIR = os.path.join(BASE_DIR, "training_documents")
os.makedirs(TRAINING_DOCUMENTS_DIR, exist_ok=True)
INTERVIEW_ANALYSIS_DIR = os.path.join(
    TRAINING_DOCUMENTS_DIR,
    "interview_analysis_reports"
)

os.makedirs(INTERVIEW_ANALYSIS_DIR, exist_ok=True)
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

    cutoff_at = get_student_training_cutoff(db, student_id)

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

    if cutoff_at is not None:
        query = query.filter(
            models.Application.applied_at > cutoff_at
        )

    return query.scalar() or 0




def get_student_rejected_applications(
    db: Session,
    student_id: int
):
    cutoff_at = get_student_training_cutoff(db, student_id)

    query = (
        db.query(
            models.Application.application_id,
            func.min(
                models.InterviewResult.published_on
            ).label("published_at")
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
        .group_by(
            models.Application.application_id
        )
    )

    if cutoff_at is not None:
        query = query.filter(
            models.Application.applied_at > cutoff_at
        )

    rejected_applications = (
        query
        .order_by(
            func.min(
                models.InterviewResult.published_on
            ).asc(),
            models.Application.application_id.asc()
        )
        .limit(3)
        .all()
    )

    application_ids = [
        application_id
        for application_id, published_at in rejected_applications
    ]

    if not application_ids:
        return []

    applications = db.query(models.Application).filter(
        models.Application.application_id.in_(application_ids)
    ).all()

    application_map = {
        application.application_id: application
        for application in applications
    }

    return [
        application_map[application_id]
        for application_id in application_ids
        if application_id in application_map
    ]



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

    # 3. Get exactly 3 rejected applications from the current cycle
    rejected_applications = get_student_rejected_applications(
        db,
        student_id
    )

    if len(rejected_applications) < 3:
        return False

    application_ids = [
        application.application_id
        for application in rejected_applications
    ]

    # 4. Find the latest completed training cycle
    latest_cycle_number = (
    db.query(
        func.max(models.TrainingEligibility.cycle_number)
    )
    .filter(
        models.TrainingEligibility.student_id == student_id
    )
    .scalar()
)

    cycle_number = (latest_cycle_number or 0) + 1

    active_eligibility = (
    db.query(models.TrainingEligibility)
    .filter(
        models.TrainingEligibility.student_id == student_id,
        models.TrainingEligibility.status.in_(["Pending", "Approved"])
    )
    .first()
)

    if active_eligibility:
        active_enrollment = db.query(
        models.TrainingEnrollment
    ).filter(
        models.TrainingEnrollment.eligibility_id == active_eligibility.id,
        models.TrainingEnrollment.completed_at.is_(None)
    ).first()

        if active_enrollment:
            return False

    # 5. Create eligibility without allowing duplicates
    eligibility_id = db.execute(
        pg_insert(models.TrainingEligibility)
        .values(
            student_id=student_id,
            rejected_application_count=3,
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

    # 6. Save the exact 3 applications for this eligibility
    db.execute(
        pg_insert(models.TrainingEligibilityApplication)
        .values([
            {
                "eligibility_id": eligibility_id,
                "application_id": application_id
            }
            for application_id in application_ids
        ])
        .on_conflict_do_nothing(
            constraint="uq_training_eligibility_application"
        )
    )

    # 7. Get all employees
    employee_ids = [
        employee_id
        for (employee_id,) in db.query(
            models.Employee.id
        ).all()
    ]

    # 8. Create one notification per employee
    if employee_ids:
        db.execute(
            pg_insert(models.EmployeeNotification)
            .values([
                {
                    "employee_id": employee_id,
                    "training_eligibility_id": eligibility_id,
                    "message": (
                        f"{student.full_name} has reached "
                        f"3 published rejected applications "
                        f"and is eligible for training review."
                    )
                }
                for employee_id in employee_ids
            ])
            .on_conflict_do_nothing(
                constraint="uq_employee_training_notification"
            )
        )

    return True

def get_student_training_cutoff(
    db: Session,
    student_id: int
):
    student = db.query(models.Student).filter(
        models.Student.id == student_id
    ).first()

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

    baseline_at = (
        student.training_rejection_baseline_at
        if student else None
    )

    dates = [
        date_value
        for date_value in [last_completed_at, baseline_at]
        if date_value is not None
    ]

    return max(dates) if dates else None


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

def extract_resume_text(file_path: str) -> str:
    try:
        with fitz.open(file_path) as document:
            text = ""

            for page in document:
                text += page.get_text()

        if not text.strip():
            raise ValueError("Resume contains no readable text")

        return text

    except Exception as e:
        raise ValueError(f"Failed to extract resume text: {str(e)}")

def extract_resume_skills(resume_text: str) -> list:

    prompt = f"""
You are an expert technical recruiter.

Extract technical skills explicitly mentioned in this resume.

Rules:
1. Include programming languages, frameworks, libraries,
   databases, tools and technologies.
2. Do not invent skills.
3. Avoid duplicate skills.
4. Return ONLY a JSON object in this exact format:

{{
    "skills": [
        "Python",
        "React",
        "PostgreSQL"
    ]
}}

Resume:
{resume_text}
"""

    response = ollama.chat(
        model="llama3.2:latest",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        format="json",
        options={
            "temperature": 0.1
        }
    )

    result = json.loads(
        response["message"]["content"].strip()
    )

    if not isinstance(result, dict):
        raise ValueError("AI returned invalid skills format")

    skills = result.get("skills")

    if not isinstance(skills, list):
        raise ValueError("AI skills array is missing")

    skills = [
        skill.strip()
        for skill in skills
        if isinstance(skill, str) and skill.strip()
    ]

    return list(dict.fromkeys(skills))


def classify_training_course_type(
    job_role: str,
    resume_texts: list[str]
) -> str:

    combined_resumes = "\n\n".join(
        f"Resume {index + 1}:\n{text}"
        for index, text in enumerate(resume_texts)
        if text and text.strip()
    )

    prompt = f"""
You are an expert technical career analyst.

Your task is to classify a training course based on
the job role and the candidate resumes.

Job Role:
{job_role}

Candidate Resumes:
{combined_resumes}

Classification rules:

1. Coding:
   Select Coding if the job role primarily involves
   software development, programming, application development,
   web development, backend, frontend, full-stack,
   mobile development, or writing code.

2. Non-Coding:
   Select Non-Coding if the job role primarily involves
   non-programming responsibilities such as HR, recruitment,
   sales, marketing, business administration, customer support,
   accounting, or management.

3. Consider both the job role and resume information.
4. The actual job responsibilities are more important
   than simply finding programming skills in a resume.
5. Do not assume a role is Coding just because the resume
   mentions Python, Java, or other programming skills.
6. Choose exactly one category.

Return ONLY a JSON object in this format:

{{
    "course_type": "Coding"
}}

The course_type must be exactly "Coding" or "Non-Coding".
"""

    response = ollama.chat(
        model="llama3.2:latest",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        format="json",
        options={
            "temperature": 0.0
        }
    )

    result = json.loads(
        response["message"]["content"].strip()
    )

    if not isinstance(result, dict):
        raise ValueError("AI returned invalid classification format")

    course_type = result.get("course_type")

    if course_type not in ["Coding", "Non-Coding"]:
        raise ValueError("AI returned an invalid course type")

    return course_type





def analyze_interview_with_ai(
    job_role: str,
    course_type: str,
    resume_skills: list,
    interview_explanation: str
) -> dict:

    import json
    import re
    import ollama

    MODEL = "qwen3:8b "

    
    
    SYSTEM_PROMPT = """
# GOAL

You are an experienced technical career mentor specializing in
interview performance analysis and professional development.

Your task is to conduct a deep, evidence-based analysis of a
candidate's interview experiences.

Do not simply summarize what happened or produce a conventional
interview weakness report.

Understand the candidate's experiences as a connected history.
Identify recurring patterns, meaningful changes between interviews,
possible underlying factors, overlooked insights, and specific areas
that could improve the candidate's future interview performance.

The objective is to help the candidate understand their interview
performance more clearly than they currently understand it themselves.

Your analysis must be thoughtful, realistic, specific, and honest.

# CONTEXT

The candidate may have attended multiple interviews and may describe
them using incomplete memories, rough explanations, personal
impressions, or general observations.

They are not expected to remember exact interview questions,
technical answers, or interviewer reactions.

Treat the provided explanation as the only source of factual evidence.

Understand that interview performance can involve several distinct
abilities:

- Understanding technical concepts.
- Applying knowledge in practical situations.
- Explaining how and why an implementation works.
- Justifying technical decisions.
- Responding to follow-up questions.
- Adapting knowledge to unfamiliar scenarios.
- Communicating thoughts clearly under interview conditions.
- Connecting theoretical knowledge with practical experience.

These abilities are related but are not interchangeable.

For example, successfully building an application does not
automatically establish deep understanding of every technology used.
Similarly, difficulty explaining something during an interview does
not automatically prove that the candidate lacks practical ability.

Do not assume that every rejection has the same underlying cause.

Actual rejection reasons are unknown unless the candidate explicitly
reports receiving feedback from the interviewer or company.

# ACTION

## 1. Understand the complete interview history

Examine all interviews together before forming conclusions.

Understand:
- What happened in each interview.
- What the candidate found difficult.
- What appeared to improve between interviews.
- Which difficulties continued despite preparation.
- Whether different interviews reveal a connected pattern.

Do not treat each interview as an isolated incident.

## 2. Identify meaningful recurring patterns

Look for patterns that appear across multiple experiences.

Distinguish between:
- A difficulty that happened only once.
- A difficulty that appeared repeatedly.
- A difficulty that changed over time.
- A possible weakness that becomes visible only when
  different experiences are considered together.

Do not manufacture patterns merely to fill the report.

## 3. Analyze progression and changes

Compare the candidate's earlier and later interviews.

Consider:
- Whether preparation changed performance.
- Whether nervousness remained a relevant factor.
- Whether improving one area exposed another difficulty.
- Whether the candidate became more comfortable but continued
  experiencing similar technical or reasoning difficulties.
- Whether the nature of the difficulties changed.

Acknowledge genuine improvement when the evidence supports it.

Do not describe the candidate as making no progress simply because
they were not selected.

## 4. Investigate possible underlying reasons

Explore plausible explanations behind the identified patterns.

Consider multiple possibilities when appropriate, such as:
- Gaps in conceptual understanding.
- Limited experience explaining technical decisions.
- Difficulty connecting implementation with underlying principles.
- Limited practice with unfamiliar problem scenarios.
- Difficulty organizing thoughts while speaking.
- Interview-specific communication pressure.
- Preparation focused on recalling information rather than
  understanding and applying it.

These are possible explanations, not established facts.

For every proposed reason:
- Explain what observation supports it.
- Distinguish direct evidence from interpretation.
- Consider alternative explanations when relevant.
- Avoid presenting speculation as certainty.

Do not automatically agree with the candidate's own explanation.
Examine whether their interpretation is supported by their experiences.

## 5. Discover overlooked insights

Identify meaningful observations that the candidate may not have
recognized independently.

Look beyond obvious weaknesses.

For example, investigate whether:
- The candidate performs better when building something than
  when explaining the same work.
- Familiar topics become difficult when follow-up questions
  require deeper reasoning.
- Preparation improves confidence without necessarily improving
  the ability to apply knowledge.
- The candidate can describe what an application does but
  struggles to justify why it was designed that way.

These are examples of analytical directions, not conclusions
to force into every report.

Every insight must be relevant to the actual input.

## 6. Establish improvement priorities

Select the most important areas that deserve attention.

Do not generate a long list of generic interview tips.

For each priority:
- Identify the specific difficulty.
- Explain why addressing it matters.
- Recommend a practical action.
- Provide a concrete exercise that the candidate can perform.

Exercises should directly target the identified difficulty.

Prefer meaningful practice over generic advice such as
"study more", "be confident", or "improve communication".

Prioritize the most important improvements rather than treating
every possible weakness as equally important.

## 7. Develop a next-interview strategy

Create a practical strategy based on the complete analysis.

The strategy should help the candidate approach future interviews
differently.

Include relevant preparation methods, ways to handle follow-up
questions, approaches to explaining projects, or methods for
reasoning through unfamiliar situations.

Avoid repeating the improvement priorities word for word.

The strategy should translate the analysis into practical
interview behavior.

# EVIDENCE AND REASONING RULES

These rules are mandatory throughout the analysis.

1. Never invent interview questions, answers, technical details,
   interviewer reactions, feedback, or events.

2. Never introduce technologies, tools, frameworks, or project
   details that the candidate did not mention.

3. Do not assume that a company rejected the candidate for a
   particular reason.

4. Do not confuse a possible explanation with an established fact.

5. Clearly distinguish:
   - Directly reported observations.
   - Reasonable interpretations.
   - Speculative possibilities.

6. Use confidence levels carefully:
   - high: directly and repeatedly supported by the input.
   - medium: supported by meaningful evidence but not conclusive.
   - low: plausible interpretation with limited supporting evidence.

7. Do not assign high confidence to an explanation merely because
   it sounds reasonable.

8. Do not infer poor technical knowledge solely from the fact that
   the candidate used documentation, tutorials, or examples.

9. Do not assume nervousness explains every communication or
   performance difficulty.

10. Do not diagnose psychological, cognitive, or personality
    conditions.

11. Avoid repeating the same observation under different headings
    without adding meaningful new analysis.

12. Do not force every section to contain multiple items.
    Include only findings that are genuinely supported.

13. When the input is insufficient to establish a conclusion,
    acknowledge the uncertainty rather than filling the gap.

14. Depth must be proportional to the quality and detail of the
    candidate's input.

15. Do not praise or criticize the candidate without a reason
    grounded in the provided experiences.

# OUTPUT FORMAT

Return one valid JSON object using exactly the following structure:

{
  "overall_assessment": "A comprehensive assessment of the
  candidate's overall interview history, including the most
  important recurring themes and meaningful progression.",

  "main_patterns": [
    {
      "pattern": "Name of the identified pattern.",
      "observation": "Specific observations from the candidate's
      interview experiences supporting this pattern.",
      "why_it_matters": "Explain the significance of this pattern
      for interview performance.",
      "confidence": "high/medium/low"
    }
  ],

  "possible_underlying_reasons": [
    {
      "reason": "A plausible underlying factor.",
      "explanation": "Explain how this factor could contribute
      to the observed difficulty.",
      "supporting_observation": "The specific candidate-reported
      observation supporting this possibility.",
      "confidence": "high/medium/low"
    }
  ],

  "unnoticed_insights": [
    {
      "insight": "A meaningful observation the candidate may
      have overlooked.",
      "explanation": "Explain the reasoning behind this insight
      using the candidate's experiences.",
      "practical_tip": "A specific way to use this insight
      to improve."
    }
  ],

  "improvement_priorities": [
    {
      "priority": "The specific area that deserves attention.",
      "action": "A practical action to address it.",
      "practice": "A concrete exercise the candidate can perform."
    }
  ],

  "next_interview_strategy": [
    "A specific and actionable recommendation for future interviews."
  ]
}

# JSON REQUIREMENTS

- Return only valid JSON.
- Do not include Markdown code fences.
- Do not add introductory or concluding text outside JSON.
- Use exactly the specified top-level keys.
- Every collection must be a JSON array.
- Every object must contain all specified fields.
- All values must use the correct string or array types.
- Confidence must be exactly one of: high, medium, low.
- Do not add extra keys.
- Do not return null values.
- Ensure all JSON strings are properly escaped.
"""



    # --------------------------------------------------
    # VALIDATE INPUT
    # --------------------------------------------------

    if not isinstance(job_role, str) or not job_role.strip():
        raise ValueError("Invalid job role")

    if not isinstance(interview_explanation, str) or not interview_explanation.strip():
        raise ValueError("Interview explanation cannot be empty")

    if not isinstance(resume_skills, list):
        raise ValueError("Resume skills must be a list")

    if not isinstance(course_type, str):
        course_type = ""

    # --------------------------------------------------
    # PREPARE USER INPUT
    # --------------------------------------------------

    user_prompt = f"""
Job Role:
{job_role}

Course Type:
{course_type}

Resume Skills:
{json.dumps(resume_skills, ensure_ascii=False)}

Candidate's Interview Experiences:

{interview_explanation}
"""

    # --------------------------------------------------
    # CALL OLLAMA
    # --------------------------------------------------

    try:

        response = ollama.chat(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            format="json",
            options={
                "temperature": 0.3
            }
        )

        raw_response = response["message"]["content"]

        if not raw_response or not raw_response.strip():
            raise ValueError("AI returned an empty response")

        # --------------------------------------------------
        # PARSE JSON
        # --------------------------------------------------

        try:
            analysis = json.loads(raw_response)

        except json.JSONDecodeError as error:
            print("AI JSON parsing error:", error)
            print("Raw AI response:", raw_response)

            raise ValueError(
                "AI returned invalid JSON"
            )

        if not isinstance(analysis, dict):
            raise ValueError("AI response must be a JSON object")

        # --------------------------------------------------
        # VALIDATE TOP LEVEL STRUCTURE
        # --------------------------------------------------

        required_fields = [
            "overall_assessment",
            "main_patterns",
            "possible_underlying_reasons",
            "unnoticed_insights",
            "improvement_priorities",
            "next_interview_strategy"
        ]

        for field in required_fields:

            if field not in analysis:
                raise ValueError(
                    f"Missing AI response field: {field}"
                )

        if not isinstance(
            analysis["overall_assessment"], str
        ) or not analysis["overall_assessment"].strip():

            raise ValueError(
                "Invalid overall_assessment"
            )

        array_fields = [
            "main_patterns",
            "possible_underlying_reasons",
            "unnoticed_insights",
            "improvement_priorities",
            "next_interview_strategy"
        ]

        # --------------------------------------------------
        # NORMALIZE ARRAY FIELDS
        # --------------------------------------------------

        for field in array_fields:

            value = analysis[field]

            if isinstance(value, str):

                value = value.strip()

                if value:
                    value = [value]
                else:
                    value = []

                analysis[field] = value

            elif value is None:

                analysis[field] = []

            elif not isinstance(value, list):

                raise ValueError(
                    f"Invalid format for {field}"
                )

        # --------------------------------------------------
        # VALIDATE MAIN PATTERNS
        # --------------------------------------------------

        for item in analysis["main_patterns"]:

            if not isinstance(item, dict):
                raise ValueError(
                    "Invalid main_patterns object"
                )

            required = [
                "pattern",
                "observation",
                "why_it_matters",
                "confidence"
            ]

            for field in required:

                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(
                        f"Invalid main_patterns field: {field}"
                    )

            item["confidence"] = item["confidence"].lower().strip()

            if item["confidence"] not in [
                "high", "medium", "low"
            ]:
                item["confidence"] = "low"

        # --------------------------------------------------
        # VALIDATE UNDERLYING REASONS
        # --------------------------------------------------

        for item in analysis["possible_underlying_reasons"]:

            if not isinstance(item, dict):
                raise ValueError(
                    "Invalid possible_underlying_reasons object"
                )

            required = [
                "reason",
                "explanation",
                "supporting_observation",
                "confidence"
            ]

            for field in required:

                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(
                        f"Invalid underlying reason field: {field}"
                    )

            item["confidence"] = item["confidence"].lower().strip()

            if item["confidence"] not in [
                "high", "medium", "low"
            ]:
                item["confidence"] = "low"

        # --------------------------------------------------
        # VALIDATE UNNOTICED INSIGHTS
        # --------------------------------------------------

        for item in analysis["unnoticed_insights"]:

            if not isinstance(item, dict):
                raise ValueError(
                    "Invalid unnoticed_insights object"
                )

            required = [
                "insight",
                "explanation",
                "practical_tip"
            ]

            for field in required:

                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(
                        f"Invalid unnoticed insight field: {field}"
                    )

        # --------------------------------------------------
        # VALIDATE IMPROVEMENT PRIORITIES
        # --------------------------------------------------

        for item in analysis["improvement_priorities"]:

            if not isinstance(item, dict):
                raise ValueError(
                    "Invalid improvement_priorities object"
                )

            required = [
                "priority",
                "action",
                "practice"
            ]

            for field in required:

                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(
                        f"Invalid improvement priority field: {field}"
                    )

        # --------------------------------------------------
        # VALIDATE NEXT INTERVIEW STRATEGY
        # --------------------------------------------------

        valid_strategies = []

        for item in analysis["next_interview_strategy"]:

            if isinstance(item, str) and item.strip():

                valid_strategies.append(item.strip())

            elif isinstance(item, dict):

                # Handle unexpected object output safely.
                strategy = (
                    item.get("strategy")
                    or item.get("action")
                    or item.get("tip")
                )

                if isinstance(strategy, str) and strategy.strip():
                    valid_strategies.append(strategy.strip())

        analysis["next_interview_strategy"] = valid_strategies

        # --------------------------------------------------
        # FINAL RESPONSE
        # --------------------------------------------------

        return analysis

    except Exception as error:

        print(
            f"Interview analysis error: {str(error)}"
        )

        raise

def verify_report_evidence(
    evidence: str,
    interview_explanation: str
) -> bool:

    import re
    from collections import Counter

    if not isinstance(evidence, str) or not evidence.strip():
        return False

    if not isinstance(interview_explanation, str):
        return False

    def normalize(text):
        return re.findall(
            r"\b[a-z0-9]+\b",
            text.lower()
        )

    stop_words = {
        "i", "a", "an", "the", "and", "but",
        "to", "of", "with", "in", "my", "was",
        "were", "is", "am", "it", "during",
        "on", "for", "at", "this", "that"
    }

    evidence_words = [
        word for word in normalize(evidence)
        if word not in stop_words
    ]

    explanation_words = normalize(interview_explanation)

    if not evidence_words:
        return False

    evidence_counts = Counter(evidence_words)
    explanation_counts = Counter(explanation_words)

    matched_words = sum(
        min(count, explanation_counts[word])
        for word, count in evidence_counts.items()
    )

    match_ratio = matched_words / len(evidence_words)

    return match_ratio >= 0.80



def verify_report_evidence(
    evidence: str,
    interview_explanation: str
) -> bool:

    if not isinstance(evidence, str) or not evidence.strip():
        return False

    if not isinstance(interview_explanation, str):
        return False

    def normalize(text):
        return " ".join(text.casefold().split())

    normalized_evidence = normalize(evidence)
    normalized_explanation = normalize(interview_explanation)

    return normalized_evidence in normalized_explanation


def validate_interview_analysis(
    analysis: dict,
    interview_explanation: str
) -> dict:

    if not isinstance(analysis, dict):
        raise ValueError("AI returned invalid analysis format")

    if not isinstance(interview_explanation, str):
        raise ValueError("Invalid interview explanation")

    # --------------------------------------------------
    # REQUIRED TOP-LEVEL FIELDS
    # --------------------------------------------------

    required_fields = {
        "overall_assessment": str,
        "main_patterns": list,
        "possible_underlying_reasons": list,
        "unnoticed_insights": list,
        "improvement_priorities": list,
        "next_interview_strategy": list
    }

    for field, expected_type in required_fields.items():

        value = analysis.get(field)

        if not isinstance(value, expected_type):
            raise ValueError(
                f"Invalid format for {field}"
            )

    if not analysis["overall_assessment"].strip():
        raise ValueError("Overall assessment cannot be empty")

    # --------------------------------------------------
    # NESTED FIELD DEFINITIONS
    # --------------------------------------------------

    sections = {
        "main_patterns": [
            "pattern",
            "observation",
            "why_it_matters",
            "confidence"
        ],
        "possible_underlying_reasons": [
            "reason",
            "explanation",
            "supporting_observation",
            "confidence"
        ],
        "unnoticed_insights": [
            "insight",
            "explanation",
            "practical_tip"
        ],
        "improvement_priorities": [
            "priority",
            "action",
            "practice"
        ]
    }

    valid_confidence = {"high", "medium", "low"}

    # --------------------------------------------------
    # VALIDATE REPORT SECTIONS
    # --------------------------------------------------

    for section_name, required_keys in sections.items():

        valid_items = []

        for index, item in enumerate(analysis[section_name]):

            if not isinstance(item, dict):
                print(
                    f"Rejected invalid item in {section_name}: {index}"
                )
                continue

            if not all(
                isinstance(item.get(key), str)
                and item[key].strip()
                for key in required_keys
            ):
                print(
                    f"Rejected incomplete item in {section_name}: {index}"
                )
                continue

            # Normalize confidence
            if "confidence" in item:

                confidence = item["confidence"].casefold().strip()

                if confidence not in valid_confidence:
                    confidence = "low"

                item["confidence"] = confidence

            # --------------------------------------------------
            # EVIDENCE GROUNDING
            # --------------------------------------------------
            # Observations and supporting observations should
            # be traceable to the candidate's actual input.
            # Interpretations and recommendations are not
            # required to be exact source quotations.

            evidence_field = None

            if section_name == "main_patterns":
                evidence_field = "observation"

            elif section_name == "possible_underlying_reasons":
                evidence_field = "supporting_observation"

            if evidence_field:

                evidence = item[evidence_field]

                if not verify_report_evidence(
                    evidence,
                    interview_explanation
                ):
                    print(
                        f"Warning: Evidence is not an exact source "
                        f"match in {section_name}: {item.get('pattern', item.get('reason'))}"
                    )

                    # Do not reject automatically.
                    # AI may reasonably paraphrase rough memories.
                    # Structural validation and semantic grounding
                    # are different checks.

            valid_items.append(item)

        analysis[section_name] = valid_items

    # --------------------------------------------------
    # VALIDATE NEXT INTERVIEW STRATEGY
    # --------------------------------------------------

    valid_strategies = []

    for strategy in analysis["next_interview_strategy"]:

        if isinstance(strategy, str) and strategy.strip():
            valid_strategies.append(strategy.strip())

    analysis["next_interview_strategy"] = valid_strategies

    return analysis


# def validate_interview_reports(
#     reports: list,
#     course_type: str,
#     interview_explanation: str,
#     resume_skills: list
# ) -> list:

#     valid_reports = []

#     allowed_categories = {
#         "technical_gap": "technical",
#         "resume_skill_mismatch": "technical",
#         "technical_answer_mistake": "technical",
#         "communication_mistake": "communication",
#         "coding_practice": "coding",
#         "other_relevant_issue": "behavioural",
#     }

#     normalized_skills = {
#         " ".join(skill.lower().split())
#         for skill in resume_skills
#         if isinstance(skill, str) and skill.strip()
#     }

#     for report in reports:

#         if not isinstance(report, dict):
#             continue

#         report_type = report.get("report_type")
#         evidence_category = report.get("evidence_category")
#         evidence = report.get("evidence")

#         if report_type not in allowed_categories:
#             continue

#         if not verify_report_evidence(
#             evidence,
#             interview_explanation
#         ):
#             continue

#         if evidence_category != allowed_categories[report_type]:
#             continue

#         if report_type == "resume_skill_mismatch":

#             evidence_lower = " ".join(
#                 evidence.lower().split()
#             )

#             if not any(
#                 skill in evidence_lower
#                 for skill in normalized_skills
#             ):
#                 continue

#         if (
#             report_type == "coding_practice"
#             and course_type.strip().lower() != "coding"
#         ):
#             continue

#         valid_reports.append(report)

#     return valid_reports





def generate_analysis_pdf(
    heading: str,
    description: str,
    content: str
) -> str:

    import os
    import uuid
    import re

    from xml.sax.saxutils import escape

    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import (
        getSampleStyleSheet,
        ParagraphStyle
    )
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        HRFlowable,
        KeepTogether
    )

    # --------------------------------------------------
    # FILE PATH
    # --------------------------------------------------

    os.makedirs(INTERVIEW_ANALYSIS_DIR, exist_ok=True)

    filename = f"{uuid.uuid4()}.pdf"

    file_path = os.path.join(
        INTERVIEW_ANALYSIS_DIR,
        filename
    )

    # --------------------------------------------------
    # COLORS
    # --------------------------------------------------

    navy = colors.HexColor("#17365D")
    blue = colors.HexColor("#1F4E79")
    light_blue = colors.HexColor("#EAF1F8")
    grey = colors.HexColor("#555555")
    light_grey = colors.HexColor("#D9E2F3")

    # --------------------------------------------------
    # STYLES
    # --------------------------------------------------

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=26,
        alignment=TA_CENTER,
        textColor=navy,
        spaceAfter=20,
    )

    summary_heading_style = ParagraphStyle(
        "SummaryHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=19,
        textColor=navy,
        spaceBefore=8,
        spaceAfter=10,
    )

    summary_body_style = ParagraphStyle(
        "SummaryBody",
        parent=styles["BodyText"],
        fontSize=10,
        leading=16,
        textColor=grey,
        spaceAfter=12,
    )

    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=19,
        textColor=navy,
        spaceBefore=20,
        spaceAfter=10,
        keepWithNext=True,
    )

    subheading_style = ParagraphStyle(
        "Subheading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=blue,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=15,
        textColor=colors.HexColor("#333333"),
        spaceAfter=7,
        alignment=0,
        splitLongWords=1,
    )

    number_style = ParagraphStyle(
        "NumberStyle",
        parent=body_style,
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=navy,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True,
    )

    confidence_style = ParagraphStyle(
        "ConfidenceStyle",
        parent=body_style,
        fontSize=9,
        textColor=grey,
        spaceBefore=2,
        spaceAfter=8,
    )

    # --------------------------------------------------
    # DOCUMENT CONTENT
    # --------------------------------------------------

    story = []

    # Title
    story.append(
        Paragraph(
            escape(heading),
            title_style
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=1,
            color=light_grey,
            spaceAfter=18
        )
    )

    # Overall assessment
    story.append(
        Paragraph(
            "Overall Assessment",
            summary_heading_style
        )
    )

    story.append(
        Paragraph(
            escape(description).replace("\n", "<br/>"),
            summary_body_style
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.8,
            color=light_grey,
            spaceBefore=8,
            spaceAfter=12
        )
    )

    # --------------------------------------------------
    # CONTENT PARSING
    # --------------------------------------------------

    lines = content.splitlines()

    section_titles = {
        "MAIN INTERVIEW PATTERNS",
        "POSSIBLE UNDERLYING REASONS",
        "UNNOTICED INSIGHTS",
        "IMPROVEMENT PRIORITIES",
        "NEXT INTERVIEW STRATEGY",
    }

    for line in lines:

        line = line.strip()

        if not line:
            story.append(Spacer(1, 3))
            continue

        # Ignore separator lines
        if re.fullmatch(r"[=]{3,}", line):
            continue

        # Main section headings
        if line.upper() in section_titles:

            story.append(
                Spacer(1, 8)
            )

            story.append(
                Paragraph(
                    escape(line.title()),
                    section_heading_style
                )
            )

            story.append(
                HRFlowable(
                    width="100%",
                    thickness=0.6,
                    color=light_grey,
                    spaceAfter=10
                )
            )

            continue

        # Numbered items
        if re.match(r"^\d+\.\s+", line):

            story.append(
                Paragraph(
                    escape(line),
                    number_style
                )
            )

            continue

        # Field labels
        if line.endswith(":") and len(line) < 60:

            story.append(
                Paragraph(
                    escape(line),
                    subheading_style
                )
            )

            continue

        # Confidence values
        if line.lower().startswith("confidence:"):

            story.append(
                Paragraph(
                    escape(line),
                    confidence_style
                )
            )

            continue

        # Normal paragraph
        story.append(
            Paragraph(
                escape(line).replace("\n", "<br/>"),
                body_style
            )
        )

    # --------------------------------------------------
    # PDF DOCUMENT
    # --------------------------------------------------

    document = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title=heading,
        author="Job Portal AI",
    )

    document.build(story)

    return file_path

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
        db.flush()

        log_action(
            db=db,
            user_id=new_user.user_id,
            action="STUDENT_REGISTERED",
            target_type="student",
            target_id=new_student.id,
            details="New student registered.",
            )

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
        db.flush()

        log_action(
            db=db,
            user_id=new_user.user_id,
            action="EMPLOYEE_REGISTERED",
            target_type="employee",
            target_id=new_employee.id,
            details="New employee registered.",
        )

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

    # Log admin password change
    log_action(
        db=db,
        user_id=admin.user_id,
        action="ADMIN_PASSWORD_CHANGED",
        target_type="admin",
        target_id=admin.id,
        details="Admin password changed",
    )

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

@app.get("/employee/my-details")
def get_my_employee_details(
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    return {
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
    }


@app.put("/employee/my-details")
def update_my_employee_details(
    full_name: str = Form(..., min_length=2, max_length=100),
    email: EmailStr = Form(...),
    phone: str = Form(..., min_length=7, max_length=20),
    designation: str = Form(..., min_length=2, max_length=100),
    profile_photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    employee=Depends(require_employee),
):
    # Find the linked User account
    user = db.query(models.User).filter(
        models.User.user_id == employee.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Employee user account not found",
        )

    # Check whether another user already uses this email
    existing_user = db.query(models.User).filter(
        models.User.email == email,
        models.User.user_id != employee.user_id,
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    # Check whether another employee already uses this email
    existing_employee = db.query(models.Employee).filter(
        models.Employee.email == email,
        models.Employee.id != employee.id,
    ).first()

    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    new_photo_path = None
    old_photo_path = employee.profile_photo

    # Process new profile photo only when provided
    if profile_photo and profile_photo.filename:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        try:
            if profile_photo.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400,
                    detail="Only JPG, PNG, and WEBP images are allowed",
                )

            photo_data = profile_photo.file.read()

            if len(photo_data) > 5 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail="Profile photo must not exceed 5 MB",
                )

            if not photo_data:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded profile photo is empty",
                )

        finally:
            profile_photo.file.close()

        os.makedirs("uploads/employee_photos", exist_ok=True)

        extension = allowed_types[profile_photo.content_type]
        filename = f"{uuid.uuid4().hex}{extension}"
        new_photo_path = f"uploads/employee_photos/{filename}"

        try:
            with open(new_photo_path, "wb") as image_file:
                image_file.write(photo_data)
        except Exception:
            if os.path.exists(new_photo_path):
                os.remove(new_photo_path)
            raise

    try:
        # Update Employee table
        employee.full_name = full_name
        employee.email = email
        employee.phone = phone
        employee.designation = designation

        if new_photo_path:
            employee.profile_photo = new_photo_path

        # Update linked User table
        user.name = full_name
        user.email = email

        log_action(
            db=db,
            user_id=employee.user_id,
            action="EMPLOYEE_DETAILS_UPDATED",
            target_type="employee",
            target_id=employee.id,
            details="Employee updated their account details.",
        )

        db.commit()
        db.refresh(employee)

    except IntegrityError:
        db.rollback()

        if new_photo_path and os.path.exists(new_photo_path):
            os.remove(new_photo_path)

        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    except Exception:
        db.rollback()

        if new_photo_path and os.path.exists(new_photo_path):
            os.remove(new_photo_path)

        raise

    # Delete old photo only after successful database commit
    if (
        new_photo_path
        and old_photo_path
        and old_photo_path != new_photo_path
        and os.path.exists(old_photo_path)
    ):
        os.remove(old_photo_path)

    return {
        "message": "Employee details updated successfully",
        "employee": {
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
        },
    }


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
    db.flush()

    log_action(
        db=db,
        user_id=employee.user_id,
        action="JOB_CREATED",
        target_type="job",
        target_id=new_job.id,
        details=f"Job created: {new_job.title}",
    )

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
        db.flush()

        log_action(
            db=db,
            user_id=current_user.user_id,
            action="COMPANY_CREATED",
            target_type="company",
            target_id=new_company.id,
            details=f"Company created: {new_company.name}",
        )

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

@app.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
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
            detail="Only employees can edit companies",
        )

    company = db.query(models.Company).filter(
        models.Company.id == company_id
    ).first()

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found",
        )

    new_logo_path = None
    old_logo_path = company.logo

    if logo and logo.filename:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }

        extension = allowed_types.get(logo.content_type)

        if not extension:
            logo.file.close()
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed",
            )

        logo_data = logo.file.read()
        logo.file.close()

        if not logo_data:
            raise HTTPException(
                status_code=400,
                detail="Uploaded logo is empty",
            )

        if len(logo_data) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Logo size must be 5 MB or less",
            )

        filename = f"{uuid.uuid4().hex}{extension}"
        file_path = os.path.join(COMPANY_LOGOS_DIR, filename)

        try:
            with open(file_path, "wb") as file:
                file.write(logo_data)

            new_logo_path = f"/uploads/company_logos/{filename}"

        except Exception:
            if os.path.exists(file_path):
                os.remove(file_path)

            raise HTTPException(
                status_code=500,
                detail="Could not upload company logo",
            )

    try:
        company.name = name
        company.industry = industry
        company.address = address
        company.contact_number = contact_number
        company.email = str(email)
        company.website = website
        company.size = size
        company.description = description

        if new_logo_path:
            company.logo = new_logo_path

        log_action(
            db=db,
            user_id=current_user.user_id,
            action="COMPANY_UPDATED",
            target_type="company",
            target_id=company.id,
            details=f"Company details updated: {company.name}",
        )

        db.commit()
        db.refresh(company)

    except Exception:
        db.rollback()

        if new_logo_path:
            saved_file = os.path.join(
                COMPANY_LOGOS_DIR,
                os.path.basename(new_logo_path),
            )
            if os.path.exists(saved_file):
                os.remove(saved_file)

        raise HTTPException(
            status_code=500,
            detail="Could not update company details",
        )

    # Delete the previous logo only after successful database commit.
    if new_logo_path and old_logo_path:
        old_file = os.path.join(
            COMPANY_LOGOS_DIR,
            os.path.basename(old_logo_path),
        )

        if os.path.exists(old_file):
            os.remove(old_file)

    return company

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

    previous_status = company.is_active

    if previous_status != status:
        company.is_active = status

        log_action(
            db=db,
            user_id=current_user.user_id,
            action="COMPANY_STATUS_UPDATED",
            target_type="company",
            target_id=company.id,
            details=f"Company status changed from {previous_status} to {status}",
        )

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
    db.flush()

    log_action(
        db=db,
        user_id=current_user.user_id,
        action="VACANCY_CREATED",
        target_type="vacancy",
        target_id=new_vacancy.id,
        details=f"Vacancy created: {new_vacancy.title}",
    )

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

@app.put(
    "/vacancies/{vacancy_id}",
    response_model=VacancyResponse,
)
def update_vacancy(
    vacancy_id: int,
    vacancy_data: VacancyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Only employees can edit vacancies
    if not isinstance(current_user, models.Employee):
        raise HTTPException(
            status_code=403,
            detail="Only employees can edit vacancies",
        )

    # Find the vacancy
    vacancy = (
        db.query(models.Vacancy)
        .filter(models.Vacancy.id == vacancy_id)
        .first()
    )

    if not vacancy:
        raise HTTPException(
            status_code=404,
            detail="Vacancy not found",
        )

    # Update vacancy details
    update_data = vacancy_data.model_dump()

    for field, value in update_data.items():
        setattr(vacancy, field, value)

    log_action(
        db=db,
        user_id=current_user.user_id,
        action="VACANCY_UPDATED",
        target_type="vacancy",
        target_id=vacancy.id,
        details=f"Vacancy updated: {vacancy.title}",
    )

    db.commit()
    db.refresh(vacancy)

    return vacancy


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
    resume_dir = os.path.join(UPLOADS_DIR, "resumes")
    os.makedirs(resume_dir, exist_ok=True)

    file_path = os.path.join(resume_dir, filename)

    with open(file_path, "wb") as f:
        f.write(file_content)

    # 5. Save file details in the database
    new_resume = models.Resume(
        student_id=student.id,
        file_type="application/pdf",
        file_size=len(file_content),
        file_path=os.path.join(UPLOADS_DIR, "resumes", filename),
        is_active="active",
    )

    try:
        db.add(new_resume)
        db.flush()

        # Log resume upload
        log_action(
            db=db,
            user_id=student.user_id,
            action="RESUME_UPLOADED",
            target_type="resume",
            target_id=new_resume.resume_id,
            details="Student uploaded a resume",
        )

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
    db.flush()

    # 4. Log application creation
    log_action(
        db=db,
        user_id=student.user_id,
        action="APPLICATION_CREATED",
        target_type="application",
        target_id=new_application.application_id,
        details=f"Student applied for vacancy ID {vacancy.id}",
    )

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

    previous_status = application.status
    application.status = "Sent"

    notification = models.Notification(
        student_id=application.student_id,
        application_id=application.application_id,
        message=f"Your resume is sent to {company.name} for {vacancy.title} job role."
    )

    db.add(notification)

    log_action(
        db=db,
        user_id=employee.user_id,
        action="APPLICATION_STATUS_UPDATED",
        target_type="application",
        target_id=application.application_id,
        details=f"Application status changed from {previous_status} to Sent",
    )

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
    db.flush()

    log_action(
        db=db,
        user_id=employee.user_id,
        action="INTERVIEW_CREATED",
        target_type="interview",
        target_id=interview.interview_id,
        details=f"Interview scheduled for application {application.application_id}",
    )

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

    previous_attendance = interview.student_attendance

    interview.student_attendance = data.student_attendance

    if previous_attendance != data.student_attendance:
        log_action(
            db=db,
            user_id=student.user_id,
            action="INTERVIEW_ATTENDANCE_UPDATED",
            target_type="interview",
            target_id=interview.interview_id,
            details=(
                f"Student attendance changed from "
                f"{previous_attendance} to {data.student_attendance}"
            ),
        )

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
    db.flush()

    log_action(
        db=db,
        user_id=employee.user_id,
        action="INTERVIEW_RESULT_CREATED",
        target_type="interview_result",
        target_id=interview_result.result_id,
        details=f"Interview result created: {data.result}",
    )

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

        log_action(
            db=db,
            user_id=employee.user_id,
            action="INTERVIEW_RESULT_PUBLISHED",
            target_type="interview_result",
            target_id=interview_result.result_id,
            details="Interview result published",
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

    # Get all student user IDs
    student_user_ids = [
        row[0]
        for row in db.query(models.Student.user_id).all()
    ]

    # Include only this employee and all students
    visible_user_ids = list(set(
        student_user_ids + [employee.user_id]
    ))

    # Base query
    query = db.query(models.AuditLog).filter(
        models.AuditLog.user_id.in_(visible_user_ids)
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

    log_action(
        db=db,
        user_id=admin.user_id,
        action="ANNOUNCEMENT_CREATED",
        target_type="announcement",
        target_id=None,
        details=(
            f"Announcement sent to {recipient_type}. "
            f"Employees notified: {employee_count}, "
            f"Students notified: {student_count}."
        ),
    )

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
    db.flush()

    # Log feedback creation
    log_action(
        db=db,
        user_id=student.user_id,
        action="STUDENT_FEEDBACK_CREATED",
        target_type="student_feedback",
        target_id=new_feedback.feedback_id,
        details="Student submitted feedback",
    )

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

    # Audit log
    log_action(
        db=db,
        user_id=employee.user_id,
        action="EMPLOYEE_PASSWORD_CHANGED",
        target_type="employee",
        target_id=employee.id,
        details="Employee password changed",
    )

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

    log_action(
        db=db,
        user_id=employee.user_id,
        action="ANNOUNCEMENT_CREATED",
        target_type="announcement",
        target_id=None,
        details=(
            f"Employee sent announcement to students. "
            f"Students notified: {len(students)}."
        ),
    )

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

    log_action(
        db=db,
        user_id=employee.user_id,
        action="TRAINING_ELIGIBILITY_CLAIMED",
        target_type="training_eligibility",
        target_id=eligibility_id,
        details="Training eligibility claimed by employee",
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
    try:
        # 1. Get and lock eligibility
        eligibility = (
            db.query(models.TrainingEligibility)
            .filter(
                models.TrainingEligibility.id == eligibility_id
            )
            .with_for_update()
            .first()
        )

        if not eligibility:
            raise HTTPException(
                status_code=404,
                detail="Training eligibility not found"
            )

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

        # 2. Retrieve the exact 3 frozen applications
        application_records = (
            db.query(
                models.Application,
                models.Vacancy,
                models.Resume
            )
            .join(
                models.TrainingEligibilityApplication,
                models.TrainingEligibilityApplication.application_id
                == models.Application.application_id
            )
            .join(
                models.Vacancy,
                models.Vacancy.id == models.Application.vacancy_id
            )
            .join(
                models.Resume,
                models.Resume.resume_id == models.Application.resume_id
            )
            .filter(
                models.TrainingEligibilityApplication.eligibility_id
                == eligibility.id,
                models.Application.student_id == eligibility.student_id,
                models.Resume.student_id == eligibility.student_id
            )
            .order_by(models.Application.application_id.asc())
            .all()
        )

        if len(application_records) != 3:
            raise HTTPException(
                status_code=409,
                detail="Exactly 3 valid rejected applications are required"
            )

        # 3. Group applications by unique job role
        role_groups = {}

        for application, vacancy, resume in application_records:
            job_role = vacancy.title.strip()

            if not job_role:
                raise HTTPException(
                    status_code=400,
                    detail="An application has an empty job role"
                )

            role_key = job_role.casefold()

            if role_key not in role_groups:
                role_groups[role_key] = {
                    "job_role": job_role,
                    "applications": [],
                    "resume_texts": []
                }

            resume_text = (
                resume.extracted_text.strip()
                if resume.extracted_text
                and resume.extracted_text.strip()
                else extract_resume_text(resume.file_path)
            )

            role_groups[role_key]["applications"].append(application)
            role_groups[role_key]["resume_texts"].append(resume_text)

        # 4. Generate one course and questionnaire per unique job role
        created_courses = []

        for role_data in role_groups.values():

            job_role = role_data["job_role"]
            resume_texts = role_data["resume_texts"]

            # 4A. Classify course type
            try:
                course_type = classify_training_course_type(
                    job_role,
                    resume_texts
                )
            except Exception as ai_error:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"AI course classification failed for "
                        f"{job_role}: {str(ai_error)}"
                    )
                )

            # 4B. Create course
            course = models.TrainingCourse(
                eligibility_id=eligibility.id,
                course_type=course_type,
                job_role=job_role,
                created_by=employee.id,
                status="Active"
            )

            db.add(course)
            db.flush()

            # 4C. Link course to corresponding applications
            for application in role_data["applications"]:
                db.add(
                    models.TrainingCourseApplication(
                        course_id=course.id,
                        application_id=application.application_id
                    )
                )

            # 4D. Generate 20 descriptive interview questions
            try:
                questions = generate_course_questionnaire(
                    job_role=job_role,
                    course_type=course_type,
                    resume_texts=resume_texts
                )
            except Exception as ai_error:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"AI questionnaire generation failed for "
                        f"{job_role}: {str(ai_error)}"
                    )
                )

            # Additional validation before saving
            if len(questions) != 20:
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Questionnaire generation returned an invalid "
                        f"number of questions for {job_role}"
                    )
                )

            # 4E. Create questionnaire record
            questionnaire = models.TrainingCourseQuestionnaire(
                course_id=course.id,
                generation_status="Generating"
            )

            db.add(questionnaire)
            db.flush()

            # 4F. Save all 20 questions separately
            for question_number, question_text in enumerate(
                questions,
                start=1
            ):
                db.add(
                    models.TrainingCourseQuestion(
                        questionnaire_id=questionnaire.id,
                        question_number=question_number,
                        question_text=question_text
                    )
                )

            # 4G. Mark questionnaire as completed
            questionnaire.generation_status = "Completed"
            questionnaire.generated_at = datetime.now()

            # 4H. Create separate enrollment for this course
            enrollment = models.TrainingEnrollment(
                eligibility_id=eligibility.id,
                student_id=eligibility.student_id,
                course_id=course.id,
                status="Active"
            )

            db.add(enrollment)

            created_courses.append({
                "course_id": course.id,
                "job_role": job_role,
                "course_type": course_type,
                "questionnaire_status": "Completed",
                "total_questions": len(questions)
            })

        # 5. Update eligibility status
        eligibility.status = "Approved"
        eligibility.reviewed_by = employee.id
        eligibility.reviewed_at = datetime.now()

        # 6. Update the approving employee's existing notification
        employee_notification = (
            db.query(models.EmployeeNotification)
            .filter(
                models.EmployeeNotification.employee_id == employee.id,
                models.EmployeeNotification.training_eligibility_id
                == eligibility.id
            )
            .first()
        )

        employee_message = (
            f"Training courses created successfully for "
            f"student ID {eligibility.student_id}. "
            f"Total courses: {len(created_courses)}."
        )

        if employee_notification:
            employee_notification.message = employee_message
            employee_notification.is_read = False
        else:
            db.add(
                models.EmployeeNotification(
                    employee_id=employee.id,
                    training_eligibility_id=eligibility.id,
                    message=employee_message,
                    is_read=False
                )
            )

        # 7. Notify the student
        student_notification = models.Notification(
            student_id=eligibility.student_id,
            application_id=None,
            message=(
                f"Your training courses are ready! "
                f"{len(created_courses)} course(s) have been created. "
                f"Visit View Courses to access them."
            ),
            is_read=False
        )

        db.add(student_notification)

        # 8. Log training eligibility approval
        log_action(
            db=db,
            user_id=employee.user_id,
            action="TRAINING_ELIGIBILITY_APPROVED",
            target_type="training_eligibility",
            target_id=eligibility.id,
            details=(
                f"Training eligibility approved. "
                f"{len(created_courses)} course(s) created."
            ),
        )

        # 9. Commit everything together
        db.commit()
        db.refresh(eligibility)


        return {
            "message": (
                "Training courses and questionnaires created successfully"
            ),
            "eligibility_id": eligibility.id,
            "status": eligibility.status,
            "total_courses": len(created_courses),
            "courses": created_courses
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to approve eligibility and create courses: "
                f"{str(e)}"
            )
        )


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

                # Log training course creation
        log_action(
            db=db,
            user_id=employee.user_id,
            action="TRAINING_COURSE_CREATED",
            target_type="training_course",
            target_id=course.id,
            details=f"Training course created for {course.job_role}",
        )

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

    log_action(
        db=db,
        user_id=employee.user_id,
        action="TRAINING_ELIGIBILITY_REJECTED",
        target_type="training_eligibility",
        target_id=eligibility.id,
        details="Training eligibility rejected by employee",
    )

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
        "email": current_user.email,
        "phone": current_user.phone,
        "date_of_birth": current_user.date_of_birth,
        "gender": current_user.gender,
        "address": current_user.address,
        "qualification": current_user.qualification,
        "department": current_user.department,
        "year_of_passing": current_user.year_of_passing,
        "skills": current_user.skills,
        "profile_photo": current_user.profile_photo,
        "is_placed": current_user.is_placed,
    }


@app.put("/student/my-profile")
async def update_my_student_profile(
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
    profile_photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    student=Depends(require_student),
):
    # Find linked User account
    user = db.query(models.User).filter(
        models.User.user_id == student.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Student user account not found",
        )

    # Check email uniqueness in User table
    existing_user = db.query(models.User).filter(
        models.User.email == email,
        models.User.user_id != student.user_id,
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    # Check email uniqueness in Student table
    existing_student = db.query(models.Student).filter(
        models.Student.email == email,
        models.Student.id != student.id,
    ).first()

    if existing_student:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    new_photo_path = None
    new_photo_relative_path = None
    old_photo_path = student.profile_photo

    # Process new profile photo if provided
    if profile_photo and profile_photo.filename:
        allowed_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
        }

        try:
            if profile_photo.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400,
                    detail="Only JPG and PNG images are allowed",
                )

            photo_data = await profile_photo.read()

            if len(photo_data) > 5 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail="Profile photo must be smaller than 5 MB",
                )

            if not photo_data:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded profile photo is empty",
                )

        finally:
            await profile_photo.close()

        upload_dir = (
            Path(__file__).resolve().parent
            / "uploads"
            / "student_profiles"
        )
        upload_dir.mkdir(parents=True, exist_ok=True)

        extension = allowed_types[profile_photo.content_type]
        filename = f"{uuid.uuid4().hex}{extension}"

        new_photo_path = upload_dir / filename
        new_photo_relative_path = (
            f"uploads/student_profiles/{filename}"
        )

        try:
            new_photo_path.write_bytes(photo_data)
        except Exception:
            new_photo_path.unlink(missing_ok=True)
            raise

    try:
        # Update Student table
        student.full_name = full_name
        student.email = email
        student.phone = phone
        student.date_of_birth = date_of_birth
        student.gender = gender
        student.address = address
        student.qualification = qualification
        student.department = department
        student.year_of_passing = year_of_passing
        student.skills = skills

        if new_photo_relative_path:
            student.profile_photo = new_photo_relative_path

        # Update linked User table
        user.name = full_name
        user.email = email

        log_action(
            db=db,
            user_id=student.user_id,
            action="STUDENT_DETAILS_UPDATED",
            target_type="student",
            target_id=student.id,
            details="Student updated their profile details.",
        )

        db.commit()
        db.refresh(student)

    except IntegrityError:
        db.rollback()

        if new_photo_path:
            new_photo_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=409,
            detail="Email is already registered",
        )

    except Exception:
        db.rollback()

        if new_photo_path:
            new_photo_path.unlink(missing_ok=True)

        raise

    # Delete old photo only after successful database commit
    if (
        new_photo_path
        and old_photo_path
        and old_photo_path != new_photo_relative_path
    ):
        old_photo_absolute_path = (
            Path(__file__).resolve().parent / old_photo_path
        )
        old_photo_absolute_path.unlink(missing_ok=True)

    return {
        "message": "Student profile updated successfully",
        "student": {
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
            "is_placed": student.is_placed,
        },
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

    log_action(
        db=db,
        user_id=student.user_id,
        action="STUDENT_PASSWORD_CHANGED",
        target_type="student",
        target_id=student.id,
        details="Student password changed",
    )

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

    log_action(
        db=db,
        user_id=admin.user_id,
        action="STUDENT_FEEDBACK_DELETED",
        target_type="student_feedback",
        target_id=feedback.feedback_id,
        details="Student feedback deleted by admin",
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

    # Log only when Placed status actually changes
    if was_placed != is_placed:
        log_action(
            db=db,
            user_id=current_user.user_id,
            action="PLACED_STATUS_UPDATED",
            target_type="student",
            target_id=current_user.id,
            details=(
                f"Placed status changed from "
                f"{was_placed} to {is_placed}"
            ),
        )

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Placed status updated successfully",
        "is_placed": current_user.is_placed,
    }

@app.get("/student/training-courses")
def get_student_training_courses(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    courses = (
        db.query(
            models.TrainingEnrollment,
            models.TrainingEligibility,
            models.TrainingCourse,
        )
        .join(
            models.TrainingEligibility,
            models.TrainingEligibility.id
            == models.TrainingEnrollment.eligibility_id
        )
        .join(
            models.TrainingCourse,
            models.TrainingCourse.id
            == models.TrainingEnrollment.course_id
        )
        .filter(
            models.TrainingEnrollment.student_id == student.id,
            models.TrainingEligibility.status == "Approved",
            models.TrainingCourse.status == "Active",
            models.TrainingEnrollment.status != "Completed"
        )
        
        .order_by(
            models.TrainingEnrollment.enrolled_at.desc()
        )
        .all()
    )

    return [
        {
            "enrollment_id": enrollment.id,
            "course_id": course.id,
            "job_role": course.job_role,
            "course_type": course.course_type,
            "enrolled_at": enrollment.enrolled_at,
        }
        for enrollment, eligibility, course in courses
    ]
@app.get("/student/training-courses/{enrollment_id}")
def get_student_training_course_details(
    enrollment_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    enrollment = (
        db.query(models.TrainingEnrollment)
        .filter(
            models.TrainingEnrollment.id == enrollment_id,
            models.TrainingEnrollment.student_id == student.id,
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail="Training course not found"
        )

    eligibility = (
        db.query(models.TrainingEligibility)
        .filter(
            models.TrainingEligibility.id == enrollment.eligibility_id,
            models.TrainingEligibility.status == "Approved",
        )
        .first()
    )

    if not eligibility:
        raise HTTPException(
            status_code=403,
            detail="Training course is not approved"
        )

    course = (
        db.query(models.TrainingCourse)
        .filter(
            models.TrainingCourse.id == enrollment.course_id
        )
        .first()
    )

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Training course not found"
        )

    return {
        "enrollment_id": enrollment.id,
        "course_id": course.id,
        "job_role": course.job_role,
        "course_type": course.course_type,
        "enrolled_at": enrollment.enrolled_at,
    }



@app.post("/student/training-analysis/analyze")
def analyze_student_interview(
    data: InterviewAnalysisCreate,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    # --------------------------------------------------
    # 1. VERIFY STUDENT ENROLLMENT
    # --------------------------------------------------

    enrollment = (
        db.query(models.TrainingEnrollment)
        .filter(
            models.TrainingEnrollment.id == data.enrollment_id,
            models.TrainingEnrollment.student_id == student.id,
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail="Training course not found"
        )

    # --------------------------------------------------
    # 2. VERIFY APPROVED ELIGIBILITY
    # --------------------------------------------------

    eligibility = (
        db.query(models.TrainingEligibility)
        .filter(
            models.TrainingEligibility.id == enrollment.eligibility_id,
            models.TrainingEligibility.status == "Approved",
        )
        .first()
    )

    if not eligibility:
        raise HTTPException(
            status_code=403,
            detail="Training course is not approved"
        )

    # --------------------------------------------------
    # 3. GET ASSIGNED COURSE
    # --------------------------------------------------

    course = (
        db.query(models.TrainingCourse)
        .filter(
            models.TrainingCourse.id == enrollment.course_id
        )
        .first()
    )

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Training course not found"
        )

    # --------------------------------------------------
    # 4. GET STUDENT'S ACTIVE RESUME
    # --------------------------------------------------

    resume = (
        db.query(models.Resume)
        .filter(
            models.Resume.student_id == student.id,
            models.Resume.is_active == "active",
        )
        .order_by(models.Resume.uploaded_at.desc())
        .first()
    )

    if not resume:
        raise HTTPException(
            status_code=400,
            detail="Please upload an active resume before analysis."
        )

    resume_path = os.path.join(
        UPLOADS_DIR,
        resume.file_path
    )

    if not os.path.exists(resume_path):
        raise HTTPException(
            status_code=404,
            detail="Resume file not found"
        )

    # --------------------------------------------------
    # 5. EXTRACT RESUME AND PERFORM AI ANALYSIS
    # --------------------------------------------------

    try:
        resume_text = extract_resume_text(resume_path)

        resume_skills = extract_resume_skills(
            resume_text
        )

        ai_result = analyze_interview_with_ai(
            job_role=course.job_role,
            course_type=course.course_type,
            resume_skills=resume_skills,
            interview_explanation=data.interview_explanation,
        )

    except Exception as e:
        print(f"Interview analysis error: {str(e)}")

        raise HTTPException(
            status_code=502,
            detail="Interview analysis failed. Please try again."
        )

    # --------------------------------------------------
    # 6. VALIDATE HOLISTIC AI ANALYSIS
    # --------------------------------------------------

    try:
        valid_analysis = validate_interview_analysis(
            ai_result,
            data.interview_explanation
        )

        print("\n========== VALIDATED AI ANALYSIS ==========")
        print(
            json.dumps(
                valid_analysis,
                indent=4,
                ensure_ascii=False
            )
        )
        print("========== END VALIDATED ANALYSIS ==========\n")

    except Exception as e:
        print(f"Interview validation error: {str(e)}")

        raise HTTPException(
            status_code=502,
            detail="Interview analysis validation failed. Please try again."
        )

        # --------------------------------------------------
    # 7. SAVE ANALYSIS HISTORY
    # --------------------------------------------------

    analysis = models.InterviewAnalysis(
        student_id=student.id,
        enrollment_id=enrollment.id,
        job_role=course.job_role,
        course_type=course.course_type,
        resume_skills=resume_skills,
        interview_explanation=data.interview_explanation,
    )

    try:
        db.add(analysis)
        db.flush()

        # Log interview analysis creation
        log_action(
            db=db,
            user_id=student.user_id,
            action="INTERVIEW_ANALYSIS_CREATED",
            target_type="interview_analysis",
            target_id=analysis.id,
            details="Student created an AI interview self-analysis",
        )

        db.commit()
        db.refresh(analysis)

    except Exception as e:
        db.rollback()

        print(f"Analysis database error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail="Failed to save interview analysis."
        )
    # --------------------------------------------------
    # 8. FORMAT HOLISTIC ANALYSIS FOR PDF
    # --------------------------------------------------

    generated_files = []

    try:
        combined_content = ""

        # ----------------------------------------------
        # MAIN PATTERNS
        # ----------------------------------------------

        combined_content += "\nMAIN INTERVIEW PATTERNS\n"
        combined_content += "=" * 50 + "\n\n"

        patterns = valid_analysis["main_patterns"]

        if patterns:
            for index, item in enumerate(patterns, start=1):

                combined_content += f"""
{index}. {item['pattern']}

Observation:
{item['observation']}

Why It Matters:
{item['why_it_matters']}

Confidence:
{item['confidence'].capitalize()}


"""
        else:
            combined_content += "No clear recurring patterns identified.\n\n"

        # ----------------------------------------------
        # POSSIBLE UNDERLYING REASONS
        # ----------------------------------------------

        combined_content += "\nPOSSIBLE UNDERLYING REASONS\n"
        combined_content += "=" * 50 + "\n\n"

        reasons = valid_analysis["possible_underlying_reasons"]

        if reasons:
            for index, item in enumerate(reasons, start=1):

                combined_content += f"""
{index}. {item['reason']}

Explanation:
{item['explanation']}

Supporting Observation:
{item['supporting_observation']}

Confidence:
{item['confidence'].capitalize()}


"""
        else:
            combined_content += "No sufficiently supported underlying reasons identified.\n\n"

        # ----------------------------------------------
        # UNNOTICED INSIGHTS
        # ----------------------------------------------

        combined_content += "\nUNNOTICED INSIGHTS\n"
        combined_content += "=" * 50 + "\n\n"

        insights = valid_analysis["unnoticed_insights"]

        if insights:
            for index, item in enumerate(insights, start=1):

                combined_content += f"""
{index}. {item['insight']}

Explanation:
{item['explanation']}

Practical Tip:
{item['practical_tip']}


"""
        else:
            combined_content += "No additional insights identified.\n\n"

        # ----------------------------------------------
        # IMPROVEMENT PRIORITIES
        # ----------------------------------------------

        combined_content += "\nIMPROVEMENT PRIORITIES\n"
        combined_content += "=" * 50 + "\n\n"

        priorities = valid_analysis["improvement_priorities"]

        if priorities:
            for index, item in enumerate(priorities, start=1):

                combined_content += f"""
{index}. {item['priority']}

Action:
{item['action']}

Practice:
{item['practice']}


"""
        else:
            combined_content += "No specific improvement priorities identified.\n\n"

        # ----------------------------------------------
        # NEXT INTERVIEW STRATEGY
        # ----------------------------------------------

        combined_content += "\nNEXT INTERVIEW STRATEGY\n"
        combined_content += "=" * 50 + "\n\n"

        strategies = valid_analysis["next_interview_strategy"]

        if strategies:
            for index, strategy in enumerate(strategies, start=1):

                combined_content += f"{index}. {strategy}\n\n"
        else:
            combined_content += "No specific interview strategies generated.\n\n"

        # ----------------------------------------------
        # GENERATE PDF
        # ----------------------------------------------

        overall_assessment = valid_analysis["overall_assessment"]

        pdf_path = generate_analysis_pdf(
            heading="AI Interview Self-Analysis Report",
            description=overall_assessment,
            content=combined_content,
        )

        generated_files.append(pdf_path)

        # ----------------------------------------------
        # STORE RELATIVE PDF PATH
        # ----------------------------------------------

        relative_path = os.path.relpath(
            pdf_path,
            BASE_DIR
        )

        # ----------------------------------------------
        # SAVE ONE DATABASE REPORT RECORD
        # ----------------------------------------------

        report_record = models.InterviewAnalysisReport(
            analysis_id=analysis.id,
            heading="AI Interview Self-Analysis Report",
            description=overall_assessment,
            report_type="combined_analysis",
            pdf_path=relative_path,
        )

        db.add(report_record)
        db.commit()
        db.refresh(report_record)

    except Exception as e:
        db.rollback()

        for file_path in generated_files:
            if os.path.exists(file_path):
                os.remove(file_path)

        print(f"Report generation error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail="Failed to generate or save combined analysis report."
        )

    # --------------------------------------------------
    # 9. RETURN HOLISTIC ANALYSIS
    # --------------------------------------------------

    return {
        "message": "Interview self-analysis completed",
        "analysis_id": analysis.id,
        "overall_assessment": valid_analysis["overall_assessment"],
        "main_patterns": valid_analysis["main_patterns"],
        "possible_underlying_reasons": valid_analysis["possible_underlying_reasons"],
        "unnoticed_insights": valid_analysis["unnoticed_insights"],
        "improvement_priorities": valid_analysis["improvement_priorities"],
        "next_interview_strategy": valid_analysis["next_interview_strategy"],
        "resume_skills": resume_skills,
        "report": {
            "id": report_record.id,
            "heading": report_record.heading,
            "description": report_record.description,
            "report_type": report_record.report_type,
            "created_at": report_record.created_at,
        },
    }


@app.get("/student/training-analysis/{analysis_id}/reports")
def get_student_analysis_reports(
    analysis_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    analysis = (
        db.query(models.InterviewAnalysis)
        .filter(
            models.InterviewAnalysis.id == analysis_id,
            models.InterviewAnalysis.student_id == student.id,
        )
        .first()
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found"
        )

    report = (
        db.query(models.InterviewAnalysisReport)
        .filter(
            models.InterviewAnalysisReport.analysis_id == analysis.id
        )
        .order_by(
            models.InterviewAnalysisReport.id.desc()
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Analysis report not found"
        )

    return {
        "id": report.id,
        "analysis_id": report.analysis_id,
        "heading": report.heading,
        "description": report.description,
        "report_type": report.report_type,
        "created_at": report.created_at,
    }


@app.get("/student/training-analysis/reports/{report_id}/pdf")
def view_student_analysis_report(
    report_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    report = (
        db.query(models.InterviewAnalysisReport)
        .join(
            models.InterviewAnalysis,
            models.InterviewAnalysis.id
            == models.InterviewAnalysisReport.analysis_id,
        )
        .filter(
            models.InterviewAnalysisReport.id == report_id,
            models.InterviewAnalysis.student_id == student.id,
        )
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    pdf_path = os.path.join(
        BASE_DIR,
        report.pdf_path
    )

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=404,
            detail="PDF file not found"
        )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"interview_report_{report.id}.pdf",
        content_disposition_type="inline",
    )


@app.get("/student/training-courses")
def get_student_training_courses(
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):

    courses = (
        db.query(
            models.TrainingEnrollment,
            models.TrainingCourse
        )
        .join(
            models.TrainingCourse,
            models.TrainingCourse.id
            == models.TrainingEnrollment.course_id
        )
        .join(
            models.TrainingEligibility,
            models.TrainingEligibility.id
            == models.TrainingEnrollment.eligibility_id
        )
        .filter(
            models.TrainingEnrollment.student_id == student.id,
            models.TrainingEligibility.status == "Approved",
            models.TrainingCourse.status == "Active"
        )
        .order_by(
            models.TrainingEnrollment.enrolled_at.desc()
        )
        .all()
    )

    result = []

    for enrollment, course in courses:

        result.append({
            "enrollment_id": enrollment.id,
            "course_id": course.id,
            "eligibility_id": enrollment.eligibility_id,
            "job_role": course.job_role,
            "course_type": course.course_type,
            "course_status": course.status,
            "enrollment_status": enrollment.status,
            "enrolled_at": enrollment.enrolled_at,
            "completed_at": enrollment.completed_at
        })

    return {
        "total_courses": len(result),
        "courses": result
    }


@app.get("/student/training-courses/{course_id}/questionnaire")
def get_student_course_questionnaire(
    course_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    # Verify that this course belongs to the logged-in student
    enrollment = (
        db.query(models.TrainingEnrollment)
        .filter(
            models.TrainingEnrollment.course_id == course_id,
            models.TrainingEnrollment.student_id == student.id
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail="Training course not found."
        )

    # Fetch questionnaire
    questionnaire = (
        db.query(models.TrainingCourseQuestionnaire)
        .filter(
            models.TrainingCourseQuestionnaire.course_id == course_id
        )
        .first()
    )

    if not questionnaire:
        raise HTTPException(
            status_code=404,
            detail="Questionnaire not found for this course."
        )

    if questionnaire.generation_status != "Completed":
        raise HTTPException(
            status_code=409,
            detail="Questionnaire is not ready yet."
        )

    # Fetch all questions in order
    questions = (
        db.query(models.TrainingCourseQuestion)
        .filter(
            models.TrainingCourseQuestion.questionnaire_id
            == questionnaire.id
        )
        .order_by(
            models.TrainingCourseQuestion.question_number.asc()
        )
        .all()
    )

    return {
        "course_id": course_id,
        "questionnaire_id": questionnaire.id,
        "generation_status": questionnaire.generation_status,
        "total_questions": len(questions),
        "questions": [
            {
                "id": question.id,
                "question_number": question.question_number,
                "question_text": question.question_text
            }
            for question in questions
        ]
    }


@app.post("/student/training-courses/{course_id}/generate-pdf")
def generate_student_training_pdf(
    course_id: int,
    request: TrainingCourseSubmissionRequest,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    pdf_path = None

    try:
        # 1. Verify student's active enrollment
        enrollment = (
            db.query(models.TrainingEnrollment)
            .join(
                models.TrainingEligibility,
                models.TrainingEligibility.id
                == models.TrainingEnrollment.eligibility_id
            )
            .filter(
                models.TrainingEnrollment.course_id == course_id,
                models.TrainingEnrollment.student_id == student.id,
                models.TrainingEnrollment.status == "Active",
                models.TrainingEligibility.status == "Approved"
            )
            .first()
        )

        if not enrollment:
            raise HTTPException(
                status_code=404,
                detail="Active training enrollment not found."
            )

        # 2. Prevent duplicate submission
        existing_submission = (
            db.query(models.TrainingCourseSubmission)
            .filter(
                models.TrainingCourseSubmission.enrollment_id
                == enrollment.id
            )
            .first()
        )

        if existing_submission:
            raise HTTPException(
                status_code=409,
                detail="Questionnaire has already been submitted."
            )

        # 3. Get course details
        course = (
            db.query(models.TrainingCourse)
            .filter(models.TrainingCourse.id == course_id)
            .first()
        )

        if not course:
            raise HTTPException(
                status_code=404,
                detail="Training course not found."
            )

        # 4. Get completed questionnaire
        questionnaire = (
            db.query(models.TrainingCourseQuestionnaire)
            .filter(
                models.TrainingCourseQuestionnaire.course_id == course_id,
                models.TrainingCourseQuestionnaire.generation_status
                == "Completed"
            )
            .first()
        )

        if not questionnaire:
            raise HTTPException(
                status_code=409,
                detail="Questionnaire is not ready."
            )

        questions = (
            db.query(models.TrainingCourseQuestion)
            .filter(
                models.TrainingCourseQuestion.questionnaire_id
                == questionnaire.id
            )
            .order_by(
                models.TrainingCourseQuestion.question_number.asc()
            )
            .all()
        )

        if len(questions) != 20:
            raise HTTPException(
                status_code=409,
                detail="The questionnaire must contain exactly 20 questions."
            )

        # 5. Validate submitted answers
        if len(request.answers) != 20:
            raise HTTPException(
                status_code=400,
                detail="Exactly 20 answers are required."
            )

        answer_map = {}

        for item in request.answers:

            if item.question_id in answer_map:
                raise HTTPException(
                    status_code=400,
                    detail="Duplicate question answer detected."
                )

            if not item.answer.strip():
                raise HTTPException(
                    status_code=400,
                    detail="All 20 questions must be answered."
                )

            answer_map[item.question_id] = item.answer.strip()

        question_ids = {question.id for question in questions}

        if set(answer_map.keys()) != question_ids:
            raise HTTPException(
                status_code=400,
                detail="Submitted answers do not match this questionnaire."
            )

        # 6. Prepare question-answer pairs
        question_answers = []

        for question in questions:
            question_answers.append({
                "question_id": question.id,
                "question_number": question.question_number,
                "question_text": question.question_text,
                "answer": answer_map[question.id]
            })

        # 7. Retrieve resumes linked to this course
        resumes = (
            db.query(models.Resume)
            .join(
                models.Application,
                models.Application.resume_id
                == models.Resume.resume_id
            )
            .join(
                models.TrainingCourseApplication,
                models.TrainingCourseApplication.application_id
                == models.Application.application_id
            )
            .filter(
                models.TrainingCourseApplication.course_id == course_id,
                models.Application.student_id == student.id,
                models.Resume.student_id == student.id
            )
            .all()
        )

        if not resumes:
            raise HTTPException(
                status_code=409,
                detail="No resumes are linked to this training course."
            )

        # 8. Extract relevant resume text
        resume_texts = []
        processed_resume_ids = set()

        for resume in resumes:

            if resume.resume_id in processed_resume_ids:
                continue

            processed_resume_ids.add(resume.resume_id)

            if resume.extracted_text and resume.extracted_text.strip():
                resume_text = resume.extracted_text.strip()
            else:
                resume_text = extract_resume_text(resume.file_path)

            if resume_text.strip():
                resume_texts.append(resume_text)

        if not resume_texts:
            raise HTTPException(
                status_code=409,
                detail="No readable resume information is available."
            )

        # 9. Generate AI analysis
        try:
            analysis_text = analyze_training_questionnaire_with_ai(
                job_role=course.job_role,
                course_type=course.course_type,
                question_answers=question_answers,
                resume_texts=resume_texts
            )

        except Exception as ai_error:
            raise HTTPException(
                status_code=502,
                detail=f"AI questionnaire analysis failed: {str(ai_error)}"
            )

        # 10. Generate PDF
        try:
            pdf_path = generate_training_submission_pdf(
                job_role=course.job_role,
                question_answers=question_answers,
                analysis_text=analysis_text
            )

            if not os.path.isfile(pdf_path):
                raise FileNotFoundError(
                    "Generated PDF file was not found."
                )

        except Exception as pdf_error:
            raise HTTPException(
                status_code=500,
                detail=f"PDF generation failed: {str(pdf_error)}"
            )

                # 11. Save submission
        submission = models.TrainingCourseSubmission(
            enrollment_id=enrollment.id,
            answers=question_answers,
            analysis_result={
                "report_text": analysis_text
            },
            pdf_path=pdf_path,
            status="Generated",
            generated_at=datetime.now()
        )

        db.add(submission)
        db.flush()

        # Log training submission creation
        log_action(
            db=db,
            user_id=student.user_id,
            action="TRAINING_SUBMISSION_CREATED",
            target_type="training_course_submission",
            target_id=submission.id,
            details="Student submitted training questionnaire",
        )

        db.commit()
        db.refresh(submission)

        return {
            "message": "Questionnaire submitted and PDF generated successfully.",
            "submission_id": submission.id,
            "course_id": course.id,
            "enrollment_id": enrollment.id,
            "status": submission.status,
            "pdf_url": (
                f"/student/training-course-submissions/"
                f"{submission.id}/pdf"
            )
        }

    except HTTPException:
        db.rollback()

        if pdf_path and os.path.isfile(pdf_path):
            os.remove(pdf_path)

        raise

    except Exception as e:
        db.rollback()

        if pdf_path and os.path.isfile(pdf_path):
            os.remove(pdf_path)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate training submission: {str(e)}"
        )

@app.get("/student/training-course-submissions/{submission_id}/pdf")
def get_training_submission_pdf(
    submission_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    submission = (
        db.query(models.TrainingCourseSubmission)
        .join(
            models.TrainingEnrollment,
            models.TrainingEnrollment.id
            == models.TrainingCourseSubmission.enrollment_id
        )
        .filter(
            models.TrainingCourseSubmission.id == submission_id,
            models.TrainingEnrollment.student_id == student.id
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Training submission not found."
        )

    if not submission.pdf_path or not os.path.isfile(submission.pdf_path):
        raise HTTPException(
            status_code=404,
            detail="PDF file not found."
        )

    return FileResponse(
        path=submission.pdf_path,
        media_type="application/pdf",
        filename="Training_Questionnaire_Report.pdf",
        content_disposition_type="inline"
    )

@app.post("/student/training-courses/{course_id}/complete")
def complete_student_training_course(
    course_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    enrollment = (
        db.query(models.TrainingEnrollment)
        .join(
            models.TrainingCourse,
            models.TrainingCourse.id
            == models.TrainingEnrollment.course_id
        )
        .join(
            models.TrainingEligibility,
            models.TrainingEligibility.id
            == models.TrainingEnrollment.eligibility_id
        )
        .filter(
            models.TrainingEnrollment.course_id == course_id,
            models.TrainingEnrollment.student_id == student.id,
            models.TrainingCourse.status == "Active",
            models.TrainingEligibility.status == "Approved",
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail="Training course not found."
        )

    if enrollment.status == "Completed":
        return {
            "message": "Course already completed.",
            "status": "Completed"
        }

    if enrollment.status != "Active":
        raise HTTPException(
            status_code=400,
            detail="This enrollment is not active."
        )

    submission = (
        db.query(models.TrainingCourseSubmission)
        .filter(
            models.TrainingCourseSubmission.enrollment_id
            == enrollment.id,
            models.TrainingCourseSubmission.status == "Generated"
        )
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=400,
            detail="Please generate your course PDF before completing the course."
        )

    course = (
        db.query(models.TrainingCourse)
        .filter(models.TrainingCourse.id == course_id)
        .first()
    )

    enrollment.status = "Completed"
    enrollment.completed_at = func.now()

    notification = models.EmployeeNotification(
        employee_id=course.created_by,
        training_eligibility_id=None,
        training_course_id=course.id,
        message=f"A student has completed the training course for {course.job_role}."
    )

    db.add(notification)

    # Log training course completion
    log_action(
        db=db,
        user_id=student.user_id,
        action="TRAINING_COURSE_COMPLETED",
        target_type="training_enrollment",
        target_id=enrollment.id,
        details=f"Student completed training course for {course.job_role}",
    )

    db.commit()

    return {
        "message": "Training course completed successfully.",
        "course_id": course.id,
        "enrollment_id": enrollment.id,
        "status": "Completed"
    }

@app.get("/student/training-courses/{course_id}/submission")
def get_student_training_course_submission(
    course_id: int,
    db: Session = Depends(get_db),
    student: models.Student = Depends(require_student),
):
    enrollment = (
        db.query(models.TrainingEnrollment)
        .filter(
            models.TrainingEnrollment.course_id == course_id,
            models.TrainingEnrollment.student_id == student.id
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(
            status_code=404,
            detail="Training course not found."
        )

    submission = (
        db.query(models.TrainingCourseSubmission)
        .filter(
            models.TrainingCourseSubmission.enrollment_id == enrollment.id,
            models.TrainingCourseSubmission.status == "Generated"
        )
        .first()
    )

    if not submission:
        return {
            "exists": False
        }

    return {
        "exists": True,
        "submission_id": submission.id,
        "status": submission.status,
        "pdf_url": f"/student/training-course-submissions/{submission.id}/pdf"
    }

