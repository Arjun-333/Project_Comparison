from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, desc
import csv
import io
import re

from app.config import settings
from app.database import init_db, SessionLocal, get_db
from app.models import System, MetricDefinition, EvaluationRun, MetricValue, TestCase, Report, Note
from app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- PYDANTIC SCHEMAS ----------------- #
class RunCreateRequest(BaseModel):
    system_id: int
    run_id: str
    model_name: Optional[str] = None
    dataset_name: Optional[str] = None
    methodology: Optional[str] = None
    test_case_count: Optional[int] = None
    notes: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None
    metrics: dict[str, float]  # metric_id -> value

class ReportCreateRequest(BaseModel):
    title: str
    executive_summary: Optional[str] = None
    selected_systems: list[int]
    selected_runs: Optional[list[int]] = None
    selected_metrics: Optional[list[int]] = None
    methodology_notes: Optional[str] = None
    limitations: Optional[str] = None
    conclusions: Optional[str] = None
    findings: Optional[str] = None
    status: str = "draft"

class NoteCreateRequest(BaseModel):
    title: str
    content: str
    category: str = "Key Finding"
    system: str = "All Systems"
    author: Optional[str] = "Legal Researcher"
    tags: Optional[list[str]] = None

class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    system: Optional[str] = None
    author: Optional[str] = None
    tags: Optional[list[str]] = None

class RunNoteUpdateRequest(BaseModel):
    notes: str

# ----------------- API ENDPOINTS ----------------- #

@app.get("/api/health")
def health():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION}

@app.get("/api/overview")
def get_overview(db: Session = Depends(get_db)):
    systems = db.execute(select(System).order_by(System.id)).scalars().all()
    
    systems_summary = []
    for s in systems:
        runs = db.execute(
            select(EvaluationRun)
            .where(EvaluationRun.system_id == s.id)
            .order_by(EvaluationRun.evaluation_date.desc(), EvaluationRun.id.desc())
        ).scalars().all()
        
        latest_run = runs[0] if runs else None
        latest_metrics = []
        if latest_run:
            mvs = db.execute(
                select(MetricValue)
                .options(joinedload(MetricValue.metric_definition))
                .where(MetricValue.run_id == latest_run.id)
            ).scalars().all()
            for mv in mvs:
                latest_metrics.append({
                    "id": mv.metric_definition.metric_id,
                    "name": mv.metric_definition.name,
                    "category": mv.metric_definition.category,
                    "value": mv.value,
                    "unit": mv.metric_definition.unit,
                    "direction": mv.metric_definition.direction
                })
        
        systems_summary.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "color": s.color,
            "config": s.config,
            "total_runs": len(runs),
            "latest_run": {
                "id": latest_run.id,
                "run_id": latest_run.run_id,
                "model_name": latest_run.model_name,
                "date": latest_run.evaluation_date.isoformat(),
                "status": latest_run.status,
                "notes": latest_run.notes
            } if latest_run else None,
            "metrics_count": len(latest_metrics),
            "preview_metrics": latest_metrics[:6]
        })

    key_metrics_ids = [
        ("recall_at_10", "Recall@10", "Higher is better. Measures top-10 retrieval coverage."),
        ("mrr", "Mean Reciprocal Rank (MRR)", "Higher is better. Evaluates reciprocal rank of 1st relevant document."),
        ("ndcg_at_10", "nDCG@10", "Higher is better. Measures ranking quality discounted by position."),
        ("meteor", "METEOR Score", "Higher is better. Translation & generation quality accounting for synonyms."),
        ("bertscore_f1", "BERTScore F1", "Higher is better. Contextual semantic embedding alignment."),
        ("rouge_l_f1", "ROUGE-L F1", "Higher is better. Longest common subsequence token fluency."),
        ("faithfulness_judge", "Faithfulness (Judge)", "Higher is better. LLM-as-a-judge factual alignment."),
        ("citation_accuracy", "Citation Accuracy (%)", "Higher is better. Verified valid case citations.")
    ]

    kpi_cards = []
    for m_code, m_title, m_desc in key_metrics_ids:
        m_def = db.execute(select(MetricDefinition).where(MetricDefinition.metric_id == m_code)).scalar_one_or_none()
        if not m_def:
            continue
        
        sys_vals = {}
        for s in systems:
            values = db.execute(
                select(MetricValue.value)
                .join(EvaluationRun)
                .where(EvaluationRun.system_id == s.id, MetricValue.metric_id == m_def.id)
            ).scalars().all()
            if values:
                norm_vals = []
                for v in values:
                    nv = v
                    if s.name in ["AILQA", "LexRAG"] and m_code in [
                        "recall_at_10", "recall_at_5", "precision_at_5", "meteor", "rouge_l_f1", "rouge_1_f1", "rouge_2_f1", 
                        "bleu_4", "bleu_score", "bertscore_f1", "faithfulness_judge", "reg_alignment", 
                        "terminology_precision", "bias_score", "factual_deviation", "gt_coverage", "precedent_match"
                    ]:
                        nv = v / 100.0
                    elif v is not None and v > 1.0 and m_def.unit in ["0-1", "score"] and m_def.direction in ["higher", "lower"]:
                        nv = v / 100.0
                    norm_vals.append((nv, v))
                best_norm, best_raw = max(norm_vals, key=lambda x: x[0]) if m_def.direction == "higher" else min(norm_vals, key=lambda x: x[0])
                sys_vals[s.name] = {
                    "raw": best_raw,
                    "normalized": round(best_norm, 4),
                    "system_color": s.color
                }
            else:
                sys_vals[s.name] = None
        
        comp_candidates = [(sys_name, data["normalized"], data["raw"]) for sys_name, data in sys_vals.items() if data is not None]
        leader = None
        leader_val = None
        if comp_candidates:
            winner = max(comp_candidates, key=lambda x: x[1]) if m_def.direction == "higher" else min(comp_candidates, key=lambda x: x[1])
            leader = winner[0]
            leader_val = winner[2]
        
        kpi_cards.append({
            "metric_id": m_code,
            "metric_name": m_title,
            "category": m_def.category,
            "unit": m_def.unit,
            "direction": m_def.direction,
            "description": m_desc,
            "leader": leader,
            "leader_val": leader_val,
            "system_values": sys_vals
        })

    radar_metrics = [
        {"id": "recall_at_10", "label": "Recall@10"},
        {"id": "mrr", "label": "MRR"},
        {"id": "ndcg_at_10", "label": "nDCG@10"},
        {"id": "meteor", "label": "METEOR"},
        {"id": "rouge_l_f1", "label": "ROUGE-L"},
        {"id": "bertscore_f1", "label": "BERTScore"}
    ]
    radar_data = []
    for rm in radar_metrics:
        row = {"metric": rm["label"]}
        for card in kpi_cards:
            if card["metric_id"] == rm["id"]:
                for s_name, s_data in card["system_values"].items():
                    if s_data:
                        row[s_name] = round(s_data["normalized"] * 100, 1)
                    else:
                        row[s_name] = 0
        radar_data.append(row)

    return {
        "systems": systems_summary,
        "kpi_cards": kpi_cards,
        "radar_data": radar_data,
        "total_systems": len(systems),
        "total_runs": db.execute(select(func.count(EvaluationRun.id))).scalar(),
        "total_metrics": db.execute(select(func.count(MetricDefinition.id))).scalar()
    }

