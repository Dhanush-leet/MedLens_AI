# MedLens AI

**A transparent, multilingual, multimodal clinical triage assistant — built to show you not just what it thinks, but why.**

MedLens AI helps users understand the urgency of their symptoms through a grounded, explainable, four-stage AI reasoning pipeline — instead of a single opaque LLM call. Every stage of the reasoning process is visible in the interface, every answer is grounded in a real medical knowledge base via retrieval-augmented generation, and every response comes with clear, guardrailed safety behavior.

> ⚠️ **MedLens AI does not provide medical diagnoses.** It is a triage-assistance tool designed to help users decide how urgently to seek professional care. Always consult a licensed medical professional, and contact local emergency services directly in a medical emergency.

---

## Table of contents

- [Features](#features)
- [Why it's different](#why-its-different)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [The reasoning pipeline](#the-reasoning-pipeline)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Safety & responsible AI](#safety--responsible-ai)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- 🧠 **Four-stage transparent AI pipeline** — extract, retrieve, reason, respond — shown live in the UI, not hidden behind a single black-box call
- 📚 **Retrieval-augmented generation (RAG)** — answers grounded in a real, curated medical knowledge base via a vector database, reducing hallucination
- 🖼️ **Multimodal input** — describe symptoms in text, or upload a photo of a rash, prescription, or lab report for automatic extraction
- 🎙️ **Voice input** — speak symptoms instead of typing, in English or Tamil
- 🌐 **Multilingual support** — full English and Tamil support, with reasoning consistently grounded in English internally for safety
- 🚨 **Emergency SOS** — automatic emergency-level detection with a prominent real-emergency-number prompt and an optional, explicitly user-confirmed alert to a pre-registered emergency contact
- 🔐 **Authentication** — secure signup/login with hashed passwords and JWT-based sessions
- 🐳 **Fully containerized** — the entire stack (frontend, backend, MongoDB, vector DB) runs via a single `docker compose up`

---

## Why it's different

Most AI health tools send a question to an LLM and print whatever comes back — a black box, which isn't good enough for something as sensitive as health guidance. MedLens AI is built as a staged, auditable pipeline instead:

1. **Extract** — structured facts are pulled from any uploaded image
2. **Retrieve** — relevant knowledge is fetched from a real, embedded medical reference set
3. **Reason** — a guardrailed reasoning step combines retrieved knowledge with the user's input under explicit safety rules
4. **Respond** — a final, plain-language, structured answer

Because it's grounded in retrieval rather than pure generation, answers are traceable back to real reference material, and because it's staged with hard safety rules, it fails safely instead of confidently hallucinating.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion |
| LLM | Google Gemini API (multimodal — text, vision, embeddings) |
| Vector database | Qdrant |
| Document database | MongoDB |
| Authentication | JWT (PyJWT) + bcrypt password hashing (passlib) |
| Containerization | Docker, Docker Compose |
| Deployment | Self-hosted on a cloud VM (Docker Compose), Nginx reverse proxy |

---

## Architecture

```
User (React + TS)
      │
      ▼
API layer (FastAPI)
      │
      ├── 1. Extraction prompt (Gemini vision, JSON schema)
      │
      ├── 2. Vector retrieval (Qdrant, embeddings)
      │
      ├── 3. Reasoning prompt chain (grounded, few-shot, guardrails)
      │
      └── 4. Response builder (urgency, explanation, specialist)
                │
                ▼
      MongoDB (sessions, users, triage results)
                │
                ▼
      Docker Compose → cloud VM
```

---

## The reasoning pipeline

| Stage | What it does |
|---|---|
| **Extraction** | If an image is uploaded, Gemini's vision capability extracts structured data (medicines, lab values, visible symptoms) into a strict JSON schema |
| **Retrieval** | The user's query is embedded and matched against a vector database of curated medical reference chunks; low-relevance matches are flagged rather than used to force a confident answer |
| **Reasoning** | A guardrailed prompt combines the retrieved context, few-shot examples, and hard safety rules (e.g. immediate "Emergency" classification for red-flag symptom patterns, regardless of other context) |
| **Response** | The reasoning output is formatted into a final structured result: urgency level, plain-language explanation, red flags, recommended specialist, and a non-dismissible disclaimer |

An intent-routing step also classifies each incoming message as a symptom check, a general health question, a follow-up, or out of scope, so the pipeline responds appropriately rather than forcing every input into the same rigid format.

---

## Project structure

```
medlens-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── services/          # gemini_client, vector_store, mongo_client, pipeline, alert_service
│   │   ├── prompts/            # extraction, reasoning, response prompt templates
│   │   ├── routers/            # triage, history, auth
│   │   └── ingest/              # knowledge base build script
│   ├── data/knowledge_base/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/               # Landing, Login, Signup, App
│   │   ├── context/              # AuthContext
│   │   └── api/
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Getting started

### Prerequisites
- Docker and Docker Compose installed
- A Google Gemini API key

### Setup

```bash
git clone https://github.com/<your-username>/medlens-ai.git
cd medlens-ai
cp .env.example .env
# open .env and add your GEMINI_API_KEY and JWT_SECRET
docker compose up -d --build
```

### One-time knowledge base setup

```bash
docker compose exec backend python -m app.ingest.build_knowledge_base
```

### Access

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API docs (FastAPI auto-generated): [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Environment variables

```
GEMINI_API_KEY=your_key_here
JWT_SECRET=a_long_random_secret_string
MONGO_URI=mongodb://mongo:27017/medlens
VECTOR_DB_URL=http://qdrant:6333
ENVIRONMENT=development
```

See `.env.example` for the template. Never commit a real `.env` file.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create a new user account |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/auth/me` | Verify the current session and return user info |
| POST | `/api/triage` | Run the full reasoning pipeline on a text/image input |
| GET | `/api/history/{session_id}` | Retrieve past messages and results for a session |
| POST | `/api/emergency-contact` | Register an emergency contact (requires consent) |
| POST | `/api/emergency-alert` | Send an SOS alert to a registered contact (explicit user action only) |
| GET | `/api/health` | Health check |

Full interactive documentation is available at `/docs` once the backend is running (FastAPI's built-in Swagger UI).

---

## Deployment

The entire stack is deployed via Docker Compose on a cloud VM (AWS EC2 / Oracle Cloud / GCP) — no managed database services required, since MongoDB and Qdrant both run as containers with persistent volumes.

```bash
# on the VM
git clone https://github.com/<your-username>/medlens-ai.git
cd medlens-ai
cp .env.example .env   # fill in real values
docker compose up -d --build
```

See `docs/deployment.md` (or the deployment guide in your project docs) for full VM setup, firewall configuration, and optional HTTPS via Caddy or Certbot.

---

## Safety & responsible AI

- Non-dismissible disclaimer shown on every triage result
- Hard-coded emergency override for red-flag symptom patterns, independent of the model's own reasoning
- Retrieval relevance is checked — low-confidence grounding is disclosed rather than papered over
- Emergency alerts require explicit user confirmation and are never sent automatically
- Passwords are hashed with bcrypt and never stored in plain text
- No patient data is used for model training; the only external data flow is the Gemini API call itself

---

## Roadmap

- Wearable device data integration
- Additional regional languages
- Doctor-facing dashboard for reviewing triage patterns
- Refresh-token rotation for longer-lived sessions

---

## License

This project was built as an academic/hackathon submission. Add your preferred license here (e.g. MIT) before making the repository public if you intend for others to reuse the code.
