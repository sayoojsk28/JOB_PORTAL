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
        Paragraph(
            f"{job_role} - Training Guide",
            title_style
        ),
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

            safe_heading = (
                heading.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )

            story.append(
                Paragraph(safe_heading, heading_style)
            )

        else:
            story.append(
                Paragraph(safe_line, body_style)
            )

    document.build(story)

    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
        raise RuntimeError("Training PDF creation failed.")

    return pdf_path

def review_question_batch(
    job_role: str,
    material: str,
    questions: list,
    rejected_questions: list = None
) -> list:

    review_prompt = f"""
You are a senior technical assessment reviewer.

JOB ROLE: {job_role}

TRAINING MATERIAL:
{material}

Review each MCQ independently.

For every question:
1. Solve the question without trusting its supplied answer.
2. Evaluate all four options separately.
3. Identify whether exactly ONE option is technically correct.
4. Check whether the supplied correct_option matches that answer.
5. Check whether the explanation is accurate.

Reject a question if:
- Zero or multiple options are correct.
- The supplied answer is incorrect.
- The question is ambiguous.
- The explanation is technically incorrect.
- The question is unsupported by the material.

QUESTIONS:
{json.dumps(questions, indent=2)}

Return JSON only in this format:

{{
    "reviews": [
        {{
            "question_number": 1,
            "option_a_correct": false,
            "option_b_correct": true,
            "option_c_correct": false,
            "option_d_correct": false,
            "is_valid": true,
            "reason": "Explanation"
        }}
    ]
}}
"""

    response = ollama.chat(
        model="llama3.2:latest",
        messages=[
            {"role": "user", "content": review_prompt}
        ],
        format="json",
        options={"temperature": 0.1}
    )

    try:
        review_data = json.loads(
            response["message"]["content"].strip()
        )
    except (json.JSONDecodeError, TypeError, KeyError):
        raise ValueError("Invalid MCQ review JSON.")

    if not isinstance(review_data, dict):
        raise ValueError("Invalid MCQ review format.")

    reviews = review_data.get("reviews")

    if (
        not isinstance(reviews, list)
        or len(reviews) != len(questions)
    ):
        raise ValueError("Incomplete MCQ review.")

    rejected_count = 0

    required_review_fields = [
        "question_number",
        "option_a_correct",
        "option_b_correct",
        "option_c_correct",
        "option_d_correct",
        "is_valid"
    ]

    for index, review in enumerate(reviews):

        if not isinstance(review, dict):
            raise ValueError("Invalid review format.")

        for field in required_review_fields:
            if field not in review:
                raise ValueError(
                    f"Review {index + 1}: Missing {field}."
                )

        if (
            type(review["question_number"]) is not int
            or review["question_number"] != index + 1
        ):
            raise ValueError("Review question order mismatch.")

        correctness = [
            review["option_a_correct"],
            review["option_b_correct"],
            review["option_c_correct"],
            review["option_d_correct"]
        ]

        if not all(type(value) is bool for value in correctness):
            raise ValueError("Invalid MCQ review result.")

        if type(review["is_valid"]) is not bool:
            raise ValueError("Invalid is_valid value.")

        correct_count = sum(correctness)

        expected_option = (
            ["A", "B", "C", "D"][correctness.index(True)]
            if correct_count == 1
            else None
        )
        print(
    f"Review details for question {index + 1}: "
    f"correct_options={correctness}, "
    f"is_valid={review['is_valid']}, "
    f"expected={expected_option}, "
    f"generated={questions[index]['correct_option']}"
)

        if (
            correct_count != 1
            or review["is_valid"] is not True
            or expected_option != questions[index]["correct_option"]
        ):

            rejected_count += 1

            reason = review.get("reason")

            if not isinstance(reason, str) or not reason.strip():
                reason = "Failed quality review."

            print(
            f"Rejected question {index + 1}: {reason}"
            )

            if rejected_questions is not None:
                rejected_questions.append({
                    "question": questions[index]["question"],
                    "reason": reason
                })

    if rejected_count > 0:
        raise ValueError(
            f"{rejected_count} question(s) failed quality review."
        )

    print("MCQ review successful: All questions passed.")

    return questions

