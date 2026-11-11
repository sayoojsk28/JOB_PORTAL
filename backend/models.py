
from sqlalchemy import Column, Integer, String, Date , Text,BigInteger, ForeignKey, DateTime, func,Boolean,Time,Float
from sqlalchemy import text
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from database import Base
from sqlalchemy import JSON


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        unique=True,
        nullable=False
)
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
    profile_photo = Column(String(500), nullable=True)
    is_placed = Column(
    Boolean,
    nullable=False,
    default=False,
    server_default=text("false")
)
    training_rejection_baseline_at = Column(
    DateTime(timezone=True),
    nullable=True
)
    
    status = Column(String(20),nullable=False,default="Pending",server_default=text("'Pending'"))


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        unique=True,
        nullable=False
)
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

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, index=True, nullable=False)

    password_hash = Column(String(255), nullable=False)

    name = Column(String(100), nullable=False)

    role = Column(String(20), nullable=False)

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true")
    )

    last_login = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        unique=True,
        nullable=False
)
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

    extracted_text = Column(Text, nullable=True)
    extracted_skills = Column(JSON, nullable=True)

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

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    application_id = Column(
        Integer,
        ForeignKey("applications.application_id"),
        nullable=True
    )
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

class Interview(Base):
    __tablename__ = "interviews"

    interview_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    application_id = Column(
        Integer,
        ForeignKey("applications.application_id"),
        nullable=False,
        index=True
    )

    interview_date = Column(Date, nullable=False)

    interview_time = Column(Time, nullable=False)

    mode = Column(
        String(20),
        nullable=False
    )

    meeting_link_or_venue = Column(
        String(500),
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="Scheduled",
        server_default=text("'Scheduled'")
    )

    student_attendance = Column(
        String(30),
        nullable=False,
        default="Waiting",
        server_default=text("'Waiting'")
    )

    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    created_by = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

class InterviewResult(Base):
    __tablename__ = "interview_results"

    result_id = Column(Integer, primary_key=True, index=True)

    interview_id = Column(
        Integer,
        ForeignKey("interviews.interview_id"),
        nullable=False,
        unique=True,
        index=True
    )

    result = Column(String(30), nullable=False)

    score = Column(Float, nullable=True)

    feedback = Column(Text, nullable=True)

    published_on = Column(DateTime(timezone=True), nullable=True)

    is_published = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false")
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    action = Column(String(100), nullable=False)

    target_type = Column(String(50), nullable=True)

    target_id = Column(Integer, nullable=True)

    details = Column(Text, nullable=True)

    ip_address = Column(String(45), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True
    )

class EmployeeNotification(Base):
    __tablename__ = "employee_notifications"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "training_eligibility_id",
            name="uq_employee_training_notification"
        ),
    )

    notification_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )
    training_eligibility_id = Column(
    Integer,
    ForeignKey("training_eligibility.id"),
    nullable=True,
    index=True
)
    message = Column(String(500), nullable=False)
    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false")
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

class StudentFeedback(Base):
    __tablename__ = "student_feedback"

    feedback_id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    message = Column(String(500), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    student = relationship("Student")

class AdminNotificationRead(Base):
    __tablename__ = "admin_notification_reads"

    id = Column(Integer, primary_key=True, index=True)

    admin_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    feedback_id = Column(
        Integer,
        ForeignKey("student_feedback.feedback_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    seen_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "admin_id",
            "feedback_id",
            name="uq_admin_feedback_seen"
        ),
    )


class TrainingEligibility(Base):
    __tablename__ = "training_eligibility"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "cycle_number",
            name="uq_training_eligibility_student_cycle"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True,
    )

    rejected_application_count = Column(
        Integer,
        nullable=False,
        default=3,
    )

    cycle_number = Column(
        Integer,
        nullable=False,
        default=1,
    )

    status = Column(
        String(20),
        nullable=False,
        default="Pending",
        server_default=text("'Pending'"),
    )

    reviewed_by = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=True,
    )

    reviewed_at = Column(DateTime, nullable=True)

    claimed_by = Column(
    Integer,
    ForeignKey("employees.id"),
    nullable=True
    )

    claimed_at = Column(
    DateTime(timezone=True),
    nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

class TrainingCourse(Base):
    __tablename__ = "training_courses"
    __table_args__ = (
    UniqueConstraint(
        "eligibility_id",
        "job_role",
        name="uq_training_course_eligibility_role"
    ),
)

    id = Column(Integer, primary_key=True, index=True)

    course_type = Column(
        String(20),
        nullable=False,
    )

    job_role = Column(
        String(150),
        nullable=False,
    )

    created_by = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    status = Column(
        String(20),
        nullable=False,
        default="Active",
        server_default=text("'Active'"),
    )
    eligibility_id = Column(
    Integer,
    ForeignKey("training_eligibility.id"),
    nullable=True,
    index=True
    )


class TrainingCourseApplication(Base):
    __tablename__ = "training_course_applications"

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "application_id",
            name="uq_training_course_application"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    course_id = Column(
        Integer,
        ForeignKey("training_courses.id"),
        nullable=False,
        index=True
    )

    application_id = Column(
        Integer,
        ForeignKey("applications.application_id"),
        nullable=False,
        index=True
    )




class TrainingEnrollment(Base):
    __tablename__ = "training_enrollments"

    id = Column(Integer, primary_key=True, index=True)

    eligibility_id = Column(
        Integer,
        ForeignKey("training_eligibility.id"),
        nullable=False
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True
    )

    course_id = Column(
        Integer,
        ForeignKey("training_courses.id"),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="Active",
        server_default=text("'Active'")
    )

    enrolled_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    


class TrainingResume(Base):
    __tablename__ = "training_resumes"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True,
    )

    file_type = Column(
        String(50),
        nullable=False,
    )

    file_size = Column(
        BigInteger,
        nullable=False,
    )

    file_path = Column(
        String(500),
        nullable=False,
    )

    uploaded_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    processing_status = Column(
        String(20),
        nullable=False,
        default="Pending",
        server_default=text("'Pending'"),
    )

    extracted_skills = Column(
        Text,
        nullable=True,
    )
    extracted_text = Column(
    Text,
    nullable=True,
    )

