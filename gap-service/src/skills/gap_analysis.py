"""
LLM-powered skill gap analysis.

Fetches resume and market skills from Supabase, uses Groq to identify
missing skills, and persists results to the gap_skills table.
"""

import json
import logging
import os
import uuid
from typing import Any

from groq import Groq
from supabase import Client, create_client

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment & clients
# ---------------------------------------------------------------------------

def _get_env(name: str) -> str:
    value = os.environ.get(name)
    if not value or not value.strip():
        raise ValueError(f"Missing or empty environment variable: {name}")
    return value.strip()


def _supabase_client() -> Client:
    url = _get_env("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key or not key.strip():
        raise ValueError("Missing or empty: set SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key.strip())


def _groq_client() -> Groq:
    api_key = _get_env("GROQ_API_KEY")
    return Groq(api_key=api_key)


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

SKILL_GAP_SYSTEM = """You are a technical skill gap analyzer. Compare a candidate's current skills with required market skills."""

SKILL_GAP_USER_TEMPLATE = """CANDIDATE'S CURRENT SKILLS (from resume):
{resume_skills}

REQUIRED MARKET SKILLS (from job postings):
{market_skills}

Task: Identify which market skills are MISSING from the candidate's resume. Consider:
- Semantic similarities (e.g., "React" = "React.js" = "ReactJS")
- Skill hierarchies (e.g., "Python" covers "Python programming")
- Common abbreviations (e.g., "JS" = "JavaScript")

Return ONLY a valid JSON array of missing skill names:
["skill1", "skill2", "skill3"]

If no skills are missing, return: []"""


def _build_prompt(resume_skills: list[str], market_skills: list[str]) -> str:
    resume_text = "\n".join(resume_skills) if resume_skills else "(none)"
    market_text = "\n".join(market_skills) if market_skills else "(none)"
    return SKILL_GAP_USER_TEMPLATE.format(
        resume_skills=resume_text,
        market_skills=market_text,
    )


# ---------------------------------------------------------------------------
# Supabase queries
# ---------------------------------------------------------------------------

def _fetch_resume_skills(supabase: Client, user_id: str) -> list[str]:
    resp = supabase.table("skills").select("skill_name").eq("user_id", user_id).eq("source", "resume").execute()
    rows = resp.data or []
    names = [r["skill_name"] for r in rows if r.get("skill_name")]
    return list(dict.fromkeys(names))


def _fetch_market_skills(supabase: Client, user_id: str) -> list[str]:
    resp = supabase.table("skills").select("skill_name").eq("user_id", user_id).eq("source", "market").execute()
    rows = resp.data or []
    names = [r["skill_name"] for r in rows if r.get("skill_name")]
    return list(dict.fromkeys(names))


def _insert_gap_skills(supabase: Client, user_id: str, run_id: str, skill_names: list[str]) -> None:
    if not skill_names:
        return
    rows = [
        {"user_id": user_id, "skill_name": name, "run_id": run_id, "priority": None}
        for name in skill_names
    ]
    supabase.table("gap_skills").insert(rows).execute()


# ---------------------------------------------------------------------------
# Groq & JSON parsing
# ---------------------------------------------------------------------------

DEFAULT_MODEL = "llama-3.3-70b-versatile"


def _parse_missing_skills_json(raw: str) -> list[str]:
    """Parse LLM response into a list of skill names. Handles markdown code blocks."""
    text = raw.strip()
    if not text:
        return []

    # Strip optional markdown code block
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    try:
        parsed: Any = json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("Invalid JSON from LLM: %s", e)
        raise ValueError(f"LLM returned invalid JSON: {e}") from e

    if not isinstance(parsed, list):
        raise ValueError("LLM response is not a JSON array")

    result = []
    for item in parsed:
        if isinstance(item, str) and item.strip():
            result.append(item.strip())
        elif isinstance(item, (int, float)):
            result.append(str(item).strip())
    return result


def _call_groq(client: Groq, prompt: str, model: str = DEFAULT_MODEL) -> str:
    messages = [
        {"role": "system", "content": SKILL_GAP_SYSTEM},
        {"role": "user", "content": prompt},
    ]
    completion = client.chat.completions.create(
        messages=messages,
        model=model,
    )
    if not completion.choices:
        raise ValueError("Groq API returned no choices")
    msg = completion.choices[0].message
    if not msg or not msg.content:
        raise ValueError("Groq API returned empty message content")
    return msg.content


# ---------------------------------------------------------------------------
# Main API
# ---------------------------------------------------------------------------

def analyze_skill_gaps(user_id: str) -> dict[str, Any]:
    """
    Run skill gap analysis for a user.

    1. Fetches resume and market skills from Supabase.
    2. Calls Groq to identify missing market skills.
    3. Inserts results into gap_skills with a new run_id.

    Returns a dict with:
        - run_id: UUID for this run
        - resume_skills_count: number of resume skills
        - market_skills_count: number of market skills
        - missing_skills: list of missing skill names
        - gap_skills_inserted: number of rows inserted

    Raises:
        ValueError: missing env vars, invalid user_id, or invalid LLM response
        Exception: Supabase or Groq API errors
    """
    if not user_id or not str(user_id).strip():
        raise ValueError("user_id is required")

    user_id = str(user_id).strip()
    run_id = str(uuid.uuid4())

    logger.info("Starting skill gap analysis for user_id=%s run_id=%s", user_id, run_id)

    supabase = _supabase_client()
    resume_skills = _fetch_resume_skills(supabase, user_id)
    market_skills = _fetch_market_skills(supabase, user_id)

    logger.debug(
        "Fetched skills: resume=%d market=%d",
        len(resume_skills),
        len(market_skills),
    )

    # Edge case: no market skills → nothing to gap
    if not market_skills:
        logger.info("No market skills for user_id=%s; no gaps to compute", user_id)
        return {
            "run_id": run_id,
            "resume_skills_count": len(resume_skills),
            "market_skills_count": 0,
            "missing_skills": [],
            "gap_skills_inserted": 0,
        }

    # Edge case: no resume skills → LLM can still run (all market skills are "missing")
    prompt = _build_prompt(resume_skills, market_skills)
    model = os.environ.get("GROQ_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL

    try:
        raw_response = _call_groq(_groq_client(), prompt, model=model)
    except Exception as e:
        logger.exception("Groq API call failed for user_id=%s", user_id)
        raise

    try:
        missing_skills = _parse_missing_skills_json(raw_response)
    except ValueError as e:
        logger.exception("Failed to parse LLM response for user_id=%s", user_id)
        raise

    _insert_gap_skills(supabase, user_id, run_id, missing_skills)
    inserted = len(missing_skills)

    logger.info(
        "Skill gap analysis complete user_id=%s run_id=%s missing=%d inserted=%d",
        user_id,
        run_id,
        len(missing_skills),
        inserted,
    )

    return {
        "run_id": run_id,
        "resume_skills_count": len(resume_skills),
        "market_skills_count": len(market_skills),
        "missing_skills": missing_skills,
        "gap_skills_inserted": inserted,
    }
