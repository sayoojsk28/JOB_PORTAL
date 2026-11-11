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