class TrainingPart(Base):
    __tablename__ = "training_parts"

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id",
            "part_number",
            name="uq_training_part_enrollment_number"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    enrollment_id = Column(
        Integer,
        ForeignKey("training_enrollments.id"),
        nullable=False,
        index=True,
    )

    part_number = Column(
        Integer,
        nullable=False,
    )

    title = Column(
        String(150),
        nullable=False,
    )

    pdf_path = Column(
        String(500),
        nullable=True,
    )

    generation_status = Column(
        String(20),
        nullable=False,
        default="Pending",
        server_default=text("'Pending'"),
    )

    generated_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

class TrainingQuestion(Base):
    __tablename__ = "training_questions"

    id = Column(Integer, primary_key=True, index=True)

    part_id = Column(
        Integer,
        ForeignKey("training_parts.id"),
        nullable=False,
        index=True,
    )

    question = Column(
        Text,
        nullable=False,
    )

    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)

    correct_option = Column(
        String(1),
        nullable=False,
    )

    explanation = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

class TrainingAttempt(Base):
    __tablename__ = "training_attempts"

    id = Column(Integer, primary_key=True, index=True)

    part_id = Column(
        Integer,
        ForeignKey("training_parts.id"),
        nullable=False,
        index=True,
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True,
    )

    attempt_number = Column(
        Integer,
        nullable=False,
    )

    started_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    expires_at = Column(
        DateTime,
        nullable=False,
    )

    submitted_at = Column(
        DateTime,
        nullable=True,
    )

    score = Column(
        Integer,
        nullable=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="In Progress",
        server_default=text("'In Progress'"),
    )

class TrainingAttemptAnswer(Base):
    __tablename__ = "training_attempt_answers"

    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_attempt_question_answer"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(
        Integer,
        ForeignKey("training_attempts.id"),
        nullable=False,
        index=True,
    )

    question_id = Column(
        Integer,
        ForeignKey("training_questions.id"),
        nullable=False,
    )

    selected_option = Column(
        String(1),
        nullable=False,
    )

    answered_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

class InterviewAnalysis(Base):
    __tablename__ = "interview_analyses"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False,
        index=True
    )

    enrollment_id = Column(
        Integer,
        ForeignKey("training_enrollments.id"),
        nullable=False,
        index=True
    )

    job_role = Column(String(150), nullable=False)

    course_type = Column(String(20), nullable=False)

    resume_skills = Column(JSON, nullable=False)

    interview_explanation = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
class InterviewAnalysisReport(Base):
    __tablename__ = "interview_analysis_reports"

    id = Column(Integer, primary_key=True, index=True)

    analysis_id = Column(
        Integer,
        ForeignKey("interview_analyses.id"),
        nullable=False,
        index=True
    )

    heading = Column(String(200), nullable=False)

    description = Column(Text, nullable=False)

    report_type = Column(String(50), nullable=False)

    pdf_path = Column(String(500), nullable=False)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )


class TrainingQuestionnaire(Base):
    __tablename__ = "training_questionnaires"

    __table_args__ = (
        UniqueConstraint(
            "enrollment_id",
            name="uq_training_questionnaire_enrollment"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    enrollment_id = Column(
        Integer,
        ForeignKey("training_enrollments.id"),
        nullable=False,
        index=True,
    )

    resume_id = Column(
        Integer,
        ForeignKey("training_resumes.id"),
        nullable=False,
        index=True,
    )

    questions = Column(
        JSON,
        nullable=False,
    )

    answers = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    status = Column(
        String(20),
        nullable=False,
        default="Generated",
        server_default=text("'Generated'"),
    )

    generated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    submitted_at = Column(
        DateTime,
        nullable=True,
    )


class TrainingEligibilityApplication(Base):
    __tablename__ = "training_eligibility_applications"

    __table_args__ = (
        UniqueConstraint(
            "eligibility_id",
            "application_id",
            name="uq_training_eligibility_application"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    eligibility_id = Column(
        Integer,
        ForeignKey("training_eligibility.id"),
        nullable=False,
        index=True
    )

    application_id = Column(
        Integer,
        ForeignKey("applications.application_id"),
        nullable=False,
        index=True
    )


class TrainingCourseQuestionnaire(Base):
    __tablename__ = "training_course_questionnaires"

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            name="uq_training_course_questionnaire_course"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    course_id = Column(
        Integer,
        ForeignKey("training_courses.id"),
        nullable=False,
        index=True
    )

    generation_status = Column(
        String(20),
        nullable=False,
        default="Pending",
        server_default=text("'Pending'")
    )

    generated_at = Column(
        DateTime,
        nullable=True
    )


class TrainingCourseQuestion(Base):
    __tablename__ = "training_course_questions"

    __table_args__ = (
        UniqueConstraint(
            "questionnaire_id",
            "question_number",
            name="uq_course_question_number"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    questionnaire_id = Column(
        Integer,
        ForeignKey("training_course_questionnaires.id"),
        nullable=False,
        index=True
    )

    question_number = Column(Integer, nullable=False)

    question_text = Column(Text, nullable=False)

