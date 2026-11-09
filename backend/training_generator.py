import os
import json
import re
import ollama
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.lib.units import inch

from sqlalchemy.orm import Session

import models
from database import SessionLocal

def get_training_db():
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise

def generate_learning_material(job_role: str) -> str:
    prompt = f"""
You are a senior technical interviewer and expert interview preparation
trainer with extensive experience evaluating candidates for technical roles.

TARGET JOB ROLE: {job_role}

AUDIENCE:
Candidates who already have basic knowledge of this job role but failed
a technical interview and need focused interview preparation.

IMPORTANT:
This is NOT a beginner tutorial, textbook, or complete course.
Do NOT teach basic concepts from scratch.
Create structured INTERVIEW PREPARATION NOTES that guide candidates
on what topics to revise and how interviewers may test their knowledge.

CONTENT REQUIREMENTS:

1. Identify the important technical topics commonly expected for
   the target job role.

2. Organize the material topic-wise using clear headings and subheadings.

3. Under every topic, include:

   A. Topics to Prepare:
      List the specific concepts, subtopics, methods, terminology,
      and technical differences candidates should revise.

   B. How Interviewers May Ask:
      Explain different ways interviewers may frame questions.
      Include tricky variations, follow-up questions, and conceptual
      comparisons.
      Do not write these as a one-question-one-answer guide.

   C. Tricky Areas:
      Highlight commonly confused concepts, edge cases,
      misconceptions, and mistakes candidates should avoid.

   D. Code-Based Interview Patterns:
      Where relevant, explain the types of code-output prediction,
      debugging, code analysis, and behaviour-based questions
      candidates should practise.

4. Prioritize intermediate and advanced interview-level topics.
   Do not waste sections explaining elementary definitions.

5. Include important differences between similar concepts.

6. Ensure technical accuracy. Do not invent features, methods,
   syntax, or unsupported technical claims.

7. Cover the major technical areas expected from a candidate
   applying for the specified job role.

8. Avoid repeating the same concept under multiple headings.

9. Do not generate MCQs, quizzes, answer keys, or one-question-one-answer
   interview lists.

10. Write detailed, useful preparation notes. The candidate should
    understand exactly what to study and what kinds of tricky
    interview questions to expect.

11. Use professional, clear English suitable for a technical
    training PDF.

12. End with a consolidated interview preparation checklist
    covering the topics discussed.

OUTPUT STRUCTURE:
- Title
- Introduction and preparation guidance
- Topic-wise interview preparation notes
- Tricky interview patterns
- Final revision checklist

Return only the learning material.
"""

    response = ollama.chat(
        model="llama3.2:latest",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        options={
            "temperature": 0.3
        }
    )

    material = response["message"]["content"].strip()

    if not material:
        raise ValueError(
            "Learning material generation returned empty content."
        )

    return material