@app.get("/api/systems")
def list_systems(db: Session = Depends(get_db)):
    systems = db.execute(select(System).order_by(System.id)).scalars().all()
    res = []
    for s in systems:
        runs_count = db.execute(select(func.count(EvaluationRun.id)).where(EvaluationRun.system_id == s.id)).scalar()
        res.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "color": s.color,
            "config": s.config,
            "total_runs": runs_count
        })
    return res

@app.get("/api/systems/{system_id}")
def get_system_detail(system_id: int, db: Session = Depends(get_db)):
    system = db.get(System, system_id)
    if not system:
        raise HTTPException(404, "System not found")
    
    runs = db.execute(
        select(EvaluationRun)
        .where(EvaluationRun.system_id == system_id)
        .order_by(EvaluationRun.evaluation_date.desc(), EvaluationRun.id.desc())
    ).scalars().all()

    runs_data = []
    for r in runs:
        mvs = db.execute(
            select(MetricValue)
            .options(joinedload(MetricValue.metric_definition))
            .where(MetricValue.run_id == r.id)
        ).scalars().all()
        
        metric_dict = {}
        for mv in mvs:
            metric_dict[mv.metric_definition.metric_id] = {
                "name": mv.metric_definition.name,
                "category": mv.metric_definition.category,
                "value": mv.value,
                "unit": mv.metric_definition.unit,
                "direction": mv.metric_definition.direction,
                "description": mv.metric_definition.description,
                "notes": mv.notes
            }

        runs_data.append({
            "id": r.id,
            "run_id": r.run_id,
            "model_name": r.model_name,
            "dataset_name": r.dataset_name,
            "methodology": r.methodology,
            "test_case_count": r.test_case_count,
            "status": r.status,
            "notes": r.notes,
            "metadata_json": r.metadata_json,
            "date": r.evaluation_date.isoformat(),
            "metric_count": len(metric_dict),
            "metrics": metric_dict
        })

    return {
        "system": {
            "id": system.id,
            "name": system.name,
            "description": system.description,
            "color": system.color,
            "config": system.config
        },
        "runs": runs_data
    }

