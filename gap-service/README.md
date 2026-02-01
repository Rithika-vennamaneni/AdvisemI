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
- `DEFAULT_USER_ID` (optional; used if the client does not send `user_id` when parsing a resume)
- `DEFAULT_USER_EMAIL` / `DEFAULT_USER_PASSWORD` (optional; used to create or reuse a fallback auth user if `user_id` is missing)

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
- Optional form fields: `user_id`, `run_id`, `dream_role`, `term`
- Returns a JSON payload compatible with the frontend `ResumeParseResult` shape
- Response includes `top_skills` (flat list) and `learning_skills` (grouped for course search)

Example (curl):
```bash
curl -X POST http://localhost:8787/parse \\
  -F "file=@/path/to/resume.pdf" \\
  -F "user_id=<uuid>" \\
  -F "dream_role=Software Engineer"
```

## Persistence Notes

- If `user_id` is provided, the parser will create or reuse a `runs` row, store the raw resume text in `documents` (type `resume`), and insert `skills` with source `resume`.
- The operation is idempotent per `run_id` (existing resume documents and skills are replaced).
- Resume skills are extracted via a fast 2-step Gemini flow (candidates → top 10); if Gemini fails, a deterministic dictionary fallback is used.
- Only the final top 10 skills are persisted to `skills` with source `resume`.

## Profile Endpoint

`POST /profile`

Request body:
```json
{
  "user_id": "<uuid>",
  "dream_role": "Software Engineer",
  "term": "1-year"
}
```

Response:
```json
{
  "user_id": "<uuid>",
  "dream_role": "Software Engineer",
  "term": "1-year"
}
```

## Course Recommendation Endpoint

`POST /courses/recommend`

Request body:
```json
{
  "user_id": "<uuid>",
  "run_id": "<uuid>",
  "limit": 10
}
```

Response:
```json
{
  "user_id": "<uuid>",
  "run_id": "<uuid>",
  "inserted_count": 10,
  "recommendations": [
    {
      "course": { "subject": "CS", "number": "411", "title": "Database Systems", "course_url": "..." },
      "score": 12,
      "matched_gaps": ["SQL", "PostgreSQL"],
      "explanation": "Addresses gaps in SQL, PostgreSQL through coursework aligned to these skills."
    }
  ]
}
```

## Notes

- The service uses a single Gemini request for canonicalization and coverage matching, and retries once if the model output is invalid.
- If Gemini fails or returns invalid JSON twice, the service falls back to deterministic exact-match gap detection.
- Existing `public.gap_skills` rows for the `(user_id, run_id)` pair are deleted before inserting the new top gaps.
