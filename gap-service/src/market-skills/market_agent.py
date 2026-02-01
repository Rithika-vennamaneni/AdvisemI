# import json
# import re
# import time
# from collections import defaultdict
# from typing import List, Dict, Any, Optional


# # ----------------------------
# # Skill Extraction Helpers
# # ----------------------------

# def _extract_json_array(text: str) -> List[str]:
#     if not text:
#         raise ValueError("Empty model response")

#     match = re.search(r"\[[\s\S]*\]", text.strip())
#     if not match:
#         raise ValueError(f"No JSON array found in response:\n{text}")

#     return json.loads(match.group())


# def extract_market_skills(job_description: str, model) -> List[str]:
#     prompt = f"""
# You are designing a learning roadmap for a student.

# Extract ONLY concrete, teachable, technical skills that a candidate would need
# to explicitly learn or practice to qualify for this job.

# STRICT RULES:
# - EXCLUDE generic umbrella terms (e.g., "AI", "Machine Learning", "Data Science")
# - Prefer specific techniques, tools, frameworks, platforms, or methods
# - Infer skills ONLY if clearly implied by responsibilities
# - Each skill must be something a student could study or train for
# - Exclude soft skills, role titles, and vague phrases

# OUTPUT RULES:
# - Return ONLY a JSON array
# - Each item must be 1–4 words
# - Use canonical names (e.g., "Time Series Analysis", "AWS", "dbt")
# - Maximum 10 skills
# - No explanations, no markdown

# Job Description:
# {job_description}
# """

#     response = model.generate_content(prompt)
#     return _extract_json_array(response.text)


# # ----------------------------
# # Skill Normalization
# # ----------------------------

# PROTECTED_TERMS = {
#     "time series analysis",
#     "statistical analysis",
#     "recommendation systems",
#     "predictive modeling",
#     "anomaly detection",
#     "feature engineering",
#     "model deployment",
#     "model training",
#     "data visualization",
#     "data preprocessing",
# }

# GENERIC_SUFFIXES = {
#     "programming",
#     "models",
#     "systems",
#     "tools",
#     "methods",
# }


# def normalize_skill_name(skill: str) -> str:
#     if not skill:
#         return skill

#     s = skill.strip().lower()
#     s = re.sub(r"[^\w\s]", "", s)
#     s = re.sub(r"\s+", " ", s)

#     if s in PROTECTED_TERMS:
#         return s.title()

#     if s.endswith("series"):
#         return s.title()

#     if s.endswith("ies") and not s.endswith("series"):
#         s = s[:-3] + "y"
#     elif s.endswith("s") and not s.endswith("ss") and len(s.split()) > 1:
#         s = s[:-1]

#     words = s.split()

#     if len(words) > 2 and words[-1] in GENERIC_SUFFIXES:
#         words = words[:-1]

#     s = " ".join(words)

#     compact = s.replace(" ", "")
#     if compact.upper() in {"SQL", "API", "AWS", "ETL"}:
#         return compact.upper()

#     return s.title()


# # ----------------------------
# # Main Market Skill Builder
# # ----------------------------

# def build_market_skill_rows(
#     job_postings: List[Dict[str, Any]],
#     *,
#     user_id: str,
#     dream_role: str,
#     model,
#     source: str = "market",
#     sleep_s: float = 12.0,
#     max_jobs: Optional[int] = None,
# ) -> List[Dict[str, Any]]:

#     skill_data = defaultdict(lambda: {
#         "count": 0,
#         "evidence": None
#     })

#     processed = 0

#     for i, job in enumerate(job_postings):
#         if max_jobs is not None and processed >= max_jobs:
#             break

#         desc = job.get("description") or ""
#         link = job.get("redirect_url") or ""

#         if not desc.strip():
#             continue

#         try:
#             #skills = extract_market_skills(desc, model)

#             for skill in skills:
#                 key = normalize_skill_name(skill)
#                 if not key:
#                     continue

#                 skill_data[key]["count"] += 1

#                 if skill_data[key]["evidence"] is None and link:
#                     skill_data[key]["evidence"] = link

#             processed += 1
#             time.sleep(sleep_s)

#         except Exception as e:
#             print(f"[warn] market skill extraction failed at posting {i}: {e}")
#             time.sleep(max(5.0, sleep_s))

#     if not skill_data:
#         return []

#     max_count = max(v["count"] for v in skill_data.values()) or 1

#     rows = []
#     for skill, info in skill_data.items():
#         rows.append({
#             "user_id": user_id,
#             "source": source,
#             "dream_role": dream_role,
#             "skill_name": skill,
#             "score": round(info["count"] / max_count, 3),
#             "evidence": info["evidence"],
#         })

#     rows.sort(key=lambda r: r["score"], reverse=True)
#     return rows







import json
import re
import time
from collections import defaultdict
from typing import List, Dict, Any, Optional
from util.keywords_gemini import get_keywords_gemini_client

MAX_OUTPUT_SKILLS = 10



# ----------------------------
# JSON Extraction Helper
# ----------------------------

def _extract_json_array(text: str) -> List[str]:
    if not text:
        raise ValueError("Empty model response")

    match = re.search(r"\[[\s\S]*\]", text.strip())
    if not match:
        raise ValueError(f"No JSON array found in response:\n{text}")

    return json.loads(match.group())


