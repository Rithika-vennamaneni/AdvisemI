#!/usr/bin/env python3
"""
Run skill gap analysis from the command line.

Usage:
  # From gap-service directory:
  python run_gap_analysis.py <user_id>

  # Or set DEFAULT_USER_ID in .env and run:
  python run_gap_analysis.py

Loads .env from the current directory if present.
"""

import logging
import os
import sys

# Load .env before importing gap_analysis (so env vars are set)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add src to path so "skills" package is found
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from skills.gap_analysis import analyze_skill_gaps

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    user_id = None
    if len(sys.argv) >= 2:
        user_id = sys.argv[1].strip()
    if not user_id:
        user_id = (os.environ.get("DEFAULT_USER_ID") or "").strip()
    if not user_id:
        print("Usage: python run_gap_analysis.py <user_id>", file=sys.stderr)
        print("  Or set DEFAULT_USER_ID in .env", file=sys.stderr)
        sys.exit(1)

    try:
        result = analyze_skill_gaps(user_id)
        print("Run ID:", result["run_id"])
        print("Resume skills:", result["resume_skills_count"])
        print("Market skills:", result["market_skills_count"])
        print("Missing skills:", result["missing_skills"])
        print("Rows inserted into gap_skills:", result["gap_skills_inserted"])
    except Exception as e:
        logger.exception("Skill gap analysis failed")
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
