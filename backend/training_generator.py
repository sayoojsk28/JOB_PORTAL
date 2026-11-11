import os
import json
import ollama
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.lib.units import inch

from sqlalchemy.orm import Session

import models
from database import SessionLocal





def generate_course_questionnaire(
    job_role: str,
    course_type: str,
    resume_texts: list[str]
) -> list[str]:

    combined_resumes = "\n\n".join(
        f"Candidate Resume {index + 1}:\n{text}"
        for index, text in enumerate(resume_texts)
        if text and text.strip()
    )

    if course_type not in ["Coding", "Non-Coding"]:
        raise ValueError("Invalid course type")

    if not combined_resumes.strip():
        combined_resumes = "No resume details available."

    if course_type == "Coding":
        batch_topics = [
            "Job-role-specific technical knowledge and concepts.",
            "Practical application of resume skills. Distinguish theoretical knowledge from actual experience.",
            "Projects, candidate contributions, technical decisions, implementation and challenges.",
            "Coding problem-solving, logical thinking, debugging, communication and teamwork."
        ]
    else:
        batch_topics = [
            "Job-role-specific knowledge and actual responsibilities.",
            "Practical application of resume skills and work experience.",
            "Projects, candidate contributions, decisions and challenges.",
            "Workplace scenarios, problem-solving, communication and teamwork. Do not include coding."
        ]

    all_questions = []

    for batch_number, topic in enumerate(batch_topics, start=1):

        prompt = f"""
You are a senior company interviewer and career mentor.

Prepare exactly 5 descriptive interview questions for a
candidate who was rejected during recruitment.

Job Role:
{job_role}

Course Type:
{course_type}

Candidate Resume Details:
{combined_resumes}

Focus for this batch:
{topic}

Interview requirements:

1. Questions must sound like real questions asked by an
   experienced company interviewer.
2. Questions must require descriptive answers and reasoning.
3. Avoid textbook-style and definition-only questions.
4. Use actual resume skills, projects and job responsibilities.
5. Ask about practical experience, decisions and problem-solving.
6. Never invent projects or experience absent from the resume.
7. Do not repeat questions.
8. Do not generate MCQs, options, answers or explanations.
9. Generate exactly 5 questions.
10. Each question must be a complete interview question.

Return ONLY valid JSON:

{{
    "questions": [
        "Question 1",
        "Question 2",
        "Question 3",
        "Question 4",
        "Question 5"
    ]
}}

Return exactly 5 strings in the questions array.
"""

        batch_questions = None
        last_error = None

        # Retry a batch if the AI output is invalid
        for attempt in range(3):

            try:
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
                        "temperature": 0.3,
                        "num_predict": 1200
                    }
                )

                result = json.loads(
                    response["message"]["content"].strip()
                )

                questions = result.get("questions")

                if (
                    not isinstance(questions, list)
                    or len(questions) != 5
                ):
                    raise ValueError(
                        "AI must generate exactly 5 questions"
                    )

                if not all(
                    isinstance(q, str) and q.strip()
                    for q in questions
                ):
                    raise ValueError(
                        "AI returned empty or invalid questions"
                    )

                cleaned_questions = [
                    q.strip() for q in questions
                ]

                existing = {
                    q.casefold() for q in all_questions
                }

                if any(
                    q.casefold() in existing
                    for q in cleaned_questions
                ):
                    raise ValueError(
                        "AI generated duplicate questions"
                    )

                if len({
                    q.casefold() for q in cleaned_questions
                }) != 5:
                    raise ValueError(
                        "Duplicate questions within batch"
                    )

                batch_questions = cleaned_questions
                break

            except Exception as error:
                last_error = error

        if batch_questions is None:
            raise ValueError(
                f"Question batch {batch_number} failed: "
                f"{str(last_error)}"
            )

        all_questions.extend(batch_questions)

    if len(all_questions) != 20:
        raise ValueError(
            "Questionnaire must contain exactly 20 questions"
        )

    return all_questions



