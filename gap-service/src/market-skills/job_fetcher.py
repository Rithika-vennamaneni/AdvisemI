import os
import requests


def fetch_jobs(dream_role: str, max_results: int = 20):
    url = "https://api.adzuna.com/v1/api/jobs/us/search/1"

    params = {
        "app_id": os.getenv("ADZUNA_APP_ID"),
        "app_key": os.getenv("ADZUNA_APP_KEY"),
        "what": dream_role,
        "results_per_page": max_results,
        "sort_by": "date",
        "content-type": "application/json",
    }

    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()

    return r.json().get("results", [])