def generate_question_batch(
    job_role: str,
    material: str,
    batch_number: int,
    previous_questions: list = None,
    rejected_questions: list = None
) -> list:

    previous_questions_text = "\n".join(
        f"- {question['question']}"
        for question in (previous_questions or [])
    )

    rejected_questions_text = "\n".join(
        f"- {item['question']} (Reason: {item['reason']})"
        for item in (rejected_questions or [])
    )

    prompt = f"""
You are a senior technical interviewer creating MCQs for
a professional technical interview assessment.

JOB ROLE: {job_role}

TRAINING MATERIAL:
{material}

TASK:
Generate exactly 4 high-quality multiple-choice questions
based ONLY on the training material provided above.

QUESTION STYLE:
1. Test technical understanding and interview-level reasoning.
2. Use a mix of conceptual, code-output, debugging and
   practical technical questions where relevant.
3. Use clear, direct and professional English.
4. Prefer precise questions with objectively verifiable answers.
5. Use valid Python syntax in Python code-based questions.
6. Keep questions concise and technically meaningful.

STRICTLY AVOID:
1. Ambiguous or subjective questions.
2. Questions where multiple options could be correct.
3. Questions based on knowledge absent from the material.
4. Repeated concepts or nearly identical questions.
5. Incorrect assumptions about algorithms, complexity or
   programming language behaviour.
6. Artificially complicated code or misleading wording.

OPTION REQUIREMENTS:
1. Every question must have exactly four options: A, B, C and D.
2. Exactly ONE option must be technically correct.
3. All options must be plausible but clearly distinguishable.
4. Explanations must accurately justify the correct answer
   and must not contradict the question or options.
5. The correct_option value MUST be exactly one uppercase
   character: A, B, C, or D.

BATCH INFORMATION:
This is batch {batch_number} of 5.
Generate 4 different questions covering varied topics.

PREVIOUSLY GENERATED QUESTIONS:
{previous_questions_text}

Do NOT repeat these questions or test the same concepts
using slightly different wording.
Focus on different topics from the training material.

REJECTED QUESTIONS:
{rejected_questions_text}

Do NOT generate these rejected questions again.
Avoid the concepts if the rejection reason identifies
a technical ambiguity or error.

FINAL VALIDATION:
Before returning, verify that:
- Exactly 4 questions are present.
- Every question has four options.
- Exactly one answer is correct.
- The explanation is technically accurate.
- No question is ambiguous or duplicated.
- Every question is supported by the training material.

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

    try:
        raw_content = response["message"]["content"].strip()
        data = json.loads(raw_content)

    except (json.JSONDecodeError, TypeError, KeyError, AttributeError):
        raise ValueError(
            f"Batch {batch_number}: Invalid JSON generated by Ollama."
        )

    if not isinstance(data, dict):
        raise ValueError(
            f"Batch {batch_number}: Invalid response format."
        )

    questions = data.get("questions")

    if not isinstance(questions, list) or len(questions) != 4:
        raise ValueError(
            f"Batch {batch_number}: Expected exactly 4 questions."
        )

    print(
        f"Batch {batch_number}: "
        f"Ollama returned {len(questions)} questions"
    )

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
                    f"Missing or invalid {field}."
                )

        question["question"] = question["question"].strip()
        question["explanation"] = question["explanation"].strip()

        options = [
            question["option_a"].strip(),
            question["option_b"].strip(),
            question["option_c"].strip(),
            question["option_d"].strip()
        ]

        if len(set(option.casefold() for option in options)) != 4:
            raise ValueError(
                f"Batch {batch_number}, question {index}: "
                "Duplicate options found."
            )

        question["option_a"] = options[0]
        question["option_b"] = options[1]
        question["option_c"] = options[2]
        question["option_d"] = options[3]

        question["correct_option"] = (
            question["correct_option"].strip().upper()
        )

        if question["correct_option"] not in ["A", "B", "C", "D"]:
            raise ValueError(
                f"Batch {batch_number}, question {index}: "
                "Invalid correct option."
            )

    # Review only after all 4 questions pass structural validation.
    reviewed_questions = review_question_batch(
        job_role=job_role,
        material=material,
        questions=questions,
        rejected_questions=rejected_questions
    )

    return reviewed_questions


def generate_all_questions(job_role: str, material: str) -> list:
    all_questions = []
    seen_questions = set()
    rejected_questions = []

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
                    f"Generating batch {batch_number}/{total_batches} "
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
                    batch_number=batch_number,
                    previous_questions=all_questions + batch_questions,
                    rejected_questions=rejected_questions
                )

                for question in generated_questions:

                    normalized = " ".join(
                        question["question"].casefold().split()
                    )

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
            f"Total unique questions: "
            f"{len(all_questions)}/{total_questions}"
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
    if not isinstance(questions, list) or len(questions) != 20:
        raise ValueError(
            f"Expected exactly 20 questions, got {len(questions) if isinstance(questions, list) else 'invalid data'}."
        )

    existing_count = db.query(
        models.TrainingQuestion
    ).filter(
        models.TrainingQuestion.part_id == part_id
    ).count()

    if existing_count > 0:
        raise ValueError(
            f"Questions already exist for training part {part_id}."
        )

    question_records = []

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
                f"Question {index}: Invalid question format."
            )

        for field in required_fields:
            if (
                not isinstance(question.get(field), str)
                or not question[field].strip()
            ):
                raise ValueError(
                    f"Question {index}: Missing or invalid {field}."
                )

        if question["correct_option"] not in ["A", "B", "C", "D"]:
            raise ValueError(
                f"Question {index}: Invalid correct option."
            )

        record = models.TrainingQuestion(
            part_id=part_id,
            question=question["question"].strip(),
            option_a=question["option_a"].strip(),
            option_b=question["option_b"].strip(),
            option_c=question["option_c"].strip(),
            option_d=question["option_d"].strip(),
            correct_option=question["correct_option"],
            explanation=question["explanation"].strip()
        )

        question_records.append(record)

    db.add_all(question_records)
    db.flush()

    saved_count = db.query(
        models.TrainingQuestion
    ).filter(
        models.TrainingQuestion.part_id == part_id
    ).count()

    if saved_count != 20:
        raise ValueError(
            f"Expected 20 saved questions, found {saved_count}."
        )

    print(
        f"Successfully saved {saved_count} questions "
        f"for training part {part_id}."
    )

def generate_part_one(part_id: int, job_role: str):
    db = SessionLocal()

    try:
        # Step 1: Claim the part for generation.
        claimed = (
            db.query(models.TrainingPart)
            .filter(
                models.TrainingPart.id == part_id,
                models.TrainingPart.generation_status.in_(
                    ["Pending", "Failed"]
                )
            )
            .update(
                {
                    "generation_status": "Generating"
                },
                synchronize_session=False
            )
        )

        db.commit()

        # Another task may already be generating this part.
        if claimed != 1:
            print(
                f"Part {part_id} is already being generated "
                "or is already completed."
            )
            return

        # Step 2: Fetch the claimed training part.
        part = db.query(
            models.TrainingPart
        ).filter(
            models.TrainingPart.id == part_id
        ).first()

        if not part:
            raise ValueError(
                f"Training part {part_id} not found."
            )

        # Step 3: Generate role-specific learning material.
        print(f"Generating learning material for Part {part_id}...")

        material = generate_learning_material(job_role)

        if not material or not material.strip():
            raise ValueError(
                "Learning material generation returned empty content."
            )

        # Step 4: Create the training PDF.
        print(f"Creating PDF for Part {part_id}...")

        pdf_path = create_training_pdf(
            part_id=part_id,
            job_role=job_role,
            material=material
        )

        # Step 5: Generate and review 20 unique MCQs.
        print(f"Generating MCQs for Part {part_id}...")

        questions = generate_all_questions(
            job_role=job_role,
            material=material
        )

        # Step 6: Save all questions to the database.
        save_generated_questions(
            db=db,
            part_id=part_id,
            questions=questions
        )

        # Step 7: Mark generation as completed.
        part.pdf_path = pdf_path
        part.generation_status = "Completed"
        part.generated_at = datetime.now()

        db.commit()

        print(
            f"Part {part_id} generation completed successfully."
        )

    except Exception as error:
        db.rollback()

        failed_part = db.query(
            models.TrainingPart
        ).filter(
            models.TrainingPart.id == part_id
        ).first()

        if failed_part:
            failed_part.generation_status = "Failed"
            db.commit()

        print(
            f"Part {part_id} generation failed: {error}"
        )

        raise

    finally:
        db.close()
