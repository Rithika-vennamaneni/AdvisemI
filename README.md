# AdvisemI

> "An intelligent system that maps career skill gaps to the right courses, instantly."

🏆 **Winner — Lovable Prize, Keywords AI Hackathon @ UIUC (2026)**

AdvisemI bridges the gap between job market demands and university coursework. 
Students paste a job description, and the system identifies which required skills 
are missing from their profile and recommends specific UIUC courses to close those gaps.

---

## The Problem

Job descriptions list dozens of skills, but it's rarely clear which ones actually 
matter, which ones you already have under a different name, and what to learn next. 
Course catalogs are large and disconnected from real job requirements. AdvisemI 
connects these two worlds in a practical, explainable way.

## How It Works

The system runs as a modular backend-first pipeline:

1. **Ingestion** — Resumes and job descriptions are parsed and stored separately
2. **Skill extraction** — Skills are extracted from both, preserving context
3. **Gap analysis** — Resume skills are compared against job requirements using 
   AI semantic matching to handle synonyms and partial coverage
4. **Course recommendation** — Gap skills are matched against the UIUC Course 
   Explorer API and ranked by alignment

AI is used only where it adds clear value (semantic skill matching). Every other 
step is deterministic and testable.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui (via Lovable)
- **Backend:** Node.js, TypeScript, Python
- **Database:** Supabase (PostgreSQL)
- **APIs:** Keywords AI, Adzuna (job listings), UIUC Course Explorer
- **AI-assisted development:** Lovable, Cursor

## Key Design Decisions

- Kept the pipeline modular and idempotent — each step can be safely rerun 
  without corrupting data
- Used AI for semantic matching only, not as a black box over the full pipeline
- Designed for transparency: every recommendation is traceable to a specific 
  skill gap

## Demo

[![AdvisemI Demo](https://img.youtube.com/vi/Enm_k7MkJsY/0.jpg)](https://www.youtube.com/watch?v=Enm_k7MkJsY)

---