def create_training_pdf(
    job_role: str,
    material: str,
    part_id: int
) -> str:

    pdf_filename = f"training_part_{part_id}.pdf"
    pdf_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "training_documents",
        pdf_filename
    )

    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TrainingTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1F4E79"),
        spaceAfter=20
    )

    heading_style = ParagraphStyle(
        "TrainingHeading",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#1F4E79"),
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = styles["BodyText"]
    body_style.leading = 16
    body_style.spaceAfter = 8

    document = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch
    )

    story = [
        Paragraph(f"{job_role} - Training Guide", title_style),
        Spacer(1, 12)
    ]

    for line in material.splitlines():
        line = line.strip()

        if not line:
            story.append(Spacer(1, 6))
            continue

        safe_line = (
            line.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

        if line.startswith("#"):
            heading = line.lstrip("#").strip()
            story.append(Paragraph(heading, heading_style))
        else:
            story.append(Paragraph(safe_line, body_style))

    document.build(story)

    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        raise RuntimeError("Training PDF creation failed.")

    return pdf_path


def generate_question_batch(
    job_role: str,
    material: str,
    batch_number: int
) -> list:

    prompt = f"""
You are a senior technical interviewer creating MCQs for
a professional technical interview assessment.

JOB ROLE: {job_role}

TRAINING MATERIAL:
{material}

TASK:
Generate exactly 4 high-quality multiple-choice questions
based ONLY on the training material provided above.

These questions are for candidates preparing for real technical
job interviews.

QUESTION STYLE:
1. Questions must resemble tricky questions commonly asked
   in technical interviews.
2. Use clear, direct and professional English.
3. Test actual understanding, not memorization alone.
4. Include a suitable mix of:
   - Code output prediction
   - Conceptual understanding
   - Differences between similar concepts
   - Code behaviour and debugging
   - Practical technical scenarios
5. Questions may test edge cases and common misconceptions
   when those concepts are covered in the material.
6. Difficulty should come from the technical concept,
   NOT confusing or complicated wording.
7. Keep questions reasonably concise.

STRICTLY AVOID:
1. Beginner-level definition-only questions unless necessary
   to test an important concept.
2. Riddles, puzzles and unnecessarily indirect questions.
3. Misleading or ambiguous wording.
4. Multiple correct answers.
5. Questions based on knowledge absent from the training material.
6. Repeated questions or questions testing the same concept
   in nearly identical ways.
7. Artificially complicated code.

OPTION REQUIREMENTS:
1. Every question must have exactly four options: A, B, C and D.
2. Only ONE option must be correct.
3. All options must be technically plausible.
4. Avoid options that are obviously incorrect.
5. Include the correct option letter.
6. Provide a technically accurate explanation of the answer.
7. The correct_option value MUST be exactly one uppercase
   character: A, B, C, or D.
   Never return "Option A", "Answer: A", or the option text.

BATCH INFORMATION:
This is batch {batch_number} of 5.
Generate a varied set of 4 questions.
Avoid repeating concepts and question patterns from other batches
where possible.

FINAL VALIDATION:
Before returning the result, verify:
- Exactly 4 questions are present.
- Every question has four options.
- Exactly one correct answer exists.
- Every question is supported by the training material.
- Questions are clear and resemble real technical interviews.
- No unnecessary duplicates exist.

Return valid JSON only. No markdown or additional text.

Required JSON structure:
{{
    "questions": [
        {{
            "question": "Question text",
            "option_a": "Option A",
            "option_b": "Option B",
            "option_c": "Option C",
            "option_d": "Option D",
            "correct_option": "A",
            "explanation": "Explanation"
        }}
    ]
}}
"""

    response = ollama.chat(
        model="llama3.2:latest",
        messages=[
            {"role": "user", "content": prompt}
        ],
        format="json",
        options={"temperature": 0.3}
    )

    raw_content = response["message"]["content"].strip()

    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError:
        raise ValueError(
            f"Batch {batch_number}: Invalid JSON generated by Ollama."
        )

    questions = data.get("questions")

    if not isinstance(questions, list):
        raise ValueError(
            f"Batch {batch_number}: Invalid questions format."
        )

    print(
        f"Batch {batch_number}: "
        f"Ollama returned {len(questions)} questions"
    )

    if len(questions) < 4:
        raise ValueError(
            f"Batch {batch_number}: Expected 4 questions, "
            f"received {len(questions)}."
        )

    if len(questions) > 4:
        print(
            f"Batch {batch_number}: Received {len(questions)} questions. "
            "Using the first 4."
        )
        questions = questions[:4]

    required_fields = [
        "question",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_option",
        "explanation"
    ]

    for index, question in enumerate(questions, start=1):

        if not isinstance(question, dict):
            raise ValueError(
                f"Batch {batch_number}, question {index}: Invalid format."
            )

        for field in required_fields:
            if (
                not isinstance(question.get(field), str)
                or not question[field].strip()
            ):
                raise ValueError(
                    f"Batch {batch_number}, question {index}: "
                    f"Missing {field}."
                )

        question["correct_option"] = (
            question["correct_option"].strip().upper()
        )

        if question["correct_option"] not in ["A", "B", "C", "D"]:
            print(
    f"DEBUG: Invalid correct_option = "
    f"{repr(question['correct_option'])}"
)
            raise ValueError(
                f"Batch {batch_number}, question {index}: "
                "Invalid correct option."
            )

    return questions





def generate_all_questions(job_role: str, material: str) -> list:
    all_questions = []
    seen_questions = set()

    batch_number = 1
    total_batches = 5
    questions_per_batch = 4
    total_questions = 20
    max_retries_per_batch = 3

    while batch_number <= total_batches:

        batch_questions = []
        retry_number = 0

        while (
            len(batch_questions) < questions_per_batch
            and retry_number <= max_retries_per_batch
        ):

            missing = questions_per_batch - len(batch_questions)

            if retry_number == 0:
                print(
                    f"Generating batch {batch_number}/5 "
                    f"({missing} questions needed)"
                )
            else:
                print(
                    f"Retrying batch {batch_number}: "
                    f"{missing} questions needed. "
                    f"Retry {retry_number}/{max_retries_per_batch}"
                )

            try:
                generated_questions = generate_question_batch(
                    job_role=job_role,
                    material=material,
                    batch_number=batch_number
                )

                for question in generated_questions:
                    normalized = question["question"].strip().lower()

                    if normalized not in seen_questions:
                        seen_questions.add(normalized)
                        batch_questions.append(question)

                        if len(batch_questions) == questions_per_batch:
                            break

            except Exception as error:
                print(
                    f"Batch {batch_number} generation attempt failed: {error}"
                )

            retry_number += 1

        if len(batch_questions) != questions_per_batch:
            raise ValueError(
                f"Batch {batch_number} failed. "
                f"Could generate only {len(batch_questions)} "
                "unique questions after retries."
            )

        all_questions.extend(batch_questions)

        print(
            f"Batch {batch_number} completed. "
            f"Total unique questions: {len(all_questions)}/{total_questions}"
        )

        batch_number += 1

    if len(all_questions) != total_questions:
        raise ValueError(
            f"Expected 20 unique questions, got {len(all_questions)}."
        )

    print("Successfully generated 20 unique questions.")

    return all_questions




def save_generated_questions(
    db: Session,
    part_id: int,
    questions: list
):
    # Prevent duplicate question insertion
    existing_count = db.query(models.TrainingQuestion).filter(
        models.TrainingQuestion.part_id == part_id
    ).count()

    if existing_count > 0:
        raise ValueError(
            f"Questions already exist for training part {part_id}."
        )

    question_records = []

    for question in questions:
        record = models.TrainingQuestion(
            part_id=part_id,
            question=question["question"],
            option_a=question["option_a"],
            option_b=question["option_b"],
            option_c=question["option_c"],
            option_d=question["option_d"],
            correct_option=question["correct_option"],
            explanation=question["explanation"]
        )

        question_records.append(record)

    db.add_all(question_records)
    db.flush()

    saved_count = db.query(models.TrainingQuestion).filter(
        models.TrainingQuestion.part_id == part_id
    ).count()

    if saved_count != 20:
        raise ValueError(
            f"Expected 20 saved questions, found {saved_count}."
        )


def generate_part_one(part_id: int, job_role: str):

    db = SessionLocal()
    pdf_path = None

    try:
        # Atomically claim the generation task.
        # Only one worker can change Pending/Failed to Generating.
        claimed = (
            db.query(models.TrainingPart)
            .filter(
                models.TrainingPart.id == part_id,
                models.TrainingPart.generation_status.in_(
                    ["Pending", "Failed"]
                )
            )
            .update(
                {"generation_status": "Generating"},
                synchronize_session=False
            )
        )

        db.commit()

        if claimed != 1:
            print(
                f"Part {part_id}: Generation already started, "
                "completed, or unavailable. Skipping."
            )
            return

        part = db.query(models.TrainingPart).filter(
            models.TrainingPart.id == part_id
        ).first()

        if not part:
            raise ValueError(f"Training part {part_id} not found.")

        # Step 1: Generate interview preparation material
        material = generate_learning_material(job_role)

        # Step 2: Create PDF
        pdf_path = create_training_pdf(
            job_role=job_role,
            material=material,
            part_id=part_id
        )

        # Step 3: Generate 20 MCQs from the same material
        questions = generate_all_questions(
            job_role=job_role,
            material=material
        )

        # Step 4: Save all questions
        save_generated_questions(
            db=db,
            part_id=part_id,
            questions=questions
        )

        # Step 5: Mark Part 1 completed
        part.pdf_path = pdf_path
        part.generation_status = "Completed"
        part.generated_at = datetime.now()

        db.commit()

        print(f"Part {part_id}: Generation completed successfully.")

    except Exception:
        db.rollback()

        failed_part = db.query(models.TrainingPart).filter(
            models.TrainingPart.id == part_id
        ).first()

        if failed_part:
            failed_part.generation_status = "Failed"
            db.commit()

        # Do not delete the PDF here.
        # A previous valid PDF may already exist at the same path.

        raise

    finally:
        db.close()