@app.get("/api/runs")
def list_runs(
    system_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = select(EvaluationRun).options(joinedload(EvaluationRun.system)).order_by(EvaluationRun.id.desc())
    if system_id:
        query = query.where(EvaluationRun.system_id == system_id)
    runs = db.execute(query).scalars().all()

    res = []
    for r in runs:
        mvs = db.execute(
            select(MetricValue)
            .options(joinedload(MetricValue.metric_definition))
            .where(MetricValue.run_id == r.id)
        ).scalars().all()
        
        metrics_map = {mv.metric_definition.metric_id: mv.value for mv in mvs}

        res.append({
            "id": r.id,
            "run_id": r.run_id,
            "system_id": r.system_id,
            "system_name": r.system.name if r.system else None,
            "system_color": r.system.color if r.system else "#6B7280",
            "model_name": r.model_name,
            "dataset_name": r.dataset_name,
            "methodology": r.methodology,
            "test_case_count": r.test_case_count,
            "status": r.status,
            "notes": r.notes,
            "metadata_json": r.metadata_json,
            "date": r.evaluation_date.isoformat(),
            "metric_count": len(metrics_map),
            "metrics": metrics_map
        })
    return res

@app.get("/api/runs/{run_id}")
def get_run_detail(run_id: int, db: Session = Depends(get_db)):
    run = db.execute(
        select(EvaluationRun)
        .options(joinedload(EvaluationRun.system))
        .where(EvaluationRun.id == run_id)
    ).scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Evaluation run not found")

    mvs = db.execute(
        select(MetricValue)
        .options(joinedload(MetricValue.metric_definition))
        .where(MetricValue.run_id == run.id)
    ).scalars().all()

    metrics_list = []
    for mv in mvs:
        metrics_list.append({
            "id": mv.id,
            "metric_id": mv.metric_definition.metric_id,
            "name": mv.metric_definition.name,
            "category": mv.metric_definition.category,
            "value": mv.value,
            "unit": mv.metric_definition.unit,
            "direction": mv.metric_definition.direction,
            "description": mv.metric_definition.description,
            "calculation": mv.metric_definition.calculation,
            "interpretation": mv.metric_definition.interpretation,
            "notes": mv.notes
        })

    return {
        "id": run.id,
        "run_id": run.run_id,
        "system": {
            "id": run.system.id,
            "name": run.system.name,
            "color": run.system.color
        },
        "model_name": run.model_name,
        "dataset_name": run.dataset_name,
        "methodology": run.methodology,
        "test_case_count": run.test_case_count,
        "status": run.status,
        "notes": run.notes,
        "metadata_json": run.metadata_json,
        "date": run.evaluation_date.isoformat(),
        "metrics": metrics_list
    }

@app.post("/api/runs")
def create_run(data: RunCreateRequest, db: Session = Depends(get_db)):
    system = db.get(System, data.system_id)
    if not system:
        raise HTTPException(400, "Invalid system_id")
    
    existing = db.execute(select(EvaluationRun).where(EvaluationRun.run_id == data.run_id)).scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Run ID '{data.run_id}' already exists")
    
    new_run = EvaluationRun(
        run_id=data.run_id,
        system_id=data.system_id,
        evaluation_date=datetime.now(timezone.utc),
        model_name=data.model_name,
        dataset_name=data.dataset_name,
        methodology=data.methodology,
        test_case_count=data.test_case_count,
        status="completed",
        notes=data.notes,
        metadata_json=data.metadata_json or {}
    )
    db.add(new_run)
    db.flush()

    for m_id, val in data.metrics.items():
        m_def = db.execute(select(MetricDefinition).where(MetricDefinition.metric_id == m_id)).scalar_one_or_none()
        if m_def:
            db.add(MetricValue(run_id=new_run.id, metric_id=m_def.id, value=val))
    
    db.commit()
    return {"status": "success", "run_id": new_run.id, "run_code": new_run.run_id}

def map_metric_key(key: str, metric_defs_dict: dict[str, MetricDefinition]) -> Optional[MetricDefinition]:
    """Fuzzy-matches a CSV column or row header to a registered MetricDefinition."""
    clean = re.sub(r'[^a-z0-9]', '', key.lower())
    if key in metric_defs_dict:
        return metric_defs_dict[key]
    for m_id, m_def in metric_defs_dict.items():
        if clean == re.sub(r'[^a-z0-9]', '', m_id.lower()) or clean == re.sub(r'[^a-z0-9]', '', m_def.name.lower()):
            return m_def
    aliases = {
        "recall10": "recall_at_10",
        "recallat10": "recall_at_10",
        "top10recall": "recall_at_10",
        "mrr": "mrr",
        "mrr10": "mrr",
        "ndcg": "ndcg_at_10",
        "ndcg10": "ndcg_at_10",
        "ndcgat10": "ndcg_at_10",
        "rougel": "rouge_l_f1",
        "rougelf1": "rouge_l_f1",
        "bertscore": "bertscore_f1",
        "bertscoref1": "bertscore_f1",
        "bertf1": "bertscore_f1",
        "bleu": "bleu_4",
        "bleu4": "bleu_4",
        "latency": "ret_latency",
        "retrievallatency": "ret_latency",
        "faithfulness": "faithfulness",
        "hallucination": "hallucination_rate",
        "charf1": "char_f1",
        "meteor": "meteor",
        "semanticmpnet": "semantic_mpnet",
    }
    if clean in aliases and aliases[clean] in metric_defs_dict:
        return metric_defs_dict[aliases[clean]]
    return None

@app.post("/api/runs/upload-csv")
async def upload_run_csv(
    file: UploadFile = File(...),
    system_id: Optional[int] = Form(None),
    run_id: Optional[str] = Form(None),
    model_name: Optional[str] = Form(None),
    methodology: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")

    all_defs = {m.metric_id: m for m in db.execute(select(MetricDefinition)).scalars().all()}
    all_systems = {s.name.lower(): s.id for s in db.execute(select(System)).scalars().all()}

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        raise HTTPException(400, "Uploaded CSV file is empty")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(400, "Could not parse CSV content")

    detected_metrics: dict[str, float] = {}
    detected_system_id = system_id or 1
    detected_run_id = run_id
    detected_model = model_name
    detected_methodology = methodology or "Enhanced"

    # Check wide table format
    header = [c.strip() for c in rows[0]]
    if len(header) >= 3 and len(rows) >= 2:
        for col_idx, col_name in enumerate(header):
            col_clean = re.sub(r'[^a-z0-9]', '', col_name.lower())
            if col_clean in ["runid", "runcode", "run"]:
                if not detected_run_id and len(rows) > 1 and len(rows[1]) > col_idx:
                    detected_run_id = rows[1][col_idx].strip()
            elif col_clean in ["system", "systemname"]:
                if len(rows) > 1 and len(rows[1]) > col_idx:
                    sys_str = rows[1][col_idx].strip().lower()
                    if sys_str in all_systems:
                        detected_system_id = all_systems[sys_str]
            elif col_clean in ["model", "modelname", "embeddingmodel"]:
                if not detected_model and len(rows) > 1 and len(rows[1]) > col_idx:
                    detected_model = rows[1][col_idx].strip()
            elif col_clean in ["methodology", "mode", "retrievalmode"]:
                if len(rows) > 1 and len(rows[1]) > col_idx:
                    detected_methodology = rows[1][col_idx].strip()
            else:
                m_def = map_metric_key(col_name, all_defs)
                if m_def and len(rows) > 1 and len(rows[1]) > col_idx:
                    try:
                        raw_v = rows[1][col_idx].strip().replace('%', '')
                        detected_metrics[m_def.metric_id] = float(raw_v)
                    except ValueError:
                        pass

    # Fallback to key-value format (metric, value)
    if not detected_metrics:
        for row in rows:
            if len(row) >= 2:
                k, v = row[0].strip(), row[1].strip()
                k_clean = re.sub(r'[^a-z0-9]', '', k.lower())
                if k_clean in ["runid", "runcode", "run"]:
                    if not detected_run_id:
                        detected_run_id = v
                    continue
                if k_clean in ["system", "systemname"]:
                    if v.lower() in all_systems:
                        detected_system_id = all_systems[v.lower()]
                    continue
                if k_clean in ["model", "modelname", "embeddingmodel"]:
                    if not detected_model:
                        detected_model = v
                    continue
                if k_clean in ["methodology", "mode", "retrievalmode"]:
                    detected_methodology = v
                    continue

                m_def = map_metric_key(k, all_defs)
                if m_def:
                    try:
                        raw_v = v.replace('%', '')
                        detected_metrics[m_def.metric_id] = float(raw_v)
                    except ValueError:
                        pass

    if not detected_metrics:
        raise HTTPException(400, "No recognizable evaluation metrics could be parsed from the CSV. Please ensure column names match metric definitions (e.g. recall_at_10, mrr, meteor, bertscore_f1).")

    if not detected_run_id:
        detected_run_id = f"RUN-CSV-{datetime.now().strftime('%m%d-%H%M%S')}"

    existing = db.execute(select(EvaluationRun).where(EvaluationRun.run_id == detected_run_id)).scalar_one_or_none()
    if existing:
        detected_run_id = f"{detected_run_id}-{datetime.now().strftime('%S')}"

    new_run = EvaluationRun(
        run_id=detected_run_id,
        system_id=detected_system_id,
        evaluation_date=datetime.now(timezone.utc),
        model_name=detected_model or "Imported Model Pipeline",
        dataset_name="Imported CSV Evaluation Benchmark",
        methodology=detected_methodology,
        test_case_count=None,
        status="completed",
        notes=notes or f"Imported from CSV file: {file.filename}",
        metadata_json={"filename": file.filename, "imported_at": datetime.now(timezone.utc).isoformat()}
    )
    db.add(new_run)
    db.flush()

    for m_id, val in detected_metrics.items():
        if m_id in all_defs:
            db.add(MetricValue(run_id=new_run.id, metric_id=all_defs[m_id].id, value=val))

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully imported evaluation run '{detected_run_id}' with {len(detected_metrics)} metrics",
        "run_id": new_run.id,
        "run_code": new_run.run_id,
        "system_id": detected_system_id,
        "model_name": new_run.model_name,
        "metrics_count": len(detected_metrics),
        "metrics": detected_metrics
    }

@app.delete("/api/runs/{run_id}")
def delete_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(EvaluationRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    db.delete(run)
    db.commit()
    return {"status": "deleted"}

@app.get("/api/metrics")
def list_metrics(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = select(MetricDefinition).order_by(MetricDefinition.category, MetricDefinition.name)
    if category:
        query = query.where(MetricDefinition.category == category)
    defs = db.execute(query).scalars().all()
    return [{
        "id": d.id,
        "metric_id": d.metric_id,
        "name": d.name,
        "category": d.category,
        "unit": d.unit,
        "direction": d.direction,
        "description": d.description,
        "calculation": d.calculation,
        "interpretation": d.interpretation,
        "is_comparable": d.is_comparable
    } for d in defs]

@app.get("/api/insights")
def get_insights(db: Session = Depends(get_db)):
    """
    Dynamically computes architectural trade-offs, performance frontiers, and leaders
    directly from current database rows.
    """
    runs = db.execute(select(EvaluationRun).options(joinedload(EvaluationRun.system))).scalars().all()
    
    mvs = db.execute(
        select(MetricValue, MetricDefinition.metric_id)
        .join(MetricDefinition, MetricValue.metric_id == MetricDefinition.id)
    ).all()
    
    run_metrics: dict[int, dict[str, float]] = {}
    for mv, m_code in mvs:
        if mv.run_id not in run_metrics:
            run_metrics[mv.run_id] = {}
        run_metrics[mv.run_id][m_code] = mv.value

    insights = []

    # 1. DYNAMIC RETRIEVAL LEADER
    recalls = []
    for r in runs:
        m_map = run_metrics.get(r.id, {})
        if "recall_at_10" in m_map:
            val = m_map["recall_at_10"]
            norm_val = val / 100.0 if val > 1 else val
            recalls.append((r.system.name, r.run_id, r.model_name, norm_val, val, r.system.color))
    
    if recalls:
        recalls.sort(key=lambda x: x[3], reverse=True)
        winner = recalls[0]
        runner_up = recalls[1] if len(recalls) > 1 else None
        
        runner_text = f" surpassing {runner_up[0]} ({runner_up[4]:.2f}{'%' if runner_up[4] > 1 else ''})" if runner_up else ""
        content = (
            f"{winner[0]} achieves peak Recall@10 at {winner[4]:.2f}{'%' if winner[4] > 1 else ''} "
            f"({winner[2] or winner[1]}){runner_text}."
        )
        insights.append({
            "category": "Retrieval Performance",
            "type": "leader",
            "system": winner[0],
            "color": winner[5],
            "title": f"{winner[0]} Leads Top-10 Retrieval Recall",
            "content": content,
            "metrics": ["recall_at_10", "mrr", "ndcg_at_10"]
        })

    # 2. DYNAMIC RANKING LEADER (MRR & nDCG)
    mrrs = []
    for r in runs:
        m_map = run_metrics.get(r.id, {})
        if "mrr" in m_map and "ndcg_at_10" in m_map:
            mrrs.append((r.system.name, r.run_id, r.model_name, m_map["mrr"], m_map["ndcg_at_10"]))
    
    if mrrs:
        mrrs.sort(key=lambda x: x[3], reverse=True)
        top_rank = mrrs[0]
        sys_color = "#4B5563" if top_rank[0] == "LexRAG" else ("#FFC700" if top_rank[0] == "AILQA" else "#334155")
        insights.append({
            "category": "Retrieval Ranking",
            "type": "leader",
            "system": top_rank[0],
            "color": sys_color,
            "title": f"{top_rank[0]} Delivers Superior Precedent Ranking",
            "content": (
                f"{top_rank[0]} leads ranking quality with MRR of {top_rank[3]:.4f} and nDCG@10 of {top_rank[4]:.4f}, "
                f"ensuring binding precedents appear at higher rank cutoffs."
            ),
            "metrics": ["mrr", "ndcg_at_10"]
        })

    # 3. DYNAMIC SEMANTIC FIDELITY LEADER (BERTScore F1)
    berts = []
    for r in runs:
        m_map = run_metrics.get(r.id, {})
        if "bertscore_f1" in m_map:
            val = m_map["bertscore_f1"]
            norm_val = val / 100.0 if val > 1 else val
            berts.append((r.system.name, r.model_name, norm_val, val))
    
    if berts:
        berts.sort(key=lambda x: x[2], reverse=True)
        best_bert = berts[0]
        lowest_bert = berts[-1] if len(berts) > 1 else None
        
        diff_text = f", outperforming {lowest_bert[0]} ({lowest_bert[2]:.4f})" if lowest_bert and lowest_bert[0] != best_bert[0] else ""
        sys_color = "#334155" if best_bert[0] == "LexVed" else "#4B5563"
        insights.append({
            "category": "Semantic Alignment",
            "type": "leader",
            "system": best_bert[0],
            "color": sys_color,
            "title": f"{best_bert[0]} Leads BERTScore F1 Semantic Fidelity",
            "content": (
                f"{best_bert[0]} maintains highest token-level contextual semantic fidelity at {best_bert[2]:.4f} F1 "
                f"using {best_bert[1]}{diff_text}."
            ),
            "metrics": ["bertscore_f1"]
        })

    # 3b. DYNAMIC GENERATION FLUENCY & METEOR LEADER
    meteors = []
    for r in runs:
        m_map = run_metrics.get(r.id, {})
        if "meteor" in m_map:
            val = m_map["meteor"]
            norm_val = val / 100.0 if val > 1 else val
            meteors.append((r.system.name, r.model_name or r.run_id, norm_val, val))
    if meteors:
        meteors.sort(key=lambda x: x[2], reverse=True)
        top_meteor = meteors[0]
        runner_up = meteors[1] if len(meteors) > 1 else None
        runner_text = f", surpassing {runner_up[0]} ({runner_up[2]:.4f})" if runner_up and runner_up[0] != top_meteor[0] else ""
        sys_color = "#FFC700" if top_meteor[0] == "AILQA" else ("#4B5563" if top_meteor[0] == "LexRAG" else "#334155")
        insights.append({
            "category": "Generation Fluency & Synonymy",
            "type": "leader",
            "system": top_meteor[0],
            "color": sys_color,
            "title": f"{top_meteor[0]} Leads METEOR Synonym-Aware Fluency",
            "content": f"{top_meteor[0]} achieves peak legal synonymy and translation fluency at {top_meteor[2]:.4f} ({top_meteor[3]:.2f}{'%' if top_meteor[3]>1 else ''}) using {top_meteor[1]}{runner_text}.",
            "metrics": ["meteor", "rouge_l_f1", "bleu_4"]
        })

    # 3c. DYNAMIC FACTUAL GROUNDING & FAITHFULNESS LEADER
    faiths = []
    for r in runs:
        m_map = run_metrics.get(r.id, {})
        if "faithfulness_judge" in m_map:
            val = m_map["faithfulness_judge"]
            norm_val = val / 100.0 if val > 1 else val
            fcd = m_map.get("factual_deviation", 0.0)
            faiths.append((r.system.name, r.model_name or r.run_id, norm_val, val, fcd))
    if faiths:
        faiths.sort(key=lambda x: x[2], reverse=True)
        top_faith = faiths[0]
        sys_color = "#FFC700" if top_faith[0] == "AILQA" else "#334155"
        insights.append({
            "category": "Factual Grounding & Hallucination Defense",
            "type": "leader",
            "system": top_faith[0],
            "color": sys_color,
            "title": f"{top_faith[0]} Dominates Legal Factual Grounding ({top_faith[3]:.2f}% Faithfulness)",
            "content": f"{top_faith[0]} demonstrates peak fidelity with {top_faith[3]:.2f}% LLM-as-a-judge faithfulness and minimal {top_faith[4]:.2f}% factual consistency deviation.",
            "metrics": ["faithfulness_judge", "factual_deviation", "gt_coverage"]
        })

    # 4. DYNAMIC RETRIEVAL MODE TRADE-OFF (Primitive vs Enhanced)
    lexved_runs = [r for r in runs if r.system.name == "LexVed"]
    prim_map = {}
    enh_map = {}
    for r in lexved_runs:
        meta = r.metadata_json or {}
        model_name = meta.get("embedding_model") or r.model_name
        mode = meta.get("retrieval_mode")
        if not mode:
            if "PRIM" in r.run_id: mode = "Primitive"
            elif "ENH" in r.run_id: mode = "Enhanced"
        
        if mode == "Primitive":
            prim_map[model_name] = run_metrics.get(r.id, {})
        elif mode == "Enhanced":
            enh_map[model_name] = run_metrics.get(r.id, {})

    shared_models = set(prim_map.keys()).intersection(set(enh_map.keys()))
    if shared_models:
        recall_gains = []
        ndcg_gains = []
        lat_costs = []
        for m in shared_models:
            p = prim_map[m]
            e = enh_map[m]
            if "recall_at_10" in p and "recall_at_10" in e:
                recall_gains.append(e["recall_at_10"] - p["recall_at_10"])
            if "ndcg_at_10" in p and "ndcg_at_10" in e:
                ndcg_gains.append(e["ndcg_at_10"] - p["ndcg_at_10"])
            if "ret_latency" in p and "ret_latency" in e:
                lat_costs.append(e["ret_latency"] - p["ret_latency"])
        
        avg_rec_gain = (sum(recall_gains) / len(recall_gains)) * 100 if recall_gains else 0
        avg_ndcg_gain = (sum(ndcg_gains) / len(ndcg_gains)) * 100 if ndcg_gains else 0
        avg_lat_cost = (sum(lat_costs) / len(lat_costs)) if lat_costs else 0

        insights.append({
            "category": "Architectural Strategy",
            "type": "comparison",
            "system": "LexVed",
            "color": "#334155",
            "title": "Enhanced Retrieval Strategy Consistently Outperforms Baseline",
            "content": (
                f"Across {len(shared_models)} evaluated embedding backends, Enhanced retrieval delivers an average gain of "
                f"+{avg_rec_gain:.1f}% in Recall@10 and +{avg_ndcg_gain:.1f}% in nDCG@10, at a moderate retrieval latency cost of +{avg_lat_cost:.2f}s."
            ),
            "metrics": ["ndcg_at_10", "recall_at_10", "ret_latency"]
        })

    # 5. DYNAMIC EMBEDDING FRONTIER TRADE-OFF (Latency vs Recall)
    emb_stats = []
    for r in lexved_runs:
        m_map = run_metrics.get(r.id, {})
        if "emb_latency" in m_map and "recall_at_10" in m_map:
            emb_stats.append({
                "model": r.model_name,
                "latency": m_map["emb_latency"],
                "recall": m_map["recall_at_10"]
            })
    
    if emb_stats:
        unique_emb: dict[str, dict] = {}
        for item in emb_stats:
            m_name = item["model"]
            if m_name not in unique_emb or item["recall"] > unique_emb[m_name]["recall"]:
                unique_emb[m_name] = item
        
        models_list = list(unique_emb.values())
        if len(models_list) >= 2:
            fastest = min(models_list, key=lambda x: x["latency"])
            highest_recall = max(models_list, key=lambda x: x["recall"])
            
            speedup = highest_recall["latency"] / fastest["latency"] if fastest["latency"] > 0 else 1.0
            recall_diff = (highest_recall["recall"] - fastest["recall"]) * 100
            
            insights.append({
                "category": "Efficiency vs Accuracy Trade-off",
                "type": "tradeoff",
                "system": "LexVed",
                "color": "#334155",
                "title": "Dynamic Cost-Quality Frontier in Embedding Architectures",
                "content": (
                    f"{fastest['model']} yields the fastest index computation ({fastest['latency']:.1f}s, {speedup:.1f}x speedup), "
                    f"trading off {recall_diff:.1f}% in top-10 retrieval recall against {highest_recall['model']} ({highest_recall['latency']:.1f}s, {highest_recall['recall']*100:.1f}% recall)."
                ),
                "metrics": ["emb_latency", "recall_at_10", "ret_latency"]
            })

    # 6. DYNAMIC CITATION INTEGRITY & FACTUAL DEVIATION
    fact_stats = []
    for r in runs:
        m_map = run_metrics.get(r.id, {})
        if "citation_accuracy" in m_map or "factual_deviation" in m_map:
            fact_stats.append({
                "system": r.system.name,
                "citation": m_map.get("citation_accuracy"),
                "fcd": m_map.get("factual_deviation")
            })
    
    if fact_stats:
        valid_citations = [f for f in fact_stats if f["citation"] is not None]
        if valid_citations:
            best_cite = max(valid_citations, key=lambda x: x["citation"])
            lowest_fcd = min([f for f in fact_stats if f["fcd"] is not None], key=lambda x: x["fcd"], default=None)
            
            fcd_text = f" with lowest factual deviation of {lowest_fcd['fcd']:.4f}" if lowest_fcd else ""
            sys_col = "#334155" if best_cite["system"] == "LexVed" else ("#4B5563" if best_cite["system"] == "LexRAG" else "#FFC700")
            insights.append({
                "category": "Legal Citation & Safety",
                "type": "leader",
                "system": best_cite["system"],
                "color": sys_col,
                "title": "High Citation Accuracy & Low Factual Deviation",
                "content": (
                    f"{best_cite['system']} records peak Citation Accuracy of {best_cite['citation']:.1f}%{fcd_text}, "
                    f"mitigating hallucination risks in statutory citations."
                ),
                "metrics": ["citation_accuracy", "factual_deviation", "faithfulness_judge"]
            })

    # 7. GENERATION FLUENCY (LexRAG / Generation Suite)
    lexrag_runs = [r for r in runs if r.system.name == "LexRAG"]
    if lexrag_runs:
        lr_m = run_metrics.get(lexrag_runs[0].id, {})
        meteor_val = lr_m.get("meteor")
        kw_acc = lr_m.get("keyword_accuracy")
        char_rec = lr_m.get("char_recall")
        
        details = []
        if meteor_val: details.append(f"METEOR score of {meteor_val:.4f}")
        if kw_acc: details.append(f"Keyword Accuracy of {kw_acc*100:.1f}%")
        if char_rec: details.append(f"Character Recall of {char_rec*100:.1f}%")
        
        insights.append({
            "category": "Generation Fluency",
            "type": "comparison",
            "system": "LexRAG",
            "color": "#4B5563",
            "title": "LexRAG Strong in Surface Precision & Statutory Vocabulary",
            "content": f"LexRAG exhibits {', '.join(details)}, excelling at explicit statutory nomenclature.",
            "metrics": ["keyword_accuracy", "meteor", "char_recall"]
        })

    return insights

@app.get("/api/reports")
def list_reports(db: Session = Depends(get_db)):
    reports = db.execute(select(Report).order_by(Report.id.desc())).scalars().all()
    return reports

@app.post("/api/reports")
def save_report(data: ReportCreateRequest, db: Session = Depends(get_db)):
    rep = Report(
        title=data.title,
        executive_summary=data.executive_summary,
        selected_systems=data.selected_systems,
        selected_runs=data.selected_runs or [],
        selected_metrics=data.selected_metrics or [],
        methodology_notes=data.methodology_notes,
        limitations=data.limitations,
        conclusions=data.conclusions,
        findings=data.findings,
        status=data.status
    )
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep

# ----------------- CUSTOM NOTES & FINDINGS API ----------------- #

@app.get("/api/notes")
def list_notes(category: Optional[str] = None, system: Optional[str] = None, db: Session = Depends(get_db)):
    query = select(Note).order_by(Note.id.desc())
    if category and category != "All":
        query = query.where(Note.category == category)
    if system and system != "All" and system != "All Systems":
        query = query.where(Note.system == system)
    notes = db.execute(query).scalars().all()
    return notes

@app.post("/api/notes")
def create_note(data: NoteCreateRequest, db: Session = Depends(get_db)):
    note = Note(
        title=data.title,
        content=data.content,
        category=data.category,
        system=data.system,
        author=data.author or "Legal Researcher",
        tags=data.tags or []
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@app.put("/api/notes/{note_id}")
def update_note(note_id: int, data: NoteUpdateRequest, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if data.title is not None:
        note.title = data.title
    if data.content is not None:
        note.content = data.content
    if data.category is not None:
        note.category = data.category
    if data.system is not None:
        note.system = data.system
    if data.author is not None:
        note.author = data.author
    if data.tags is not None:
        note.tags = data.tags
    note.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(note)
    return note

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"success": True, "id": note_id}

@app.patch("/api/runs/{run_id}/notes")
def update_run_notes(run_id: str, data: RunNoteUpdateRequest, db: Session = Depends(get_db)):
    run = db.execute(select(EvaluationRun).where(EvaluationRun.run_id == run_id)).scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    run.notes = data.notes
    db.commit()
    db.refresh(run)
    return {"success": True, "run_id": run.run_id, "notes": run.notes}
