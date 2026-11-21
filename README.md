# LegalEval Analytics Platform

An institutional research analytics platform designed for the empirical comparative evaluation of legal AI architectures across retrieval, generation, and question-answering benchmarks.

---

## Overview

The platform provides standardized evaluation metrics, multi-pipeline comparative visualizations, and interactive research documentation for three legal AI systems:

- **LexVed**: Multi-embedding evaluation evaluating four representation models (BAAI/bge-large-en-v1.5, text-embedding-3-large, text-embedding-ada-002, UAE-Large-V1) across primitive and enhanced retrieval pipelines.
- **LexRAG**: Generation benchmark suite measuring lexical overlap (ROUGE-1/2/L, BLEU-1 to 4), semantic fidelity (BERTScore Precision, Recall, F1), METEOR, and factual consistency.
- **AILQA**: Legal question-answering and dense retrieval benchmark measuring Recall@K, MRR, nDCG, and synthesis precision.

---

## Key Features

- **Empirical Metrics Hub**: Cross-pipeline performance comparison covering 31 legal benchmark indicators with sorting, filtering, and delta analysis.
- **Interactive Metric Progression**: Dynamic line charts comparing pipelines and embedding configurations across individual metrics.
- **Research Notes and Findings**: Persistent research observation and note-taking workspace integrated directly into the evaluation runs.
- **High-Contrast Institutional Theme**: Clean, desktop-optimized light interface featuring pitch black, canary yellow accents, and crisp white typography.
- **Dual Deployment Architecture**: Configured for local development and unified Vercel serverless deployment (Vite SPA + FastAPI ASGI handler).

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite
- **Deployment**: Vercel Serverless Functions (`@vercel/python` runtime)

---

## Repository Structure

```
Project_Comparison/
├── api/
│   └── index.py            # Serverless ASGI entrypoint for Vercel
├── backend/
│   ├── app/
│   │   ├── config.py       # Configuration and database path resolution
│   │   ├── database.py     # SQLAlchemy engine and session management
│   │   ├── main.py         # FastAPI REST API endpoints
│   │   ├── models/         # SQLAlchemy ORM models (System, Run, Metric, Note)
│   │   └── seed.py         # Initial benchmark dataset
│   └── data/
│       └── evaluation.db   # SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Dashboard views, charts, and modal components
│   │   ├── main.tsx
│   │   └── index.css       # Styling and typography definitions
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── requirements.txt        # Backend dependencies
├── vercel.json             # Vercel deployment configuration
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+

### Local Setup

#### 1. Backend Service

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload
```

The FastAPI Swagger documentation will be accessible at `http://localhost:8005/docs`.

#### 2. Frontend Application

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

---

## Deployment

The repository includes root-level `vercel.json` and `api/index.py` configurations for deployment to Vercel:

1. Import the repository in the Vercel Dashboard (`Arjun-333/Project_Comparison`).
2. Keep the root directory as `./`.
3. Vercel will automatically build the static frontend to `frontend/dist` and route `/api/*` requests to the Python serverless function.

---

## License

This project is licensed under the MIT License.
