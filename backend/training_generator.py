import os
import json
from gemini_service import generate_gemini_json, generate_gemini_text

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
                result = generate_gemini_json(
                    prompt=prompt,
                    temperature=0.3,
                    max_output_tokens=1200,
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


def generate_mock_interview_questions(
    job_role: str,
    course_type: str,
    resume_texts: list[str]
) -> list[str]:

    import json

    combined_resumes = "\n\n".join(
        f"Candidate Resume {index + 1}:\n{text}"
        for index, text in enumerate(resume_texts)
        if text and text.strip()
    )

    if not job_role or not job_role.strip():
        raise ValueError("Invalid job role")

    if course_type not in ["Coding", "Non-Coding"]:
        raise ValueError("Invalid course type")

    if not combined_resumes.strip():
        raise ValueError("No resume information available")

    coding_instruction = (
        "Include technical problem-solving, coding concepts, "
        "debugging and practical implementation where relevant."
        if course_type == "Coding"
        else
        "Focus on job-role knowledge, practical skills and "
        "workplace scenarios. Do not ask coding questions."
    )

    prompt = f"""
You are an experienced technical interviewer conducting
a real company mock interview.

Generate exactly 5 technical interview questions.

Job Role:
{job_role}

Course Type:
{course_type}

Candidate Resume:
{combined_resumes}

Requirements:

1. Questions must be based on the candidate's actual resume.
2. Focus on technical skills, projects and practical experience.
3. Questions must require reasoning and descriptive answers.
4. Prefer questions that test actual understanding.
5. Include practical scenarios where appropriate.
6. Do not invent skills, projects or work experience.
7. Do not generate definition-only questions.
8. Do not generate MCQs, answers or explanations.
9. Do not repeat questions.
10. Each question must be suitable for a spoken interview.
11. {coding_instruction}

Return only valid JSON:

{{
    "questions": [
        "Question 1",
        "Question 2",
        "Question 3",
        "Question 4",
        "Question 5"
    ]
}}

Return exactly 5 questions.
"""

    last_error = None

    for attempt in range(3):
        try:
            result = generate_gemini_json(
                prompt=prompt,
                temperature=0.3,
                max_output_tokens=1200,
            )

            questions = result.get("questions")

            if not isinstance(questions, list) or len(questions) != 5:
                raise ValueError(
                    "AI must generate exactly 5 questions"
                )

            cleaned_questions = []

            for question in questions:
                if not isinstance(question, str) or not question.strip():
                    raise ValueError("Invalid question generated")

                cleaned_questions.append(question.strip())

            if len({
                question.casefold()
                for question in cleaned_questions
            }) != 5:
                raise ValueError("Duplicate questions generated")

            return cleaned_questions

        except Exception as error:
            last_error = error

    raise ValueError(
        f"Mock interview question generation failed: {str(last_error)}"
    )

def generate_hr_interview_questions(
    job_role: str,
    course_type: str
) -> list[str]:

    import json

    if not job_role or not job_role.strip():
        raise ValueError("Invalid job role")

    if course_type not in ["Coding", "Non-Coding"]:
        raise ValueError("Invalid course type")

    prompt = f"""
You are an experienced HR interviewer conducting
a professional company mock interview.

Generate exactly 4 non-technical HR interview questions.

Job Role:
{job_role}

Course Type:
{course_type}

Requirements:

1. Questions must be relevant to the job role.
2. Focus on communication, teamwork, adaptability,
   responsibility, problem-solving approach,
   handling challenges and workplace behaviour.
3. Questions must encourage descriptive answers.
4. Questions must be suitable for a spoken interview.
5. Questions must be appropriate for a fresher or
   entry-level candidate.
6. Do not ask technical, coding or knowledge-based questions.
7. Do not ask questions based on the candidate's resume.
8. Do not ask questions based on personal conversations
   or Self Discovery Studio answers.
9. Avoid generic questions that only require Yes/No answers.
10. Do not generate answers, explanations or MCQs.
11. Do not repeat questions.

Return only valid JSON:

{{
    "questions": [
        "Question 1",
        "Question 2",
        "Question 3",
        "Question 4"
    ]
}}

Return exactly 4 questions.
"""

    last_error = None

    for attempt in range(3):
        try:
            result = generate_gemini_json(
                prompt=prompt,
                temperature=0.3,
                max_output_tokens=1000,
            )

            questions = result.get("questions")

            if not isinstance(questions, list) or len(questions) != 4:
                raise ValueError(
                    "AI must generate exactly 4 HR questions"
                )

            cleaned_questions = []

            for question in questions:
                if not isinstance(question, str) or not question.strip():
                    raise ValueError("Invalid HR question generated")

                cleaned_questions.append(question.strip())

            if len({
                question.casefold()
                for question in cleaned_questions
            }) != 4:
                raise ValueError("Duplicate HR questions generated")

            return cleaned_questions

        except Exception as error:
            last_error = error

    raise ValueError(
        f"HR question generation failed: {str(last_error)}"
    )



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


    analysis_text = generate_gemini_text(
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=0.2,
        max_output_tokens=2200,
    )

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



def evaluate_mock_interview_answer(
    question: str,
    answer: str,
    job_role: str,
    course_type: str,
    question_type: str
) -> dict:

    if not question.strip():
        raise ValueError("Question cannot be empty")

    if not answer.strip():
        raise ValueError("Answer cannot be empty")

    evaluation_criteria = {
        "Introduction": """
Evaluation criteria:

1. Introduction quality (0-40):
Evaluate whether the candidate introduces themselves appropriately,
covers their educational background, skills and interests,
and presents relevant information.

2. Relevance (0-20):
Evaluate how relevant the introduction is to the job role.

3. Self-awareness and completeness (0-20):
Evaluate whether the candidate demonstrates awareness of their
skills, learning journey, interests and career direction.

4. Explanation clarity (0-10):
Evaluate whether the introduction is understandable,
natural and logically structured.
""",

        "Technical": """
Evaluation criteria:

1. Technical correctness (0-40):
Evaluate whether the technical information is accurate.

2. Relevance (0-20):
Evaluate how directly the answer addresses the question.

3. Technical understanding and depth (0-20):
Evaluate practical understanding, reasoning and depth.

4. Explanation clarity (0-10):
Evaluate whether the explanation is understandable
and logically structured.
""",

        "HR": """
Evaluation criteria:

1. Answer quality (0-40):
Evaluate the quality of the candidate's response,
including the situation described, actions taken,
reasoning and outcome where applicable.

2. Relevance (0-20):
Evaluate how directly the answer addresses the HR question
and its relevance to the workplace.

3. Reasoning and practical judgment (0-20):
Evaluate the candidate's reasoning, approach to challenges,
decision-making and ability to reflect.

4. Explanation clarity (0-10):
Evaluate whether the answer is understandable,
coherent and logically structured.

Do not require a specific framework such as STAR.
Accept answers that explain the situation and approach naturally.
Do not penalize candidates for lacking professional experience
when they provide relevant academic, personal or project examples.
"""
    }

    if question_type not in evaluation_criteria:
        raise ValueError("Invalid interview question type")

    prompt = f"""
You are an experienced interviewer evaluating an entry-level candidate.

Evaluate the candidate's answer objectively using the criteria
specifically designed for the question type.

Job Role:
{job_role}

Course Type:
{course_type}

Question Type:
{question_type}

Interview Question:
{question}

Candidate's Answer:
{answer}

{evaluation_criteria[question_type]}

Important rules:

- Evaluate the meaning and intent of the complete answer.
- Do not penalize hesitation, repeated words or self-correction
  when they do not affect the actual answer.
- Do not assume missing skills or experience.
- Do not reward incorrect technical claims in technical questions.
- Accept technically valid alternative approaches.
- Do not expect an advanced answer from a junior candidate
  when a correct basic explanation is sufficient.
- For HR questions, evaluate the answer's quality and reasoning,
  not whether the candidate gives a perfect or ideal response.
- For introduction questions, do not expect the candidate
  to answer unrelated technical questions.
- If the candidate says "I don't know", evaluate the answer
  honestly without inventing knowledge.
- Do not penalize lack of professional experience if relevant
  academic, personal or project experiences are provided.
- Never infer personality, intelligence or mental state.
- Never invent details that are not present in the answer.
- Feedback must be specific to the candidate's actual answer.
- Scores must reflect the criteria, not personal preference.

Return ONLY valid JSON:

{{
    "technical_correctness": 0,
    "relevance": 0,
    "technical_depth": 0,
    "explanation_clarity": 0,
    "feedback": "Specific feedback explaining strengths and weaknesses"
}}

All scores must be numeric and within their respective limits.
"""

    last_error = None

    for attempt in range(3):
        try:
            result = generate_gemini_json(
                prompt=prompt,
                temperature=0.1,
                max_output_tokens=700,
            )

            score_limits = {
                "technical_correctness": 40,
                "relevance": 20,
                "technical_depth": 20,
                "explanation_clarity": 10
            }

            for key, maximum in score_limits.items():
                value = result.get(key)

                if (
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not 0 <= value <= maximum
                ):
                    raise ValueError(
                        f"Invalid score for {key}"
                    )

            feedback = result.get("feedback")

            if (
                not isinstance(feedback, str)
                or not feedback.strip()
            ):
                raise ValueError("Invalid evaluation feedback")

            result["ai_score"] = round(
                sum(result[key] for key in score_limits),
                2
            )

            return result

        except Exception as error:
            last_error = error

    raise ValueError(
        f"Mock interview evaluation failed: {str(last_error)}"
    )




def generate_self_discovery_response(
    job_role: str,
    course_type: str,
    resume_text: str,
    conversation_history: list[dict],
    mode: str,
    student_message: str | None = None
) -> dict:

    if not job_role or not job_role.strip():
        raise ValueError("Invalid job role")

    if course_type not in ["Coding", "Non-Coding"]:
        raise ValueError("Invalid course type")

    if not isinstance(conversation_history, list):
        raise ValueError("Invalid conversation history")

    if student_message is not None and not student_message.strip():
        raise ValueError("Student message cannot be empty")

    mode_instructions = {
        "interests_motivations": """
Explore the student's genuine interests and motivations.

You can discuss:
- Subjects and activities they enjoy.
- Topics they are naturally curious about.
- What attracts them to particular activities.
- Career interests and personal goals.
- What encourages them to learn and improve.
- What makes an activity meaningful to them.

Help the student understand their interests without making assumptions.
Explore topics naturally and provide useful information when requested.
""",

        "preferences_work_style": """
Explore the student's personal preferences and working style.

You can discuss:
- Preferred learning methods.
- Individual work versus teamwork.
- Preferred working environments.
- Communication preferences.
- Approaches to tasks and responsibilities.
- Organising and managing work.
- Conditions that help them work comfortably.

Respect different working styles. Do not assume one style is better.
Offer practical suggestions when the student asks for guidance.
""",

        "experiences_strengths": """
Explore the student's real experiences and personal strengths.

You can discuss:
- Academic and personal experiences.
- Projects and practical activities.
- Situations where they solved problems.
- Responsibilities they have handled.
- Skills they have developed.
- Strengths they personally recognise.
- Real examples that demonstrate those strengths.

Use relevant resume details as context, not as proof of personal strengths.
Help the student recognise and understand their experiences.
Provide explanations and practical guidance when requested.
""",

        "challenges_self_reflection": """
Help the student reflect on challenges and personal development.

You can discuss:
- Difficult situations they have experienced.
- Areas where they find tasks difficult.
- Problems they have tried to overcome.
- How they respond to mistakes.
- Learning from difficulties.
- Improvement efforts and lessons learned.
- Skills and habits they would like to develop.

When the student asks how to solve a problem, provide actual
solutions, practical strategies and examples.

For example, if the student struggles with perfectionism,
explain practical approaches such as setting realistic deadlines,
breaking tasks into smaller steps, prioritising completion,
and learning to accept reasonable progress.

Do not merely acknowledge the problem and ask the student
to explain it again.

Never diagnose, judge or label the student.
Never assume weaknesses or personal difficulties.
"""
    }

    if mode not in mode_instructions:
        raise ValueError("Invalid Self Discovery mode")

    category_instruction = (
        "The student is preparing for a coding-related job. "
        "Technical projects, programming and problem-solving may "
        "be relevant when naturally connected to the conversation. "
        "Never assume the student enjoys coding."
        if course_type == "Coding"
        else
        "The student is preparing for a non-coding job. "
        "Workplace responsibilities, communication and teamwork "
        "may be relevant when naturally connected to the conversation. "
        "Never assume the student's interests or strengths."
    )

    history_items = [
        item for item in conversation_history
        if item.get("role") in ["user", "assistant"]
    ]

    if student_message is not None:
        history_items.append({
            "role": "user",
            "content": student_message
        })

    history_text = "\n".join(
        f"{'Student' if item.get('role') == 'user' else 'AI'}: "
        f"{item.get('content', '')}"
        for item in history_items
    )

    prompt = f"""
CURRENT SELF DISCOVERY MODE:
{mode}

MODE-SPECIFIC PURPOSE:
{mode_instructions[mode]}

JOB ROLE:
{job_role}

COURSE TYPE:
{course_type}

CATEGORY-SPECIFIC GUIDANCE:
{category_instruction}

CANDIDATE RESUME:
{resume_text if resume_text else "No resume information available."}

CONVERSATION HISTORY FOR THE CURRENT MODE ONLY:
{history_text if history_text.strip() else "No conversation yet."}

YOUR ROLE:

You are an expert Interview Analyst, Researcher, and
Psychology-informed Career Development Guide.

You are helping a student who has experienced three interview
rejections. Your responsibility is to provide meaningful,
personalised support and help the student improve their
non-technical skills, self-awareness, confidence, communication,
working style and personal development.

You must adapt your approach according to the Self Discovery
mode selected by the student.

You should:
- Understand the student's actual situation before making suggestions.
- Analyse their responses thoughtfully.
- Identify relevant areas for improvement without making assumptions.
- Provide practical, realistic and actionable guidance.
- Explain solutions clearly with examples whenever useful.
- Answer questions directly.
- Help the student understand themselves and develop better approaches.
- Be supportive, respectful, honest and constructive.
- Use psychology-informed principles without diagnosing mental
  health conditions or pretending to be a clinical psychologist.

You are NOT an interviewer conducting another interview.
You are NOT a questionnaire.
You are NOT required to ask a question after every response.

CONVERSATION RULES:

1. Understand the student's latest message and the relevant
   conversation history before responding.

2. If the student asks a question, answer it directly.

3. If the student asks for solutions, provide solutions.

4. If the student requests advice, provide meaningful advice
   tailored to their situation.

5. If the student asks for examples, give relevant examples.

6. If the student shares an experience, analyse it thoughtfully
   and help them understand it.

7. Never avoid answering a question by asking another question.

8. Follow-up questions are optional. Ask them only when they
   genuinely help understand the student or continue a meaningful
   discussion.

9. Never repeat a question the student has already answered.

10. Do not give generic motivational responses or superficial
    acknowledgements when meaningful help is needed.

11. Do not behave like a scripted interviewer.

12. Allow the student to lead the conversation naturally.

PRACTICAL GUIDANCE:

- Break complicated suggestions into understandable steps.
- Give realistic examples where useful.
- Explain why a suggestion may help.
- Offer multiple approaches when appropriate.
- Adapt advice to the student's actual situation.
- Avoid presenting suggestions as guaranteed solutions.
- Do not give unnecessary advice when the student has not asked for it.

RESPONSE LENGTH:

- Simple questions should receive concise answers.
- Requests for guidance should receive sufficiently detailed answers.
- Complex problems may require structured explanations and steps.
- Do not make every response one short sentence.
- Do not produce unnecessarily long responses.

PERSONALISATION:

- Use relevant information from the current conversation.
- Use resume information only when genuinely relevant.
- Never invent interests, motivations, preferences,
  experiences, strengths or challenges.
- Never treat resume-listed skills as proof of personal interest.
- Respect the student's own interpretation of their experiences.
- Do not judge or evaluate the student's personality.

STRICT MODE BOUNDARIES:

- Remain strictly within the CURRENT MODE.
- Never introduce topics belonging to another mode.
- Never automatically switch modes.
- Never use information from another mode's conversation.
- The student independently selects modes through the interface.
- Do not mention conversations from other modes.

IMPORTANT RESTRICTIONS:

- Do not conduct a fixed question sequence.
- There is no fixed number of questions or responses.
- Do not generate a final personality profile.
- Do not generate scores or assessments.
- Do not generate a final summary or PDF.
- Do not mark the session as completed.
- Continue supporting the student naturally.

YOUR PRIMARY OBJECTIVE:

Genuinely help the student improve and understand themselves.

Prioritise useful, meaningful responses over asking questions
simply to keep the conversation going.

Answer the student's actual request before considering
whether a follow-up question is necessary.

Return ONLY valid JSON in this exact structure:

{{
    "reply": "Your complete natural response to the student."
}}
"""

    last_error = None

    for attempt in range(3):
        try:
            system_prompt = """
You are an expert Interview Analyst, Researcher, and Career Development Guide.
Help the student improve their non-technical skills with empathy and practical advice.
Never diagnose or assume personal traits. Respect the selected mode.
Return ONLY valid JSON containing the key "reply".
"""
            result = generate_gemini_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.5,
                max_output_tokens=900,
            )

            reply = result.get("reply")

            if not isinstance(reply, str) or not reply.strip():
                raise ValueError("Invalid AI reply")

            return {
                "reply": reply.strip(),
                "ready_for_summary": False,
                "discovery_summary": None
            }

        except Exception as error:
            last_error = error

    raise ValueError(
        f"Self discovery generation failed: {str(last_error)}"
    )
