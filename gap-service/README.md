# Gap Analysis Service

Production-ready Node.js + TypeScript + Express service that computes AI-assisted gap analysis with Supabase + Google Gemini.

## Setup

```bash
cd gap-service
npm install
cp .env.example .env
npm run dev
```

## Environment

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `MODEL` (example: `gemini-1.5-flash`)
- `PORT` (optional, default `4000`)

## Endpoint

`POST /gap-analysis/run`

Request body:
```json
{
  "user_id": "<uuid>",
  "run_id": "<uuid>",
  "limit": 15
}
```

Response:
```json
{
  "user_id": "<uuid>",
  "run_id": "<uuid>",
  "inserted_count": 12,
  "gaps": [
    {
      "skill_name": "Sql",
      "priority": 1,
      "reason": "..."
    }
  ]
}
```

## Resume Parser Endpoint

`POST /parse`

- Accepts `multipart/form-data` with `file` (PDF)
- Returns a JSON payload compatible with the frontend `ResumeParseResult` shape

Example (curl):
```bash
curl -X POST http://localhost:8787/parse \\
  -F "file=@/path/to/resume.pdf"
```

## Notes

- The service uses a single Gemini request for canonicalization and coverage matching, and retries once if the model output is invalid.
- If Gemini fails or returns invalid JSON twice, the service falls back to deterministic exact-match gap detection.
- Existing `public.gap_skills` rows for the `(user_id, run_id)` pair are deleted before inserting the new top gaps.
