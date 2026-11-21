# LegalEval Analytics Platform — Comparative LLM Evaluation

A specialized, modern research analytics dashboard for empirical comparative evaluation of three legal AI systems:
- 🔵 **LexVed** (Nemotron-3-Ultra-550B, 4 Embedding Models, Primitive vs. Enhanced Retrieval)
- 🟢 **LexRAG** (Official Generation Benchmark Suite, BLEU 1-4, BERTScore P/R/F1, Keyword Accuracy)
- 🟡 **AILQA** (Dense Retrieval Benchmark, Recall@10, MRR, nDCG, QA Synthesis)

---

## 🚀 Live Application URLs

- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Swagger API Docs:** [http://localhost:8005/docs](http://localhost:8005/docs)
- **API Health Check:** [http://localhost:8005/api/health](http://localhost:8005/api/health)

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (`evaluation.db`)
- **Seeded Data:** 10 evaluation runs, 43 registered metric indicators, 276 empirical data points

---

## 📁 Project Structure

```
Project_Comparison/
├── backend/
│   ├── app/
│   │   ├── config.py           # Database URL, settings, CORS
│   │   ├── database.py         # SQLAlchemy engine and session
│   │   ├── main.py             # FastAPI REST endpoints
│   │   ├── seed.py             # Initial empirical benchmark dataset
│   │   ├── models/             # System, EvaluationRun, MetricDefinition, MetricValue
│   │   └── schemas/            # Pydantic validation schemas
│   └── data/
│       └── evaluation.db       # Persistent SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Interactive dashboard, charts, metric modal, run recorder
│   │   ├── main.tsx
│   │   └── index.css           # Dark-mode-first aesthetic styling
│   ├── package.json
│   └── vite.config.ts          # Vite proxy to backend port 8005
└── README.md
```

---

## ⚡ How to Run Manually

### 1. Start Backend:
```bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8005
```

### 2. Start Frontend:
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.
