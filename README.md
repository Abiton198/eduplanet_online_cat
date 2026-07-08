<div align="center">

# Eduket OS

**A multi-tenant, AI-powered school management and examination platform for African education systems.**

Built by **Nextgen Skills** · Serving CAPS/NSC, ZIMSEC, and other curricula across South Africa and beyond

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](#technology-stack)
[![Backend](https://img.shields.io/badge/Backend-Flask-3B82F6?style=for-the-badge&logo=flask)](#technology-stack)
[![Database](https://img.shields.io/badge/Database-Firestore-FFA000?style=for-the-badge&logo=firebase)](#technology-stack)
[![AI](https://img.shields.io/badge/AI-Groq%20LLM-f59e0b?style=for-the-badge)](#technology-stack)
[![License](https://img.shields.io/badge/License-Proprietary-22c55e?style=for-the-badge)](#license)

</div>

---

## Table of contents

- [What is Eduket OS](#what-is-eduket-os)
- [Who this is for](#who-this-is-for)
- [Architecture overview](#architecture-overview)
- [Technology stack](#technology-stack)
- [Core subsystems](#core-subsystems)
  - [Multi-tenancy & identity](#1-multi-tenancy--identity)
  - [Dashboards](#2-dashboards)
  - [Document extraction & exam pipeline](#3-document-extraction--exam-pipeline)
  - [AI marking engine](#4-ai-marking-engine)
  - [AI Tutor](#5-ai-tutor)
  - [Reporting & analytics](#6-reporting--analytics)
  - [Billing & pricing engine](#7-billing--pricing-engine)
- [Data model](#data-model)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Related products](#related-products)
- [Known gaps & technical debt](#known-gaps--technical-debt)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What is Eduket OS

Eduket OS (internally also referenced as **Eduplanet OS** / **EduCAT**) is a full-stack school management and AI-driven examination platform. It gives schools a single system to run exams, mark them with AI assistance, track student progress, and manage billing — while giving students an adaptive AI tutor that responds to their individual performance history.

The platform is **multi-tenant by design**: every school is an isolated data domain (`schoolId` is the universal partition key across the database), every user role (student, teacher, principal, parent) gets a purpose-built dashboard, and every institution can be on a different pricing tier, currency, and curriculum.

This is not a single exam-taking app bolted onto a CMS. It is three integrated systems working together:

1. **A school operations platform** — registration, roles, dashboards, billing.
2. **An AI exam pipeline** — ingest a real exam document (PDF/DOCX), extract structured questions and memos, let students sit the exam, and mark it with AI.
3. **An AI tutor and analytics layer** — a Groq-powered tutor with persistent memory of each student's weak areas, plus AI-generated performance gap analysis for parents, teachers, and principals.

---

## Who this is for

- **Schools** — principals need billing clarity, cross-school data isolation, and a dashboard that reflects their actual student body, not a shared pool.
- **Teachers** — need to upload exams quickly, remark AI-graded submissions when they disagree with the machine, and see class-wide performance at a glance.
- **Students** — need an exam experience that doesn't lose their progress, and a tutor that already knows what they're bad at without being told.
- **Parents** — need a report they can actually read: not raw scores, but *why* their child is struggling and what to do about it.

---

## Architecture overview

```
┌───────────────────────────────────────────────────────────────────┐
│                     React + Vite Frontend (Netlify)                │
│                                                                     │
│  Student Dashboard · Teacher Dashboard · Principal Dashboard        │
│  Parent Dashboard  · ExamResultsDisplay · ResultsTab · AITutor      │
│  AIExamMocker · SchoolRegistration · Billing UI                     │
└───────────────────┬───────────────────────────┬─────────────────────┘
                    │                           │
        Firebase SDK (direct reads)      HTTPS (POST/GET)
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────────┐
│   Firebase (Firestore,     │   │      Flask REST API (Render)       │
│   Auth, Storage)           │   │                                     │
│                             │   │  /exams/upload  /exams/usage       │
│  Security rules enforce     │   │  /agent-chat  /dashboard           │
│  schoolId isolation on      │   │  /remark  /subject-gap-analysis    │
│  every collection           │   │  /submit_exam  /start_exam         │
└───────────────────┬─────────┘   └───────────────┬─────────────────────┘
                    │                             │
                    │                             ▼
                    │              ┌───────────────────────────────────┐
                    │              │      Groq LLM (llama-3.3-70b)       │
                    │              │  Vision (per-page marking)          │
                    │              │  Tool-calling agent loop            │
                    │              │  Subject gap analysis generation    │
                    │              └───────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│              Document Extraction Pipeline (v4 architecture)         │
│                                                                     │
│  Uploaded exam file (.docx/.pdf)                                    │
│       → LibreOffice conversion → PDF                                │
│       → PyMuPDF renders each page as an image                      │
│       → Uploaded to Firebase Storage                                │
│       → Groq Vision reads each page image → structured question JSON│
└───────────────────────────────────────────────────────────────────┘
```

**Two data-access patterns are used deliberately, not interchangeably:**

- The **React frontend reads Firestore directly** wherever a live, reactive UI matters (dashboards, results, exam titles) — protected entirely by Firestore Security Rules, not by API-level auth checks.
- The **Flask backend is used for anything requiring server-side trust** — AI calls (cost/key protection), billing (PayFast signature verification), and write paths where `schoolId` and other identity fields must be derived server-side from a verified auth token rather than trusted from the client.

---

## Technology stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev iteration, component-per-feature structure |
| Frontend hosting | Netlify | Auto-deploy on push, generous free tier for a multi-school SaaS |
| Backend | Flask (Python) | Synchronous request handling matches the blocking AI marking/agent loop |
| Backend hosting | Render | Persistent process (not serverless) needed for gunicorn workers + Firebase Admin SDK init |
| Database | Firestore | Realtime, directly readable from the frontend under security rules — no API round-trip needed for dashboards |
| Auth | Firebase Auth | Multi-role sign-in (student/teacher/principal/parent), UID used as the Firestore document key |
| File storage | Firebase Storage | Stores rendered exam page images for the Groq Vision marking pipeline |
| AI / LLM | Groq — `llama-3.1-8b-instant` and `qwen/qwen3-vl-8b` | Fast inference is a hard requirement for student-facing exam marking and tutoring latency |
| Document conversion | LibreOffice (headless) | Converts uploaded `.docx` exams to PDF before page rendering |
| PDF rendering | PyMuPDF | Renders each PDF page to an image for Groq Vision to read |
| Payments | PayFast | South African payment gateway; multi-currency billing with ITN webhook verification |
| Process model | gunicorn + `post_fork` hook | Firebase Admin SDK must be re-initialized per worker process — see [Known gaps](#known-gaps--technical-debt) |

---

## Core subsystems

### 1. Multi-tenancy & identity

Every collection in Firestore carries (or is expected to carry) a `schoolId` field, and every Firestore Security Rule that grants staff access checks `sameSchool(resource.data.schoolId)` before allowing a read or write. `schoolId` is never trusted from the client on create/update paths — it is always derived server-side from the authenticated user's own `users/{uid}` document.

Roles are resolved the same way: `isTeacher()`, `isPrincipal()`, `isAdmin()`, and the combined `isStaff()` helper all read the caller's own `users/{uid}.role` field via `get()` inside the rule — never from a client-supplied claim.

### 2. Dashboards

Four distinct dashboards share the same underlying data but present it differently:

- **Student Dashboard** — exam history, AI Tutor, personalised study plan, "My Progress" insights view (`ExamResultsDisplay.jsx`).
- **Teacher Dashboard** — class-wide submission overview, per-student remarking (AI re-mark or manual), analytical report generation (`ResultsTab.jsx`).
- **Principal Dashboard** — school-wide stats, billing tier, staff management — consolidated into a single auth-gated listener to avoid the cross-school leak issues an earlier version had.
- **Parent Dashboard** — read-only, letterhead-style reports with plain-language performance summaries rather than raw marks.

### 3. Document extraction & exam pipeline

Teachers upload an existing exam document rather than authoring exams in a proprietary format. The **v4 extraction architecture** is:

```
.docx / .pdf upload
   → LibreOffice (headless) converts to PDF
   → PyMuPDF renders each page as a high-resolution image
   → Each page image uploaded to Firebase Storage
   → Groq Vision reads each page image and returns structured question JSON
   → Questions merged, deduplicated, and memo answers injected by question_number
```

Memo (answer key) matching is done strictly by the `question_number` field on each question object — never by array index — specifically because an earlier index-based lookup caused questions to receive the wrong memo answer when page ordering didn't match section ordering.

### 4. AI marking engine

Four question types are supported, each marked differently:

| Type | Marking method |
|---|---|
| Multiple choice | Exact letter match against memo — zero LLM cost, instant |
| True/False | Case-insensitive match, with optional correction-word comparison |
| Matching | Per-pair letter extraction, scored proportionally to marks available |
| Open-ended | Groq compares *meaning*, not exact wording, against the memo, returning a structured JSON score with clamping so the model can't award more than the max marks |

Teachers can trigger an **AI re-mark** (Groq re-reads the full question set and reapplies marks) or a **manual adjust** (direct per-question mark/status/feedback editing) via the Remark modal, with every change immediately reflected to both the teacher and student dashboards through the same Firestore listener.

### 5. AI Tutor

A Groq-powered, tool-calling agent (not a fixed prompt pipeline) with:

- Persistent per-student memory of weak topics, session history, and study plan.
- A constrained "Socratic hint" mode during live exams — the model is given the full memo answer internally but explicitly instructed never to reveal it, only to guide.
- Tool isolation: the AI Tutor and active exam-taking cannot run simultaneously, to prevent a student using the tutor to answer exam questions live.

### 6. Reporting & analytics

Beyond the live dashboards, the platform generates **downloadable analytical assessment reports** (`ResultsTab.jsx`), letterhead-styled with the school's logo and name, covering:

- Selectable reporting period (7/30/90/365 days, all-time, or a custom date range).
- Selectable subject filter (all subjects, or a specific multi-select).
- Overall performance, subject-by-subject breakdown (with subject teacher attributed), pass/fail counts, and trend.
- **AI-generated subject gap analysis** — rather than just listing missed questions, a dedicated backend endpoint (`/subject-gap-analysis`) sends each subject's incorrect answers to Groq and returns a real diagnostic summary, root causes, and concrete study recommendations per subject.

### 7. Billing & pricing engine

A five-tier system (**Free, Silver, Gold, Platinum, Diamond**) with:

- A pricing formula combining an institution-type multiplier and a currency-strength multiplier (USD-billed regions always bill at 3×, with no exceptions).
- Live FX rates cached in Firestore rather than fetched per-request.
- **PayFast** integration for multi-currency payment collection, including ITN (Instant Transaction Notification) webhook verification server-side.
- Billing-protected fields (`tier`, `nextBillingDate`, `tierUpdatedAt`, `pfPaymentId`, `subscribedAt`) are write-locked in Firestore Security Rules to the Admin SDK only — no client, not even a school's own principal, can set them directly. This closes a prior vulnerability where any signed-in user could write these fields on any school's document.

---

## Data model

Firestore collections, and the field that isolates them per-school:

| Collection | Purpose | Isolation key |
|---|---|---|
| `users` | Base auth-linked profile, role, schoolId | `schoolId` |
| `students` / `teachers` / `principals` | Role-specific profile documents, keyed by UID | `schoolId` |
| `schools` | School metadata, billing tier, logo, name | — (own doc) |
| `exams` | Exam metadata (title, subject, schoolId, teacher) | `schoolId` |
| `exam_questions` | Question bank per exam (no own `schoolId` — resolved via parent exam) | via `examSchoolId()` |
| `exam_attempts` | Student exam submissions, marked results, AI feedback | `schoolId`, `studentUid` |
| `examResults` / `studentResults` / `prelimResults` / `midYearResults` / `novemberResults` | Legacy and periodic result records | `schoolId` |
| `billing` | Per-school billing state | `schoolId` |
| `paymentTransactions` | PayFast transaction records — Admin SDK only, no client access | — |
| `auditLog` | Signed-in-readable/writable audit trail | — |
| `admins` | Platform admin allowlist, keyed by email | — |

> **A note on `exam_attempts` field naming:** attempt documents are written with either `studentId` (a display-name-style string) or `studentUid` (the Firebase Auth UID) depending on which upload flow created them — both fields exist for historical reasons and both are queried on the frontend to merge results. See [Known gaps](#known-gaps--technical-debt).

---

## Security model

Firestore Security Rules — not the Flask API — are the primary enforcement layer for read access, since the frontend reads Firestore directly. Key principles the ruleset follows:

- **Every role/school helper is null-safe.** `userDoc()`, `userSchoolId()`, `isTeacher()`, `sameSchool()` etc. never throw on a missing document — a missing `users/{uid}` doc degrades to "not staff," not a rule crash.
- **`schoolId` is never client-authoritative on write.** `ownsNewResultData()` requires a new attempt/result document to be claimed by the *creator's own* `studentUid`/`studentId`, and if a `schoolId` is present, it must match the creator's own school.
- **List/collection queries must be provable from their `where` clauses.** Firestore denies an entire query if it cannot statically prove the rule holds for every possible match — this has been the root cause of several "0 docs but no error" bugs in this codebase (see below), and is why every collection-level listener in this app must filter on a field the corresponding rule can actually check (typically `schoolId` or `studentUid`).
- **Billing-protected fields are write-locked to the Admin SDK.** No rule branch — including the school's own principal — can touch `tier`, `nextBillingDate`, `tierUpdatedAt`, `pfPaymentId`, or `subscribedAt` directly.
- **The wildcard fallback rule is allowlisted, not open.** A prior version allowed `create` on any collection for any signed-in user with no restriction, which — combined with `isAdmin()` only checking document *existence*, not content — allowed any user to self-grant admin by creating `admins/{their-own-email}`. This is fixed: the wildcard now only permits the same explicit collection allowlist for both `read` and `create`.

---

## Project structure

```
eduket-os/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExamResultsDisplay.jsx    Student "My Progress" dashboard + AI exam results
│   │   │   ├── ResultsTab.jsx            Teacher-facing results, remarking, report generation
│   │   │   ├── AITutor.jsx               Persistent-memory tutor chat interface
│   │   │   ├── AIExamMocker.jsx          Full exam-taking simulation UI
│   │   │   └── SchoolRegistration.jsx    Multi-step school/role registration with AI-resolved
│   │   │                                 curriculum/subject/province cascading fields
│   │   └── utils/
│   │       ├── firebase.js               Firebase project config
│   │       └── StudentId.js              Shared student identity resolution hook
│   └── firestore.rules                   Security rules (source of truth for access control)
│
├── backend/
│   ├── app.py                            Flask routes, session management
│   ├── billing_routes.py                 PayFast integration, /api/billing/initiate
│   ├── payfast-itn.js / payfast_itn.py   PayFast ITN webhook handler (Admin SDK writes)
│   ├── model.py                          Per-question-type answer marking
│   ├── agent.py                          AI tutor tool-calling loop
│   ├── process_exams.py                  v4 document extraction pipeline
│   └── memory.py                         Persistent per-student memory (weak topics, plan)
│
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Groq API key](https://console.groq.com)
- A Firebase project with Auth, Firestore, and Storage enabled
- LibreOffice installed on the backend host (required for the extraction pipeline)
- A PayFast merchant account (for billing — optional for local development)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set your Firebase config in `src/utils/firebase.js`, and point the `API` constant at your backend URL (local Flask instance or your Render deployment).

### Backend

```bash
cd backend
pip install flask flask-cors groq python-dotenv firebase-admin pymupdf
echo "GROQ_API_KEY=your_key_here" > .env
python app.py
```

### Firestore rules & indexes

Deploy `firestore.rules` via the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Composite indexes are required for several `where` + `orderBy` combinations (e.g. `exam_attempts` filtered by `schoolId` and ordered by `completedAt`). Firestore will surface a direct console link to create each missing index the first time the corresponding query runs — click through rather than pre-guessing every index by hand.

---

## Environment variables

| Variable | Where | Description |
|---|---|---|
| `GROQ_API_KEY` | Backend `.env` | Required for all AI marking, tutoring, and gap-analysis calls |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` | Backend `.env` | Required for billing; used in ITN signature verification |
| Firebase Admin credentials | Backend (Render env, JSON content — not a filename string) | Required for all server-side Firestore/Storage writes |
| Firebase client config | `frontend/src/utils/firebase.js` | Required for Auth/Firestore/Storage access from the browser |

---

## Related products

**EPRU Referee Portal** — a separate React/TypeScript application with its own Firebase backend, built for managing rugby referee appointments and coach dashboards. It shares engineering patterns with Eduket OS (schoolId-style tenant stamping, Firestore-rule-driven access) but is an independent codebase and deployment, not a module of this platform.

---

## Known gaps & technical debt

Documented honestly, because a platform at this stage should be judged on how clearly it names its own weak points, not just its features:

- **Inconsistent student identity fields on `exam_attempts`.** Some documents key the student by `studentId` (a display-name string) and others by `studentUid` (the Auth UID), depending on which write path created them. The frontend currently queries both and merges/deduplicates client-side. This works but means any Firestore rule authorizing this collection has to account for both field shapes — a future migration to a single canonical `studentUid` field (with `studentId` retained only as a display cache) would remove an entire class of "0 results but no error" bugs.
- **`examId` on attempt documents doesn't always resolve to a real `exams` collection document.** Some attempts carry a generated session-style ID rather than the actual exam document ID, which breaks title lookups and any feature that needs to join back to exam metadata (e.g. subject-teacher attribution). The current mitigation is falling back to the `subject` field for display; the underlying write path should be audited so `examId` is guaranteed to reference a real document.
- **Unfiltered Firestore listeners are an easy trap given the current rules design.** Because Firestore denies a whole query if it can't prove the rule from the `where` clause alone, any new `onSnapshot(collection(db, "..."))` added without a `schoolId`/`studentUid` filter will silently fail with `permission-denied` rather than partially succeeding. This has caused several debugging sessions in this codebase already; it's a pattern worth documenting explicitly for new contributors rather than rediscovering per-feature.
- **Firebase Admin SDK + gunicorn worker forking.** Required a `post_fork` hook to reinitialize Firebase per worker process; any new backend deployment target needs to preserve this pattern or exam submission will intermittently hang.
- **No automated test suite yet.** Bug-fixing so far has been reactive (console log → root cause → patch), which is appropriate at this stage but doesn't scale. Firestore rules in particular are a strong candidate for the Firebase Rules Unit Testing library, given how many past bugs have been rule-shape issues rather than application logic issues.
- **PDF/diagram-based question types are not yet supported** in the extraction pipeline — only text-based MCQ, True/False, Matching, and Open questions.
- **Report generation makes sequential AI calls per subject.** The `/subject-gap-analysis` endpoint currently issues one Groq call per subject in a report; for reports spanning many subjects this adds latency and could be restructured into a single batched call.

---

## Roadmap

- [ ] Migrate `exam_attempts` to a single canonical student-identity field, with a one-time backfill script for legacy documents.
- [ ] Audit and guarantee `examId` referential integrity between `exam_attempts` and `exams`.
- [ ] Add Firebase Rules Unit Tests covering the multi-tenancy and billing-field-lock invariants described above.
- [ ] Batch the subject gap analysis endpoint into a single AI call per report instead of one per subject.
- [ ] Extend the extraction pipeline to support diagram/data-response question types (relevant for CAT Paper 2 practicals).
- [ ] Extend curriculum support beyond CAPS/NSC and ZIMSEC extraction prompts to additional national curricula as new schools onboard.
- [ ] Streaming responses for the AI Tutor agent loop (currently blocks until all tool-calling rounds complete).
- [ ] Formal onboarding/setup documentation for new engineering collaborators, separate from this architectural overview.

---

## Contributing

This is an actively developed, production platform serving live schools — changes to Firestore Security Rules or the billing pipeline in particular should be treated with the same care as a database migration, not a routine UI change. When in doubt:

1. Confirm which read pattern (direct Firestore listener vs. Flask endpoint) is appropriate for the data in question, per [Security model](#security-model).
2. If adding a new Firestore query, confirm the corresponding rule can be *proven* from the query's `where` clauses before assuming it will work — see [Known gaps](#known-gaps--technical-debt).
3. Never introduce a client-writable path for `schoolId`, `tier`, or any other identity/billing field — these must always be derived server-side.

```bash
git checkout -b feature/your-feature-name
# make changes
git push origin feature/your-feature-name
# open a pull request
```

---

## License

Proprietary — © Nextgen Skills Development (Pvt) Ltd. Not licensed for redistribution without written permission.

---

<div align="center">

Built for African schools · Multi-tenant by design · AI-assisted, human-verified

</div>