def generate_training_submission_pdf(
    job_role: str,
    question_answers: list,
    analysis_text: str
) -> str:

    import os
    import uuid
    import re

    from xml.sax.saxutils import escape

    from reportlab.lib import colors
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
        HRFlowable
    )

    # PDF directory
    base_dir = os.path.dirname(os.path.abspath(__file__))

    output_dir = os.path.join(
        base_dir,
        "training_documents",
        "training_course_reports"
    )

    os.makedirs(output_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(output_dir, filename)

    # Colors
    navy = colors.HexColor("#17365D")
    blue = colors.HexColor("#1F4E79")
    grey = colors.HexColor("#444444")
    light_grey = colors.HexColor("#D9E2F3")

    # Styles
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TrainingReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=25,
        alignment=1,
        textColor=navy,
        spaceAfter=12
    )

    role_style = ParagraphStyle(
        "TrainingRole",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        alignment=1,
        textColor=grey,
        spaceAfter=20
    )

    section_style = ParagraphStyle(
        "TrainingSection",
        parent=styles["Heading2"],
        fontSize=13,
        leading=18,
        textColor=navy,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    report_style = ParagraphStyle(
        "TrainingAnalysis",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=15,
        textColor=grey,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        "TrainingBullet",
        parent=report_style,
        leftIndent=18,
        firstLineIndent=0,
        spaceAfter=5
    )

    numbered_style = ParagraphStyle(
        "TrainingNumbered",
        parent=report_style,
        leftIndent=18,
        firstLineIndent=0,
        spaceAfter=5
    )

    story = []

    # Convert inline Markdown formatting into ReportLab formatting.
    def format_inline(text):

        text = escape(text)

        # Remove Markdown links but retain their visible text.
        text = re.sub(
            r"\[([^\]]+)\]\([^)]+\)",
            r"\1",
            text
        )

        # Bold text
        text = re.sub(
            r"\*\*(.+?)\*\*",
            r"<b>\1</b>",
            text
        )

        # Italic text
        text = re.sub(
            r"(?<!\*)\*([^*]+)\*(?!\*)",
            r"<i>\1</i>",
            text
        )

        # Inline code formatting
        text = re.sub(
            r"`([^`]+)`",
            r"<font name='Courier'>\1</font>",
            text
        )

        return text

    # Recognized report section headings
    section_headings = {
        "overall assessment",
        "demonstrated strengths",
        "knowledge gaps",
        "resume and answer alignment",
        "improvement priorities",
        "final learning recommendation"
    }

    # Title
    story.append(
        Paragraph(
            "Training Assessment Report",
            title_style
        )
    )

    story.append(
        Paragraph(
            escape(job_role),
            role_style
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.8,
            color=light_grey,
            spaceAfter=15
        )
    )

    # Process only the AI-generated assessment.
    # Original questionnaire questions and answers are not included.
    for raw_line in analysis_text.splitlines():

        line = raw_line.strip()

        if not line:
            story.append(Spacer(1, 4))
            continue

        # Skip Markdown horizontal rules.
        if re.fullmatch(r"[-*_]{3,}", line):
            story.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=light_grey,
                    spaceBefore=5,
                    spaceAfter=8
                )
            )
            continue

        # Detect Markdown headings.
        heading_match = re.match(
            r"^#{1,6}\s+(.+)$",
            line
        )

        if heading_match:
            heading_text = heading_match.group(1).strip()

            story.append(
                Paragraph(
                    format_inline(heading_text),
                    section_style
                )
            )
            continue

        # Detect numbered report section headings.
        clean_heading = re.sub(
            r"^\d+[\.)]\s*",
            "",
            line
        )

        clean_heading = clean_heading.replace("**", "").strip()
        clean_heading = clean_heading.replace("*", "").strip()

        if clean_heading.lower() in section_headings:

            story.append(
                Paragraph(
                    format_inline(clean_heading),
                    section_style
                )
            )
            continue

        # Detect bullet points.
        bullet_match = re.match(
            r"^[-*+]\s+(.+)$",
            line
        )

        if bullet_match:

            bullet_text = bullet_match.group(1)

            story.append(
                Paragraph(
                    format_inline(bullet_text),
                    bullet_style,
                    bulletText="•"
                )
            )
            continue

        # Detect numbered lists.
        numbered_match = re.match(
            r"^(\d+)[.)]\s+(.+)$",
            line
        )

        if numbered_match:

            number = numbered_match.group(1)
            content = numbered_match.group(2)

            story.append(
                Paragraph(
                    f"{number}. {format_inline(content)}",
                    numbered_style
                )
            )
            continue

        # Normal paragraph.
        story.append(
            Paragraph(
                format_inline(line),
                report_style
            )
        )

    # Build PDF
    document = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title=f"Training Assessment - {job_role}",
        author="Job Portal AI"
    )

    document.build(story)

    return file_path


