# ProofPath: Execution-Verified Hiring-Evidence Agent

**Prepared for BugendaiTech Solvathon 2026 / Mission 2030**  
**Stack:** React.js (Vite), Python (FastAPI), **PostgreSQL**, OpenAI-compatible LLM API (Groq / Gemini / Ollama).  
**Version:** 1.0 (October 2026)

---

## 1. Concept Summary
ProofPath is an agentic hiring-evidence platform designed to eliminate resume exaggeration and interviewer prep fatigue while maintaining strict ethical boundaries.

### What ProofPath Does:
1. **Reads Resume with Explicit Candidate Consent**: Extracts technical claims using an OpenAI-compatible LLM.
2. **Consented GitHub Evidence Fetch**: Pulls metadata only from repositories the candidate explicitly chooses to share.
3. **Deterministic Three-State Claim Scoring**:
   - `supported`: Consented repositories corroborate the claim.
   - `unverifiable`: No public evidence found. **Crucially, missing evidence is never treated as negative.**
   - `contradicted`: Claim violates immutable temporal constraints (e.g., claiming 15 years of Kubernetes when Kubernetes was released in 2014).
4. **Execution-Verified Probes**:
   - Injects a synthetic AST mutation (e.g., operator flip `>=` to `>`) into the candidate's own code.
   - Runs unit tests in an isolated sandbox (`pytest`).
   - Keeps only mutations that the candidate's own test suite detects (`test failure`).
   - Generates interview questions and rubrics grounded in the real behavior of their code.
5. **Scenario Probes**: For candidates without public code, generates scenario challenges testing the claim.
6. **Adaptive Interview Loop**: The interviewer types or pastes the candidate's answer during the interview; the agent scores depth (0 to 3), identifies gaps, adjusts confidence, and suggests follow-up questions.
7. **Ethical Guardrails**: The system never automates hiring decisions, ranking, or rejection. A human interviewer makes every decision. Candidates can withdraw consent and trigger permanent erasure at any time.

---

## 2. Architecture & Data Flow

```
+--------------------+   HTTPS / JSON   +--------------------------+
|  React.js (Vite)   | <--------------> |  FastAPI backend (Python)|
|  - Recruiter UI    |                  |  - Auth (JWT + bcrypt)   |
|  - Interviewer UI  |                  |  - Pipeline Orchestrator |
|  - Candidate Portal|                  |  - APScheduler Background|
+--------------------+                  +-----+----------+---------+
                                              |          |
                                   SQLAlchemy |          | HTTPS (Server-side)
                                              v          v
                                      +-------------+  +-----------------+
                                      | PostgreSQL  |  | OpenAI-comp LLM |
                                      | (Relational)|  | (Groq/Gemini/   |
                                      +-------------+  |  Ollama)        |
                                              ^        +-----------------+
                                              |
                                  +-----------+-------------+
                                  | Sandbox (Isolated execution)
                                  +-------------------------+
                                  | GitHub Public REST API  |
                                  +-------------------------+
```

---

## 3. Database Schema (PostgreSQL)

ProofPath runs on **PostgreSQL** with persistent state across the interview lifecycle:

- `users`: Staff accounts (`recruiter`, `interviewer`, `admin`) with bcrypt password hashes.
- `candidates`: Candidate records, statuses (`new`, `consent_pending`, `consented`, `analyzed`, `declined`), retention limits.
- `consents`: Cryptographic token hashes, agreement timestamps, reminder counters.
- `evidence_sources`: Public consented repository URLs and parsed metadata.
- `claims`: Extracted claims, skill, years, importance, status (`supported`, `contradicted`, `unverifiable`), confidence score (0.0 to 1.0), explainable reason.
- `probes`: Generated interview probes (`verified_mutation` or `scenario`), rubrics, unified diffs, test outputs, candidate answers, follow-up questions, and usefulness ratings (1 to 5).
- `audit_log`: Immutable audit trail of every automated action.

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (Active instance, e.g. `localhost:5435` or standard `5432`)

### 1. Database & Backend Setup

You can run either the **Node.js 20 (Express)** backend or the **Python (FastAPI)** backend:

#### Option A: Node.js (Express + Babel Mutation Sandbox)
```bash
cd backend-node

# Install dependencies
npm install

# Seed demo accounts (recruiter@demo.com, interviewer@demo.com, admin@demo.com with password 'ChangeMe123!')
npm run seed

# Run end-to-end integration test
npm run test:e2e

# Start the Node.js API server (Port 8000)
npm start
# Or for automatic reload during development:
npm run dev
```
Or simply double-click `start_backend_node.bat`.

#### Option B: Python (FastAPI + Pytest Sandbox)
```bash
cd backend

# Create virtual environment (optional)
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate

# Install dependencies (including psycopg/psycopg2 for PostgreSQL)
pip install -r requirements.txt

# Configure .env
cp .env.example .env

# Seed initial staff users
python seed.py

# Run tests to verify
python -m pytest -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Or simply double-click `start_backend.bat`.

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. End-to-End Walkthrough

1. **Sign In**: Navigate to `http://localhost:5173` and click "Recruiter" for one-click demo login.
2. **Upload or Generate Resume**:
   - Use the "+ Quick Synthetic Candidate" button or upload any `.pdf` or `.txt` resume.
3. **Request Consent**:
   - Open the candidate briefing and click **🔗 Create Consent Link**.
   - Copy or click "Open Link ↗" to view the Candidate Consent Portal (`/consent/:token`).
4. **Candidate Consent & Repository Link**:
   - Candidate views the transparency disclosure, checks "I agree", and inputs public repository URLs (e.g. `sample_repos/age_utils` or GitHub URLs).
   - Submitting triggers the background agent pipeline.
5. **Interviewer Briefing**:
   - Claims appear with color-coded status badges:
     - `contradicted` (e.g., 15 years of Kubernetes).
     - `supported` (evidence found in consented repositories).
     - `unverifiable` (no public evidence found).
   - **Execution-Verified Probes** display the exact AST diff and failing test trace.
6. **Adaptive Interview**:
   - The interviewer asks the question and enters the candidate's answer.
   - Clicking **Evaluate Answer** prompts the agent to return the candidate's evaluated depth (0 to 3), identified gaps, and a dynamic follow-up question.
7. **Rate Probe Usefulness**:
   - Click a rating from 1 to 5 to train the priority loop displayed on the learning dashboard.
8. **Right-to-be-Forgotten**:
   - Candidates can click "Withdraw & Erase" from their consent page, instantly removing all records.

---

## 6. Security, Privacy & Legal Compliance

| Risk | ProofPath Mitigation |
| :--- | :--- |
| **Prompt Injection** | Resumes and answers are wrapped as untrusted data tags (`<resume>`, `<answer>`). Pydantic models strictly validate JSON. **Claim status is computed by deterministic Python code, never by the LLM.** |
| **Untrusted Code Execution** | Code is analyzed via AST mutation and tested inside isolated execution sandboxes with no network access, memory limits, and strict timeouts. |
| **Data Privacy & Erasure** | No protected attributes (race, gender, religion, age) are ever stored or queried. Candidate records feature automated 90-day retention cascades and instantaneous withdrawal endpoints. |
| **Regulatory Alignment** | Designed in accordance with EU AI Act (high-risk HR tool safeguards), NYC Local Law 144 (auditability and transparency), and India DPDP Act (explicit consent records). |