# ----------------------------
# Market Skill Extraction
# ----------------------------

def extract_market_skills(job_description: str, model) -> List[str]:
    """
    Extract concrete, learnable, role-agnostic technical skills
    implied by the job description.
    """

    prompt = f"""
You are designing a learning roadmap for a student.

Extract ONLY concrete, teachable, technical skills that a candidate would need
to explicitly learn or practice to qualify for this job.

STRICT RULES:
- EXCLUDE generic umbrella terms (e.g., "AI", "Machine Learning", "Data Science")
- Prefer specific tools, frameworks, platforms, techniques, or methods
- Infer skills ONLY if clearly implied by responsibilities
- Each skill must be something a student could realistically study or train for
- Exclude soft skills, role titles, and vague phrases

OUTPUT RULES:
- Return ONLY a JSON array
- Each item must be 1–4 words
- Use canonical, industry-standard skill names
- Maximum 10 skills
- No explanations, no markdown

Job Description:
{job_description}
"""

    response = model.generate_content(prompt)
    return _extract_json_array(response.text)

# def extract_market_skills(job_description: str) -> List[str]:
#     """
#     Extract concrete, learnable, role-agnostic technical skills
#     implied by the job description.
#     """

#     prompt = f"""
# You are designing a learning roadmap for a student.

# Extract ONLY concrete, teachable, technical skills that a candidate would need
# to explicitly learn or practice to qualify for this job.

# STRICT RULES:
# - EXCLUDE generic umbrella terms (e.g., "AI", "Machine Learning", "Data Science")
# - Prefer specific tools, frameworks, platforms, techniques, or methods
# - Infer skills ONLY if clearly implied by responsibilities
# - Each skill must be something a student could realistically study or train for
# - Exclude soft skills, role titles, and vague phrases

# OUTPUT RULES:
# - Return ONLY a JSON array
# - Each item must be 1–4 words
# - Use canonical, industry-standard skill names
# - Maximum 10 skills
# - No explanations, no markdown

# Job Description:
# {job_description}
# """

#     client = get_keywords_gemini_client()

#     response = client.models.generate_content(
#         model="gemini-2.5-flash",
#         contents=prompt,
#     )

#     return _extract_json_array(response.text)


# ----------------------------
# Skill Normalization (Purely Mechanical)
# ----------------------------

GENERIC_SUFFIXES = {
    "programming",
    "models",
    "systems",
    "tools",
    "methods",
}

ACRONYMS = {
    "SQL",
    "API",
    "APIS",
    "AWS",
    "ETL",
    "REST",
    "CI",
    "CD",
    "CI/CD",
    "HTTP",
}


def normalize_skill_name(skill: str) -> str:
    """
    Normalize skill names WITHOUT injecting domain knowledge.
    """

    if not skill:
        return skill

    s = skill.strip().lower()

    # Remove punctuation
    s = re.sub(r"[^\w\s]", "", s)

    # Normalize whitespace
    s = re.sub(r"\s+", " ", s)

    # Do not singularize 'series'
    if s.endswith("series"):
        return s.title()

    # Conservative plural handling
    if s.endswith("ies"):
        s = s[:-3] + "y"
    elif s.endswith("s") and len(s.split()) > 1:
        s = s[:-1]

    words = s.split()

    # Strip generic suffixes only if phrase remains meaningful
    if len(words) > 2 and words[-1] in GENERIC_SUFFIXES:
        words = words[:-1]

    s = " ".join(words)

    # Acronym handling
    compact = s.replace(" ", "").upper()
    if compact in ACRONYMS:
        return compact

    return s.title()


# ----------------------------
# Market Skill Aggregation
# ----------------------------

def build_market_skill_rows(
    job_postings: List[Dict[str, Any]],
    *,
    user_id: str,
    dream_role: str,
    model,
    source: str = "market",
    sleep_s: float = 12.0,
    max_jobs: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Build normalized, aggregated market skill rows for storage.
    """

    skill_data = defaultdict(lambda: {
        "count": 0,
        "evidence": None
    })

    processed = 0

    for i, job in enumerate(job_postings):
        if max_jobs is not None and processed >= max_jobs:
            break

        desc = job.get("description") or ""
        link = job.get("redirect_url") or ""

        if not desc.strip():
            continue

        try:
            skills = extract_market_skills(desc, model)
            #skills = extract_market_skills(desc)


            for skill in skills:
                key = normalize_skill_name(skill)
                if not key:
                    continue

                skill_data[key]["count"] += 1

                if skill_data[key]["evidence"] is None and link:
                    skill_data[key]["evidence"] = link

            processed += 1
            time.sleep(sleep_s)

        except Exception as e:
            print(f"[warn] market skill extraction failed at posting {i}: {e}")
            time.sleep(max(5.0, sleep_s))

    if not skill_data:
        return []

    max_count = max(v["count"] for v in skill_data.values()) or 1

    rows = []
    for skill, info in skill_data.items():
        rows.append({
            "user_id": user_id,
            "source": source,
            "dream_role": dream_role,
            "skill_name": skill,
            "score": round(info["count"] / max_count, 3),
            "evidence": info["evidence"],
        })

    rows.sort(key=lambda r: r["score"], reverse=True)
    return rows[:MAX_OUTPUT_SKILLS]