def analyze_training_questionnaire_with_ai(
    job_role: str,
    course_type: str,
    question_answers: list,
    resume_texts: list
) -> str:

    import re
    import ollama

    # Prepare questionnaire content
    questionnaire_text = ""

    for item in question_answers:
        questionnaire_text += (
            f"\nQuestion {item['question_number']}: "
            f"{item['question_text']}\n"
            f"Student Answer: {item['answer']}\n"
        )

    # Prepare resume context
    resume_context = "\n\n".join(
        text.strip()
        for text in resume_texts
        if isinstance(text, str) and text.strip()
    )

    if not resume_context:
        resume_context = "No readable resume information available."

    
    system_prompt = """
You are an experienced technical and professional skills assessor.

Your task is to evaluate a student's technical knowledge,
practical understanding and professional skills based on
their training questionnaire answers.

STRICT EVALUATION RULES:

1. Student answers are the PRIMARY evidence for your analysis.

2. Resume information is only supporting context.

3. Never assume that a student possesses a skill merely because
   it appears in their resume.

4. Never invent experience, projects, achievements, technical
   knowledge or qualifications.

5. Evaluate all questionnaire answers collectively to understand
   the student's overall knowledge and abilities.

6. Group related observations under common topics or headings.
   For example, if multiple answers demonstrate Python knowledge,
   consolidate those observations under one Python-related heading
   instead of repeating similar assessments for individual questions.

7. Avoid repeating the same strength, weakness or observation
   in multiple sections.

8. Distinguish clearly between:
   - Knowledge demonstrated through answers.
   - Skills mentioned in the resume.
   - Areas where evidence is insufficient.

9. Do not treat an unanswered or unclear explanation as proof
   that a student lacks the skill.

10. Do not give generic praise. Every observation must be grounded
    in the student's answers or available resume information.

11. Do not reproduce the original questionnaire questions or
    student answers in the assessment report.

12. Do not generate additional questions or interview questions.

13. Do not make hiring decisions or predict future success.

14. If evidence is insufficient, explicitly state that.

REPORT FORMAT:

1. Overall Assessment
   Provide a balanced summary of the student's demonstrated
   understanding, technical ability and practical knowledge.

2. Demonstrated Strengths
   Identify the student's demonstrated strengths.
   Group related skills and observations under meaningful
   common headings instead of evaluating every question separately.
   Mention relevant question numbers as evidence where appropriate.

3. Knowledge Gaps
   Identify incorrect, incomplete or unclear explanations.
   Group related gaps under common headings.
   Mention relevant question numbers as supporting references.
   Do not interpret insufficient evidence as confirmed lack
   of knowledge.

4. Resume and Answer Alignment
   Compare relevant resume skills and experience with what
   the student actually demonstrated in their answers.
   Clearly distinguish verified understanding from resume claims.

5. Improvement Priorities
   Identify specific areas that need further learning or practice.
   Consolidate related improvement areas and avoid duplication.

6. Final Learning Recommendation
   Give a concise, practical recommendation describing what
   the student should focus on next.

REPORT WRITING RULES:

- Do not reproduce questionnaire questions.
- Do not reproduce student answers.
- Do not create a separate assessment for every question.
- Organize related findings under common descriptive headings.
- Use question numbers only as references when useful.
- Avoid duplicate or repetitive observations.
- Use clear, professional and understandable language.
- Keep the report focused on the student's actual evidence.
- Do not include unrelated sections.
- Do not use Markdown formatting symbols such as #, **, *,
  or - in the generated report.
- Use plain text with clear section headings.
"""


    
    user_prompt = f"""
JOB ROLE:
{job_role}

COURSE TYPE:
{course_type}

STUDENT QUESTIONNAIRE ANSWERS:
{questionnaire_text}

RELEVANT RESUME CONTEXT:
{resume_context}

Prepare a consolidated assessment report using only the
information provided above.

Analyse all answers together and organize related observations
under common headings.

Do not reproduce the questionnaire questions or student answers.

Mention question numbers only when they are useful as evidence
for a particular observation.

Avoid repeating similar findings across different sections.

Remember:
- Student answers are the primary evidence.
- Resume information is supporting context only.
- Do not invent missing information.
- Clearly distinguish demonstrated knowledge from resume claims.
- State when available evidence is insufficient.
- Follow the exact six-section report format.
- Use plain text without Markdown formatting symbols.
"""


    response = ollama.chat(
        model="qwen3:8b",
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        options={
            "temperature": 0.2,
            "num_predict": 2200
        }
    )

    analysis_text = response["message"]["content"].strip()

    # Remove Qwen thinking tags if present
    analysis_text = re.sub(
        r"<think>.*?</think>",
        "",
        analysis_text,
        flags=re.DOTALL
    ).strip()

    if not analysis_text:
        raise ValueError(
            "AI returned an empty questionnaire analysis."
        )

    return analysis_text

