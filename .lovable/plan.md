

# UIUC Career Course Planner — Updated Plan with Data Model

Building the UI prototype with mock data structured to match your Supabase schema for seamless future integration.

---

## 📊 Mock Data Structure (Matching Your Schema)

### profiles
```typescript
{
  id: "uuid",
  user_id: "uuid",
  dream_role: "Software Engineer",
  term: "2026-spring",
  created_at: "timestamp"
}
```

### documents
```typescript
{
  id: "uuid",
  user_id: "uuid",
  type: "resume" | "job_query",
  raw_text: "Full resume text...",
  created_at: "timestamp"
}
```

### skills
```typescript
{
  id: "uuid",
  user_id: "uuid",
  source: "resume" | "market",
  skill_name: "Python",
  score: 0.75,  // 0-1 float
  evidence: "3 years experience mentioned",
  created_at: "timestamp"
}
```

### gap_skills
```typescript
{
  id: "uuid",
  user_id: "uuid",
  skill_name: "System Design",
  priority: 1,  // 1 = highest
  reason: "Required for senior roles",
  created_at: "timestamp"
}
```

### courses
```typescript
{
  id: "uuid",
  term: "2026-spring",
  subject: "CS",
  number: "374",
  title: "Introduction to Algorithms",
  description: "Course description...",
  course_url: "https://courses.illinois.edu/...",
  last_synced: "timestamp"
}
```

### recommendations
```typescript
{
  id: "uuid",
  user_id: "uuid",
  course_id: "uuid",
  score: 0.85,
  matched_gaps: ["System Design", "Algorithms"],
  explanation: "This course addresses your top skill gaps...",
  created_at: "timestamp"
}
```

---

## 📄 Pages & How They Use the Data

### 1. Resume Upload Page
- Creates a **document** record with `type: "resume"` and `raw_text`
- Navigates to skills review after "extraction"

### 2. Skills Review & Edit Page
- Displays **skills** records grouped by category
- Score (0-1) maps to strength: >0.7 Strong, 0.4-0.7 Medium, <0.4 Weak
- Shows **evidence** in tooltip or expandable section
- User edits create/update skill records

### 3. Next Semester Planner ⭐
**Skill Gap Dashboard**
- Pulls from **gap_skills** table, sorted by priority
- Shows skill progress bars based on skill scores
- "Job Match %" calculated from gap_skills completion

**Recommended Courses (Left Column)**
- Uses **recommendations** joined with **courses**
- `matched_gaps` array shows which skills course addresses
- `explanation` powers the "Why this course?" expandable
- `score` determines sort order

**My Semester Plan (Right Column)**
- Filtered by **profiles.term** (e.g., "2026-spring")
- Adding course updates relevant **skills** scores
- Shows courses from **courses** table

**Progress Summary Panel**
- Courses count from user's plan
- Credits from sum of planned courses
- Match % from aggregated gap_skills improvement

### 4. Profile / Edit Skills Page
- Updates **profiles** (dream_role, term)
- CRUD operations on **skills** table

---

## 🗂️ Sample Mock Data to Include

### 12 Sample Courses (courses table)
| Subject | Number | Title | Term |
|---------|--------|-------|------|
| CS | 374 | Intro to Algorithms | 2026-spring |
| CS | 411 | Database Systems | 2026-spring |
| CS | 421 | Programming Languages | 2026-spring |
| CS | 438 | Communication Networks | 2026-spring |
| CS | 461 | Computer Security | 2026-spring |
| ECE | 391 | Computer Systems Engineering | 2026-spring |
| ECE | 408 | Applied Parallel Programming | 2026-spring |
| CS | 498 | Cloud Computing | 2026-spring |
| BADM | 352 | Database Design & Management | 2026-spring |
| IS | 457 | Cybersecurity Fundamentals | 2026-spring |
| CS | 225 | Data Structures | 2026-spring |
| CS | 357 | Numerical Methods | 2026-spring |

### Sample Skills (skills table)
| Skill | Source | Score | Evidence |
|-------|--------|-------|----------|
| Python | resume | 0.85 | "4 years experience" |
| JavaScript | resume | 0.70 | "React projects mentioned" |
| SQL | resume | 0.45 | "Basic queries in internship" |
| System Design | market | 0.30 | "Gap vs. job requirements" |
| Algorithms | resume | 0.55 | "Some coursework" |

### Sample Gap Skills (gap_skills table)
| Skill | Priority | Reason |
|-------|----------|--------|
| System Design | 1 | "Critical for SWE roles" |
| Distributed Systems | 2 | "Required by 78% of postings" |
| SQL/Databases | 3 | "Strengthen existing skill" |

### Sample Recommendations (recommendations table)
| Course | Score | Matched Gaps | Explanation |
|--------|-------|--------------|-------------|
| CS 411 | 0.92 | ["SQL", "System Design"] | "Directly addresses your database gap..." |
| ECE 391 | 0.88 | ["System Design"] | "Deep systems understanding..." |
| CS 438 | 0.75 | ["Distributed Systems"] | "Networking fundamentals for distributed..." |

---

## 🔗 Data Flow in UI

```
Resume Upload → documents.raw_text
       ↓
Skills Review → skills[] (editable)
       ↓
Planner View:
  - gap_skills → Skill Gap Dashboard
  - recommendations + courses → Recommended Courses
  - profiles.term → Semester Plan header
       ↓
Profile Page → profiles, skills (edit)
```

---

## ✨ UI Features (Unchanged)

- Drag-and-drop course tiles with hover/lift effects
- Animated skill progress bars with highlight on change
- Progress summary panel (courses, credits, match %)
- Toast notifications showing skill improvements
- UIUC orange/blue theme, balanced modern design
- Mobile-responsive layout

