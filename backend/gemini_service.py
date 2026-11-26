
import os
import re
import json
from typing import Optional

import requests
from dotenv import load_dotenv


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)


def generate_gemini_text(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.2,
    max_output_tokens: int = 1200,
    json_mode: bool = False,
    response_schema: Optional[dict] = None,
) -> str:

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    generation_config = {
        "temperature": temperature,
        "maxOutputTokens": max_output_tokens,
    }

    if json_mode:
        generation_config["responseMimeType"] = "application/json"

        if response_schema:
            generation_config["responseSchema"] = response_schema

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": generation_config,
    }

    if system_prompt:
        payload["systemInstruction"] = {
            "parts": [{"text": system_prompt}]
        }

    response = requests.post(
        GEMINI_API_URL,
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=120,
    )

    if not response.ok:
        raise RuntimeError(
            f"Gemini API request failed ({response.status_code}): "
            f"{response.text}"
        )

    data = response.json()

    candidates = data.get("candidates") or []

    if not candidates:
        raise RuntimeError("Gemini API returned no candidates")

    candidate = candidates[0]

    finish_reason = candidate.get("finishReason")

    if finish_reason == "MAX_TOKENS":
        raise RuntimeError(
            "Gemini response was truncated because the output token limit "
            "was reached. Increase max_output_tokens."
        )

    parts = candidate.get("content", {}).get("parts") or []

    text = "".join(
        part.get("text", "")
        for part in parts
    ).strip()

    if not text:
        raise RuntimeError(
            f"Gemini returned an empty response. Finish reason: "
            f"{finish_reason}"
        )

    if json_mode:
        text = re.sub(
            r"^```(?:json)?\s*|\s*```$",
            "",
            text,
            flags=re.IGNORECASE
        ).strip()

    return text


def generate_gemini_json(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.2,
    max_output_tokens: int = 1200,
    response_schema: Optional[dict] = None,
):

    text = generate_gemini_text(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
        json_mode=True,
        response_schema=response_schema,
    )

    try:
        result = json.loads(text)

    except json.JSONDecodeError as error:
        raise ValueError(
            f"Gemini returned invalid JSON: {error.msg} "
            f"(line {error.lineno}, column {error.colno})."
        ) from error

    if not isinstance(result, dict):
        raise ValueError("Gemini JSON response must be an object")

    return result
