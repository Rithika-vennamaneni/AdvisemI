import os
from dotenv import load_dotenv
from supabase import create_client
import google.generativeai as genai


load_dotenv()

# ----------------------------
# Runtime Config (Production-safe)
# ----------------------------

MAX_JOBS = int(os.getenv("MAX_JOBS", 10))      # how many jobs to process
SLEEP_S = float(os.getenv("SLEEP_S", 5.0))   # rate limiting between LLM calls



#from market_agent import build_market_skill_rows
from src.market_agent import build_market_skill_rows
#from run_local_test import fetch_jobs  # reuse existing fetch logic
from src.job_fetcher import fetch_jobs



# ----------------------------
# Setup
# ----------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


# ----------------------------
# Agent Entry Point
# ----------------------------

def run_market_skills_agent(user_id: str):
    # 1. Fetch dream role
    profile = (
        supabase
        .table("profiles")
        .select("dream_role")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    dream_role = profile.data["dream_role"]

    # 2. Fetch jobs
    jobs = fetch_jobs(dream_role)


    # 3. Build skill rows
    rows = build_market_skill_rows(
    job_postings=jobs[:MAX_JOBS],
    user_id=user_id,
    dream_role=dream_role,
    model=model,
    sleep_s=SLEEP_S,
)


    # 4. Insert into Supabase
    if rows:
        supabase.table("skills").upsert(
    rows,
    on_conflict="user_id,source,skill_name"
).execute()


    return len(rows)
