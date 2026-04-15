<div align="center">

# EduCAT — AI Agentic Smart Study Partner

**An autonomous AI agent for South African NSC CAT Grade 12 students.**  
Built with Groq LLMs · Flask · RAG · SQLite · React · Firebase

[![Live Demo](https://img.shields.io/badge/Live%20Demo-edu--cat.netlify.app-6366f1?style=for-the-badge&logo=netlify)](https://edu-cat.netlify.app)
[![Backend API](https://img.shields.io/badge/API-PythonAnywhere-3B82F6?style=for-the-badge&logo=python)](https://abitonp.pythonanywhere.com)
[![Model](https://img.shields.io/badge/LLM-llama--3.3--70b-f59e0b?style=for-the-badge)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## What is EduCAT?

EduCAT is not a chatbot. It is an **AI agent** — a system where the LLM autonomously decides what to do next based on each student's situation. When a student sends a message, the agent reads their full memory context (past exam scores, weak topics, conversation history) and then picks from a set of tools: searching theory textbooks, retrieving weak-area data, generating a Socratic hint, grading a written answer, or updating a personalised study plan. The developer never hardcodes which action to take. The model decides.

This distinction — agent vs pipeline — is what makes EduCAT genuinely adaptive. Every student gets a different experience because the agent's decisions are driven by that student's individual history.

---

## Table of contents

- [Architecture overview](#architecture-overview)
- [What makes it agentic](#what-makes-it-agentic)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Setup and installation](#setup-and-installation)
- [Exam pipeline](#exam-pipeline)
- [Key design decisions](#key-design-decisions)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│              React frontend  (Next.js + Tailwind)        │
│  CATTutor · AIExamMocker · ExamResultsDisplay           │
│  useStudentId hook → Firebase Auth → real student name  │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS  POST
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Flask REST API  (PythonAnywhere)               │
│  /agent-chat  /submit  /question  /answer               │
│  /exams  /dashboard  /clear-history                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              AI Agent Loop  (agent.py)                   │
│                                                         │
│  system prompt + student context                        │
│       ↓                                                 │
│  Groq API  llama-3.3-70b-versatile                      │
│  tool_choice="auto"  ←──────────────────────────────┐  │
│       ↓                                             │  │
│  tool calls?  ──yes──→  run tool  →  result ────────┘  │
│       ↓ no                                              │
│  final answer → student                                 │
│                                                         │
│  max 5 rounds · graceful fallback on tool_use_failed    │
└──────────┬─────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────┐
    │              Tool layer                      │
    │                                             │
    │  search_theory      → FAISS RAG index       │
    │  get_weak_topics    → SQLite memory          │
    │  get_session_history→ SQLite memory          │
    │  generate_hint      → Groq (Socratic)        │
    │  mark_open_answer   → model.py (AI grading) │
    │  update_study_plan  → SQLite memory          │
    │  get_study_plan     → SQLite memory          │
    └──────┬──────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────┐
    │              Data layer                      │
    │                                             │
    │  SQLite          student memory             │
    │  Exam JSON files question + memo store      │
    │  Firestore       exam attempts + results    │
    │  FAISS index     theory book chunks         │
    └─────────────────────────────────────────────┘
           ▲
           │  (one-time, offline)
┌──────────┴──────────────────────────────────────┐
│         Exam extraction pipeline                 │
│         process_exams.py                        │
│                                                 │
│  NSC PDF → chunks → Groq → question JSON        │
│  Memo PDF → chunks → Groq → answer injection    │
│  Sliding window stitching · deduplication       │
└─────────────────────────────────────────────────┘
```

---

## What makes it agentic

Most "AI" education tools are fixed pipelines. A student asks a question, a prompt is sent to an LLM, an answer comes back. The routing is hardcoded by the developer. EduCAT works differently.

**The LLM is the router.** When a student says "what should I study?", the agent does not run a preset function. It reads the student's message, their weak topic history, and their recent exam scores — then decides to call `get_weak_topics`, then `get_session_history`, then `update_study_plan` with a personalised schedule it writes itself. A different student with different history gets a different tool sequence.

**The loop is autonomous.** After each tool call, the LLM sees the result and decides whether to call another tool or respond. This continues for up to five rounds. A request that needs three tool calls uses three; a simple question that needs none gets answered directly. The agent allocates its own compute.

**Memory is persistent.** Every wrong answer recorded in an exam updates the student's `weak_questions` table in SQLite. The agent reads this on every subsequent turn. A student who struggled with Question 4.7 last week will automatically receive more emphasis on operating systems concepts this week — without any explicit programming to make that happen.

**Hints are Socratic, not revealing.** When a student asks for help mid-exam, the agent calls `generate_hint` which runs a separate constrained LLM prompt that guides without spoiling. The full memo answer is passed internally to the hint generator but explicitly blocked from appearing in the output.

---

## Features

### AI agent tutor (CATTutor)

- Autonomous tool-calling loop powered by Groq llama-3.3-70b
- RAG-grounded answers from CAT Grade 12 theory textbook using FAISS vector search
- Persistent multi-turn conversation history stored in SQLite across sessions
- Text-to-speech with voice selection, speed and pitch controls
- Dark mode, font size scaling, fullscreen focus mode
- Suggested topic chips on empty state
- Clears both local state and server-side conversation history on reset

### AI exam mocker (AIExamMocker)

- Full NSC paper simulation supporting four question types:
  - Multiple choice with radio options
  - True/False with optional correction word input
  - Matching with column A dropdown selection
  - Open-ended with auto-growing textarea
- Question navigator drawer with colour-coded dots (answered / skipped / unanswered / current)
- Fullscreen mode with keyboard navigation (`←` `→` for questions, `Ctrl+F` to toggle, `Esc` to exit)
- Real-time save on every answer change — no lost progress on navigation
- Submit saves full marked results and AI feedback to Firestore immediately
- Agent auto-updates personalised study plan after each submission
- Post-submit agent chat panel lets students ask about specific questions

### AI exam marking (model.py)

- MCQ: exact letter match against memo — zero LLM cost, instant
- True/False: case-insensitive match with correction word comparison using regex splitting
- Matching: per-pair letter extraction and scoring, scales to marks proportionally
- Open: LLM compares meaning (not wording) against memo using structured JSON output with score clamping
- Memo sourced strictly from `q["memo"]` field — never from array index, eliminating the class of bug where question 1.1 received question 10.3.2's answer

### Comprehensive results dashboard (ExamResultsDisplay)

- Unified view merging three data sources: AI exam attempts, teacher-marked results, historical grades
- Score timeline bar chart across all sources with colour coding by performance band
- Weak-area analysis combining AI wrong-count tracking, legacy wrong answers, and AI marked results
- Automated recommendations engine producing contextual cards:
  - Urgent warning when average is below 50%
  - Trend alert when last result drops more than 5 points
  - MCQ strategy tip when three or more MCQ questions appear in weak areas
  - Encouragement when performance is strong with few weak areas
- Four tabs: My Progress (default) · AI Exams · Grade N · History
- Student identity header showing resolved real name and exam count breakdown

### Offline exam extraction pipeline (process_exams.py)

- Accepts chunked PDF JSON from any chunking tool
- Classifies files as exam paper or memo by keyword matching
- Stitches all chunks into one text, then slides 6000-character overlapping windows
- Sends each window to Groq with a strict schema prompt returning typed question JSON
- Deduplicates questions across windows by completeness score (options populated, column lists present)
- Extracts memo answers keyed by exact question number (1.1, 4.7.1, 9.3.2)
- Injects answers into exam JSON strictly by question_number field match
- Tracker file prevents re-extraction on subsequent runs
- Validation prints Section A spot-check after every memo merge

### Persistent student memory (memory.py)

SQLite database with five tables:

| Table | Contents |
|-------|----------|
| `students` | Student ID, display name, created timestamp |
| `sessions` | Exam name, score, total, percentage, played_at |
| `weak_questions` | Question number, wrong count, question text, type, topic, last seen |
| `conversation_history` | Role, content, tool_call_id, tool_name, created_at |
| `study_plan` | Plan text, updated_at |

Wrong counts increment on failure and decrement on success — a question the student masters gradually disappears from weak areas.

### Student identity hook (studentId.js)

Priority resolution chain:
1. Firestore `students/{uid}.name`
2. Firebase Auth `displayName`
3. Email prefix (`thabo.mokoena@school.com` → `thabo.mokoena`)
4. Cached localStorage value from previous session
5. Anonymous random fallback

`useStudentId()` returns the cached value synchronously on first render (no flicker), then updates when Firebase resolves. Shared `educat_sid` key across all components ensures consistent identity in SQLite, Firestore, and agent calls.

---

## Technology stack

| Layer | Technology | Why |
|-------|-----------|-----|
| LLM | Groq — llama-3.3-70b-versatile | Fastest open-weight inference available; critical for student-facing latency |
| Agent framework | Custom Python (agent.py) | Full control over retry logic, tool result capping, fallback behaviour |
| RAG | FAISS + custom chunker | Zero-dependency similarity search; theory books indexed offline |
| Backend | Flask (Python) | Synchronous request handling matches the blocking agent loop |
| Persistent memory | SQLite (memory.py) | Server-local, zero-latency state for per-request memory reads/writes |
| Exam pipeline | Python + Groq | Reuses the same LLM for both chat and document extraction |
| Frontend | React + Next.js + TailwindCSS | Component-per-feature architecture; Tailwind for consistent styling |
| Auth | Firebase Auth | Google sign-in out of the box; UID used as Firestore document key |
| Database | Firestore | Student-facing exam attempt records readable from React without an API call |
| Deployment | PythonAnywhere + Netlify | Flask runs persistently on PythonAnywhere; frontend auto-deploys on git push |

---

## Project structure

```
educat/
│
├── app.py                    Flask API — all routes, session management
├── agent.py                  AI agent loop, tool definitions, tool runners
├── model.py                  Answer marking for all four question types
├── memory.py                 SQLite schema, all read/write helpers
├── rag.py                    FAISS RAG index — build and query
├── process_exams.py          Offline PDF → structured exam JSON pipeline
│
├── processed/                Input: chunked PDF JSON files
├── exams/                    Output: extracted exam JSON with memo injected
├── student_memory.db         SQLite database (auto-created on first run)
├── processed_exams.json      Extraction tracker — prevents re-runs
│
├── .env                      GROQ_API_KEY (never committed)
│
└── src/
    ├── components/
    │   ├── CATTutor.jsx              AI tutor chat interface
    │   ├── AIExamMocker.jsx          Full NSC exam simulation
    │   └── ExamResultsDisplay.jsx    Unified results + progress dashboard
    └── utils/
        ├── firebase.js               Firebase project config
        └── studentId.js              Shared student identity hook
```

---

## Setup and installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com)
- A Firebase project with Auth and Firestore enabled

### Backend

```bash
# Clone the repository
git clone https://github.com/abiton198/eduplanet_online_cat.git
cd eduplanet_online_cat

# Install Python dependencies
pip install flask flask-cors groq python-dotenv faiss-cpu

# Create environment file
echo "GROQ_API_KEY=your_key_here" > .env

# Start the development server
python app.py
# Runs on http://localhost:8000
```

### Frontend

```bash
# Install Node dependencies
npm install

# Start the development server
npm run dev
# Runs on http://localhost:3000
```

Update the `API` constant at the top of each component to point to your backend:

```javascript
const API = "http://localhost:8000";   // development
// const API = "https://yourapp.pythonanywhere.com";  // production
```

### Firebase

Create `src/utils/firebase.js`:

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  // ... rest of your config
};

const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);
```

### Firestore indexes required

Add these composite indexes in the Firebase console (you will be prompted with a direct link the first time each query runs):

```
Collection: exam_attempts
  Field: studentId   ASC
  Field: createdAt   DESC

Collection: exam_attempts
  Field: studentId   ASC
  Field: createdAt   DESC
  (second index for the name-based query)
```

---

## Exam pipeline

The pipeline converts NSC past paper PDFs into the structured JSON format the exam mocker and agent use.

### Step 1 — Chunk your PDFs

Use any PDF chunker to split exam papers and memos into JSON files:

```json
[
  { "source": "Nov_Theory_2024.pdf", "chunk_index": 0, "total_chunks": 10, "content": "..." },
  { "source": "Nov_Theory_2024.pdf", "chunk_index": 1, "total_chunks": 10, "content": "..." }
]
```

Place files in the `processed/` folder. Name conventions:
- Exam papers: include keywords like `nov`, `theory`, `paper`, `term`, `p1`, `exam`
- Memo files: include keywords like `memo`, `memorandum`, `marking`, `answers`

### Step 2 — Run extraction

```bash
python process_exams.py
```

The pipeline:
1. Classifies every JSON file as exam, memo, or skip
2. For each exam: stitches all chunks → slides 6000-char windows → extracts questions via Groq
3. Deduplicates questions by completeness, merges sections, saves to `exams/`
4. For each memo: extracts all answers → matches to exam by shared year/month keywords → injects answers by question number
5. Prints a Section A spot-check table so you can verify 1.1=C, 1.2=C etc. before deploying

### Step 3 — Verify output

```bash
ls exams/
# nov_theory_2024_exam.json
# may_theory_2025_exam.json

python -c "
import json
with open('exams/nov_theory_2024_exam.json') as f:
    e = json.load(f)
print(f'Questions: {e[\"total_questions\"]}')
print(f'Memo merged: {e[\"memo_merged\"]}')
for s in e['sections']:
    print(f'Section {s[\"section\"]}: {len(s[\"questions\"])} questions')
"
```

### Output format

```json
{
  "source": "Nov_Theory_2024.json",
  "total_questions": 47,
  "type_breakdown": { "mcq": 10, "matching": 1, "true_false": 5, "open": 31 },
  "memo_merged": true,
  "memo_source": "Nov_memo_2024.json",
  "sections": [
    {
      "section": "A",
      "section_title": "SECTION A",
      "section_instructions": "Answer ALL the questions.",
      "total_marks": 25,
      "questions": [
        {
          "id": 1,
          "question_number": "1.1",
          "parent_question": "QUESTION 1: MULTIPLE-CHOICE QUESTIONS",
          "parent_context": null,
          "question": "A pointing device that allows for gestures like pinch-to-zoom...",
          "type": "mcq",
          "options": { "A": "Trackball", "B": "Stylus", "C": "Touchpad", "D": "Mouse" },
          "marks": 1,
          "memo": "C"
        }
      ]
    }
  ]
}
```

---

## Key design decisions

### Why an agent instead of a fixed pipeline

A pipeline hardcodes routes: "if the user asks about a concept, call RAG". An agent lets the LLM decide when RAG is relevant, when memory is more useful, when to give a hint rather than an answer. This means the system handles unanticipated combinations — a student who asks "what should I study based on how I did in Q4?" gets the agent calling `get_weak_topics`, `get_session_history`, and `update_study_plan` in sequence, without any code path pre-written for that exact question.

### Why Groq for the LLM

Groq's LPU inference delivers llama-3.3-70b responses in under two seconds, compared to six to twelve seconds on comparable GPU-based APIs. For a student-facing application, this is a meaningful UX difference. The tool-calling API is also stable — the agent uses only primitive string and integer argument types because Groq rejects array-typed tool parameters, a constraint that was discovered through production errors and resolved by removing the `choose_practice_question` tool's array argument.

### Why the memo lookup is strictly by question_number field

The original bug that caused "Kickstarter" to appear as the answer for MCQ question 1.1 was a `load_exam_memo()` function that rebuilt a flat `{ question_number: memo }` dict by scanning the entire exam JSON, then looked up answers by question number from that external dict. An off-by-one or key collision meant question 1.1 received question 10.3.2's answer. The fix was architectural: the memo is embedded in `q["memo"]` by the extraction pipeline and accessed directly from the question dict. No external lookup, no possible mismatch.

### Why sliding-window stitching in the extraction pipeline

NSC exam PDFs chunk at page boundaries. The last MCQ option for question 1.2 is frequently on the next page from the question stem. Processing chunks individually means the LLM sees an incomplete question and either skips it or invents options. Stitching all chunks into one string and sliding over it with a 500-character overlap guarantees every question appears complete in at least one window.

### Why SQLite for agent memory and Firestore for exam results

Agent memory (weak topics, conversation history, study plan) is read and written on every agent request. SQLite is synchronous and server-local — zero network latency, consistent with Flask's synchronous request model. Firestore is used for exam attempt records because those need to be directly readable from the React frontend without routing through the Flask API, enabling the `ExamResultsDisplay` component to query Firestore directly using the Firebase SDK.

### Why the student identity hook uses a priority chain

Different students arrive at the system through different paths. Some are registered in Firestore with a full profile. Some are authenticated through Firebase Auth but have no profile doc. Some arrive anonymously. The priority chain handles all cases gracefully, always resolving to the most human-readable identifier available. The localStorage cache ensures that once resolved, the identity is available synchronously on every subsequent render without re-fetching.

---

## API reference

All endpoints accept and return JSON. Base URL in production: `https://abitonp.pythonanywhere.com`

### POST /agent-chat

Sends a message to the AI agent. The agent decides which tools to call and returns a final response.

```json
Request:
{
  "student_id": "Thabo Mokoena",
  "message": "What should I study this week?"
}

Response:
{
  "response": "Based on your recent results, you struggled most with..."
}
```

### POST /start-exam

Initialises an exam session for a student.

```json
Request:
{ "exam": "nov_theory_2024_exam.json", "student_id": "Thabo Mokoena" }

Response:
{ "session_id": "uuid", "total_questions": 47, "memo_merged": true }
```

### POST /question

Returns a single question by index.

```json
Request:
{ "session_id": "uuid", "index": 0 }

Response:
{
  "question_number": "1.1",
  "question": "A pointing device that allows...",
  "type": "mcq",
  "options": [{"key": "A", "value": "Trackball"}, ...],
  "marks": 1,
  "memo": "C",
  "saved_answer": ""
}
```

### POST /answer

Saves a student's answer for a question.

```json
Request:
{ "session_id": "uuid", "index": 0, "answer": "C" }

Response:
{ "status": "saved", "index": 0 }
```

### POST /submit

Submits the exam, marks all answers, updates student memory, triggers study plan update.

```json
Request:
{ "session_id": "uuid", "student_id": "Thabo Mokoena" }

Response:
{
  "score": 38,
  "total": 47,
  "percentage": 80.9,
  "feedback": "Excellent work! You scored above 75%...",
  "results": [
    {
      "question_number": "1.1",
      "question": "A pointing device...",
      "type": "mcq",
      "marks": 1,
      "student_answer": "C",
      "correct_answer": "C. Touchpad",
      "score": 1,
      "earned": 1,
      "feedback": "Correct! Answer: C (Touchpad).",
      "status": "correct"
    }
  ]
}
```

### POST /dashboard

Returns student's weak areas, session history, and study plan for the progress dashboard.

```json
Request:
{ "student_id": "Thabo Mokoena" }

Response:
{
  "weak": [
    { "question_number": "4.7.1", "q_type": "open", "wrong_count": 3, "question_text": "..." }
  ],
  "sessions": [
    { "exam_name": "nov_theory_2024_exam.json", "score": 38, "total": 47, "percentage": 80.9 }
  ],
  "study_plan": { "plan": "Focus on...", "updated_at": "2025-01-15 14:23:00" }
}
```

### GET /exams

Returns list of available exam files.

```json
Response:
{ "exams": ["nov_theory_2024_exam.json", "may_theory_2025_exam.json"] }
```

### POST /clear-history

Clears the student's conversation history from SQLite.

```json
Request:
{ "student_id": "Thabo Mokoena" }
Response:
{ "status": "cleared" }
```

---

## Deployment

### Backend — PythonAnywhere

1. Upload these files to your PythonAnywhere home directory:
   `app.py` · `agent.py` · `model.py` · `memory.py` · `rag.py`

2. Upload the `exams/` folder with your processed exam JSON files

3. In the PythonAnywhere Web tab, set the WSGI file to point to your Flask `app`

4. Set the `GROQ_API_KEY` environment variable in the PythonAnywhere dashboard

5. The SQLite database `student_memory.db` is created automatically on first run

6. Reload the web app

### Frontend — Netlify

1. Push your repository to GitHub

2. In Netlify, click "New site from Git" and connect your repository

3. Build command: `npm run build`

4. Publish directory: `out` (for Next.js static export) or `.next` (for SSR)

5. Set the `API` constant in all three components to your PythonAnywhere URL before pushing

Netlify auto-deploys on every push to your main branch.

---

## Environment variables

| Variable | Where | Description |
|---------|-------|-------------|
| `GROQ_API_KEY` | Backend `.env` | Required. Get from console.groq.com |
| Firebase config | `src/utils/firebase.js` | Required. From Firebase project settings |

No other secrets required. The SQLite database is local to the server.

---

## Contributing

Contributions are welcome. Here are the most valuable areas:

- **Streaming responses** — the agent loop currently blocks until all tool rounds complete. Adding Server-Sent Events to stream partial responses would significantly improve perceived latency
- **More question types** — the pipeline currently handles MCQ, True/False, Matching, and Open. Diagram-based questions and data-response questions from NSC CAT P2 practical papers are not yet supported
- **Additional subjects** — the RAG index and extraction prompts are tuned for CAT. Extending to IT, Mathematics, or other NSC subjects would require subject-specific extraction prompts and separate theory book indexes
- **Vector database migration** — replacing the FAISS flat index with Pinecone or Weaviate would allow incremental updates without rebuilding the full index

To contribute:

```bash
git fork https://github.com/abiton198/eduplanet_online_cat.git
git checkout -b feature/your-feature-name
# make changes
git push origin feature/your-feature-name
# open a pull request
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [Groq](https://groq.com) for LPU-accelerated llama-3.3-70b inference
- [Meta AI](https://ai.meta.com) for the llama-3.3-70b-versatile model
- [Firebase](https://firebase.google.com) for authentication and Firestore
- [FAISS](https://github.com/facebookresearch/faiss) for vector similarity search
- [TailwindCSS](https://tailwindcss.com) for the styling framework
- The Department of Basic Education (DBE) for publishing NSC past papers

---

<div align="center">

Built for South African students · Powered by open-weight LLMs · MIT Licensed

</div>