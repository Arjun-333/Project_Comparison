from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import System, MetricDefinition, EvaluationRun, MetricValue

def seed_database(db: Session):
    # Check if already seeded
    if db.query(System).count() > 0:
        return
    
    # 1. Systems
    systems = {}
    system_data = [
        ("LexVed", "AI-powered legal research platform utilizing RAG with customizable embedding models and enhanced retrieval strategies.", "#334155", {"llm": "nvidia/nemotron-3-ultra-550b-a55b", "architecture": "Modular RAG (Primitive & Enhanced)"}),
        ("LexRAG", "Legal RAG system optimized for generation-focused legal document analysis and precision legal drafting.", "#4B5563", {"architecture": "Generation-Optimized Legal RAG"}),
        ("AILQA", "AI Legal Question Answering benchmark evaluating dense retrieval and structured legal answer synthesis.", "#FFC700", {"architecture": "Dense Retrieval & Legal QA"}),
    ]
    for name, desc, color, config in system_data:
        s = System(name=name, description=desc, color=color, config=config)
        db.add(s)
        db.flush()
        systems[name] = s.id

    # 2. Metric Definitions
    metrics = {}
    defs = [
        # Retrieval
        ("M3", "ret_latency", "Retrieval Latency", "Retrieval", "seconds", "lower", "Time taken to retrieve candidate legal documents from the vector store.", "Wall-clock time in seconds for dense retrieval.", "Lower indicates faster retrieval. Critical for interactive legal search.", True),
        ("M4", "query_context_cos_sim", "Query-Context Cosine Similarity", "Retrieval", "0-1", "higher", "Cosine similarity between query embedding and retrieved document chunks.", "CosSim(Embed(Query), Embed(Context)).", "Higher indicates semantically relevant chunk retrieval.", True),
        ("M4b", "gold_context_alignment", "Gold-Context Alignment", "Retrieval", "0-1", "higher", "Cosine similarity between ground-truth reference context and retrieved chunks.", "CosSim(Embed(GoldContext), Embed(RetrievedContext)).", "Higher values prove the retriever captures the true authoritative precedent.", True),
        ("M5", "recall_at_5", "Recall@5", "Retrieval", "0-1", "higher", "Proportion of relevant legal documents retrieved in the top 5 candidates.", "Relevant in Top 5 / Total Relevant.", "Higher is better. Measures immediate search precision.", True),
        ("M28", "recall_at_10", "Recall@10", "Retrieval", "0-1", "higher", "Proportion of relevant legal documents retrieved in top 10 candidates.", "Relevant in Top 10 / Total Relevant.", "Higher is better. Note: AILQA reports this on a 0-100% scale.", True),
        ("M29", "mrr", "Mean Reciprocal Rank (MRR)", "Retrieval", "0-1", "higher", "Reciprocal rank of the first relevant legal document.", "1 / Rank of first relevant document.", "1.0 means the best citation is always ranked #1.", True),
        ("M30", "ndcg_at_10", "nDCG@10", "Retrieval", "0-1", "higher", "Normalized Discounted Cumulative Gain at rank 10.", "DCG@10 / Ideal DCG@10.", "Standard IR benchmark for ranking quality.", True),
        ("M31", "precision_at_5", "Precision@5", "Retrieval", "0-1", "higher", "Fraction of top 5 retrieved items that are relevant.", "Relevant in top 5 / 5.", "Higher prevents irrelevant legal noise in prompt context.", True),
        ("M9", "context_words", "Context Words", "Retrieval", "count", "neutral", "Average word count of the retrieved context fed into the generator.", "Total words in prompt context.", "Neutral. Balances legal thoroughness against LLM context budget.", True),
        # Generation
        ("M6", "rouge_1_f1", "ROUGE-1 F1", "Generation", "0-1", "higher", "Unigram overlap F1 between generated and gold legal answer.", "Harmonic mean of unigram precision and recall.", "Higher indicates strong lexical overlap with statutory text.", True),
        ("M7", "rouge_2_f1", "ROUGE-2 F1", "Generation", "0-1", "higher", "Bigram overlap F1 measuring phrase-level legal consistency.", "Harmonic mean of bigram precision and recall.", "Higher indicates preserved legal phrasing.", True),
        ("M8", "rouge_l_f1", "ROUGE-L F1", "Generation", "0-1", "higher", "Longest Common Subsequence F1 score.", "LCS precision & recall harmonic mean.", "Measures structural coherence. Note: AILQA reports this as 0-100%.", True),
        ("M10", "bleu_score", "BLEU Score", "Generation", "0-1", "higher", "Geometric mean of n-gram precision with brevity penalty.", "BLEU n-gram precision.", "Classic translation & generation metric.", True),
        ("bleu_1", "bleu_1", "BLEU-1", "Generation", "0-1", "higher", "1-gram precision of generated output.", "Unigram matching precision.", "LexRAG specific breakdown.", True),
        ("bleu_2", "bleu_2", "BLEU-2", "Generation", "0-1", "higher", "2-gram precision of generated output.", "Bigram matching precision.", "LexRAG specific breakdown.", True),
        ("bleu_3", "bleu_3", "BLEU-3", "Generation", "0-1", "higher", "3-gram precision of generated output.", "Trigram matching precision.", "LexRAG specific breakdown.", True),
        ("bleu_4", "bleu_4", "BLEU-4", "Generation", "0-1", "higher", "4-gram precision.", "4-gram matching precision.", "Standard MT generation metric. AILQA reports 0-100%.", True),
        ("M11", "meteor", "METEOR Score", "Generation", "0-1", "higher", "Explicit ordering, stemming, and synonymy-aware translation metric.", "F-mean with alignment penalty.", "Superior to BLEU for legal synonyms. Shared across all 3 systems.", True),
        ("M12", "bertscore_f1", "BERTScore F1", "Generation", "0-1", "higher", "Contextual embedding token similarity F1.", "CosSim of contextual token embeddings.", "Measures deep semantic fidelity rather than simple keyword matching.", True),
        ("bert_p", "bert_precision", "BERTScore Precision", "Generation", "0-1", "higher", "Contextual embedding precision.", "Precision of generated tokens vs gold.", "LexRAG specific metric.", True),
        ("bert_r", "bert_recall", "BERTScore Recall", "Generation", "0-1", "higher", "Contextual embedding recall.", "Recall of gold tokens in generated output.", "LexRAG specific metric.", True),
        ("M15", "gt_coverage", "Ground Truth Coverage (%)", "Generation", "percent", "higher", "Percentage of essential ground truth facts addressed in the answer.", "% of gold fact propositions covered.", "Higher ensures comprehensive legal counsel.", True),
        ("sem_mpnet", "semantic_mpnet", "Semantic Similarity (MPNet)", "Generation", "percent", "higher", "Sentence-Transformers MPNet cosine similarity in %.", "CosSim(MPNet(Gen), MPNet(Gold)) * 100.", "AILQA benchmark for sentence semantics.", True),
        ("kw_acc", "keyword_accuracy", "Keyword Accuracy", "Generation", "0-1", "higher", "Accuracy of identifying and utilizing required statutory legal terms.", "Matched required legal keywords / total required.", "LexRAG specific statutory keyword metric.", True),
        ("char_p", "char_precision", "Char Precision", "Generation", "0-1", "higher", "Character n-gram precision.", "Character match precision.", "LexRAG specific granularity metric.", True),
        ("char_r", "char_recall", "Char Recall", "Generation", "0-1", "higher", "Character n-gram recall.", "Character match recall.", "LexRAG specific granularity metric.", True),
        ("char_f1", "char_f1", "Char F1", "Generation", "0-1", "higher", "Character n-gram F1 harmonic mean.", "Harmonic mean of char precision and recall.", "LexRAG specific granularity metric.", True),
        # Faithfulness & Legal Quality
        ("M13", "factual_deviation", "Factual Deviation (FCD)", "Faithfulness", "0-1", "lower", "Rate of hallucinated or contradictory facts introduced.", "Identified factual inconsistencies / total assertions.", "Lower is better. 0.0 represents zero detected hallucinations.", True),
        ("M14", "faithfulness_judge", "Faithfulness (Judge)", "Faithfulness", "0-1", "higher", "LLM-as-a-Judge alignment score against verified retrieved legal context.", "Nemotron-3-Ultra verified claim fidelity.", "Higher proves the model grounds conclusions in cited facts.", True),
        ("M20", "citation_accuracy", "Citation Accuracy (%)", "Legal", "percent", "higher", "Accuracy of case-law and statute citations (correct volume, reporter, page).", "Verified valid citations / total cited.", "Crucial for legal practice to prevent fictitious citations.", True),
        ("M21", "terminology_precision", "Terminology Precision", "Legal", "0-1", "higher", "Precision in applying specialized legal terminology and doctrine.", "Standardized legal taxonomy alignment.", "Higher prevents layman imprecision in statutory matters.", True),
        ("M22", "precedent_match", "Precedent Match (%)", "Legal", "percent", "higher", "Percentage of binding precedents accurately matched to query issues.", "Authoritative precedents cited / relevant precedents.", "Ensures judicial doctrines are respected.", True),
        ("M23", "reg_alignment", "Regulatory Alignment", "Legal", "0-1", "higher", "Degree of compliance with regulatory and statutory frameworks.", "Regulatory constraint evaluation score.", "Ensures advice conforms to mandatory regulations.", True),
        ("M24", "bias_score", "Bias Score", "Legal", "0-1", "lower", "Measured demographic or jurisdictional bias in legal reasoning.", "Audit score for prejudicial language or skewed rulings.", "Lower is better. Zero indicates neutral objective legal reasoning.", True),
        # Efficiency & Systems
        ("M16", "e2e_latency", "E2E Latency (s)", "Performance", "seconds", "lower", "Total end-to-end response latency in seconds.", "Wall-clock duration from user prompt to complete response stream.", "Lower is better for real-time attorney interaction.", True),
        ("M17", "throughput_qps", "Throughput (QPS)", "Performance", "qps", "higher", "System throughput in queries per second.", "Completed queries / total time.", "Higher capacity allows high-concurrency enterprise use.", True),
        ("M25", "ttft", "Time to First Token (TTFT)", "Performance", "seconds", "lower", "Time until first generated token is streamed back.", "Latency to initial token emission.", "Lower provides immediate feedback to user.", True),
        ("M26", "prefill_latency", "Prefill Latency (s)", "Performance", "seconds", "lower", "Time spent encoding context before token generation begins.", "Prompt ingestion and key-value cache setup time.", "Lower indicates faster context processing.", True),
        ("M27", "tokens_per_sec", "Tokens/sec", "Performance", "tokens/s", "higher", "Token generation generation speed.", "Tokens emitted / generation time.", "Note: Unmeasured in current run (0.0).", True),
        ("M18", "cpu_usage", "CPU Usage (%)", "Resource", "percent", "lower", "Average processor utilization during inference.", "% CPU utilization.", "Resource efficiency metric.", True),
        ("M19", "ram_usage", "RAM Usage (GB)", "Resource", "GB", "lower", "Peak memory consumption during query processing.", "Peak resident set size in GB.", "Lower enables cost-effective deployment.", True),
        ("M1", "emb_latency", "Embedding Latency (s)", "Embedding", "seconds", "lower", "Corpus embedding computation time.", "Total time to embed 19k-22k legal vectors.", "Lower index build time enables rapid case-file ingestion.", True),
        ("M2", "index_size", "Index Size (Vectors)", "Embedding", "count", "neutral", "Total vectors in legal knowledge index.", "Vector count in FAISS index.", "Index scale indicator (e.g. ~19,793 vectors).", True),
    ]

    for code, m_id, name, cat, unit, direction, desc, calc, interp, comp in defs:
        m = MetricDefinition(
            metric_id=m_id,
            name=name,
            category=cat,
            unit=unit,
            direction=direction,
            description=desc,
            calculation=calc,
            interpretation=interp,
            is_comparable=comp
        )
        db.add(m)
        db.flush()
        metrics[m_id] = m.id
        metrics[code] = m.id

    # 3. LexVed Runs (4 models × 2 retrieval modes)
    lexved_id = systems["LexVed"]
    m_map = {
        "M1": "emb_latency", "M2": "index_size", "M3": "ret_latency", "M4": "query_context_cos_sim",
        "M4b": "gold_context_alignment", "M5": "recall_at_5", "M6": "rouge_1_f1", "M7": "rouge_2_f1",
        "M8": "rouge_l_f1", "M9": "context_words", "M10": "bleu_score", "M11": "meteor", "M12": "bertscore_f1",
        "M13": "factual_deviation", "M14": "faithfulness_judge", "M15": "gt_coverage", "M16": "e2e_latency",
        "M17": "throughput_qps", "M18": "cpu_usage", "M19": "ram_usage", "M20": "citation_accuracy",
        "M21": "terminology_precision", "M22": "precedent_match", "M23": "reg_alignment", "M24": "bias_score",
        "M25": "ttft", "M26": "prefill_latency", "M27": "tokens_per_sec", "M28": "recall_at_10",
        "M29": "mrr", "M30": "ndcg_at_10", "M31": "precision_at_5"
    }

    lexved_configs = [
        ("distilbert", "multi-qa-distilbert-cos-v1", "Primitive", {
            "M3": 1.3831, "M4": 0.6581, "M4b": 0.6659, "M5": 0.7000, "M6": 0.4123, "M7": 0.1811, "M8": 0.2756,
            "M9": 894.0, "M10": 0.0720, "M11": 0.3617, "M12": 0.8874, "M13": 0.0500, "M14": 0.9500, "M15": 73.2820,
            "M16": 13.1467, "M17": 0.1836, "M18": 90.4160, "M19": 3.2000, "M20": 91.6667, "M21": 0.9000, "M22": 75.0000,
            "M23": 0.8500, "M24": 0.0500, "M25": 11.7636, "M26": 11.7636, "M27": 0.0, "M28": 0.7000, "M29": 0.4400,
            "M30": 0.5036, "M31": 0.1400, "M1": 55.7602, "M2": 19793.0
        }),
        ("distilbert", "multi-qa-distilbert-cos-v1", "Enhanced", {
            "M3": 1.8441, "M4": 0.6368, "M4b": 0.6775, "M5": 0.7000, "M6": 0.3956, "M7": 0.1788, "M8": 0.3005,
            "M9": 892.0, "M10": 0.0840, "M11": 0.3461, "M12": 0.8835, "M13": 0.0500, "M14": 0.9500, "M15": 75.0198,
            "M16": 8.4375, "M17": 0.1825, "M18": 90.9160, "M19": 3.2200, "M20": 91.6667, "M21": 0.9000, "M22": 75.0000,
            "M23": 0.8500, "M24": 0.0500, "M25": 6.5934, "M26": 6.5934, "M27": 0.0, "M28": 0.8000, "M29": 0.5417,
            "M30": 0.6049, "M31": 0.1400, "M1": 55.7602, "M2": 19793.0
        }),
        ("mpnet", "multi-qa-mpnet-base-cos-v1", "Primitive", {
            "M3": 1.5061, "M4": 0.6928, "M4b": 0.7209, "M5": 0.7000, "M6": 0.4154, "M7": 0.1875, "M8": 0.2896,
            "M9": 898.8, "M10": 0.0704, "M11": 0.3552, "M12": 0.8869, "M13": 0.1000, "M14": 0.9000, "M15": 76.4977,
            "M16": 11.1601, "M17": 0.1738, "M18": 95.4100, "M19": 3.2020, "M20": 91.6667, "M21": 0.9050, "M22": 70.5000,
            "M23": 0.8350, "M24": 0.0550, "M25": 9.6540, "M26": 9.6540, "M27": 0.0, "M28": 0.8000, "M29": 0.4833,
            "M30": 0.5618, "M31": 0.1400, "M1": 119.5493, "M2": 19793.0
        }),
        ("mpnet", "multi-qa-mpnet-base-cos-v1", "Enhanced", {
            "M3": 1.8732, "M4": 0.6740, "M4b": 0.7247, "M5": 0.8000, "M6": 0.4185, "M7": 0.2000, "M8": 0.3215,
            "M9": 898.5, "M10": 0.0821, "M11": 0.3675, "M12": 0.8868, "M13": 0.0667, "M14": 0.9333, "M15": 75.5560,
            "M16": 11.9829, "M17": 0.1486, "M18": 95.6500, "M19": 3.2100, "M20": 91.6667, "M21": 0.9050, "M22": 70.5000,
            "M23": 0.8450, "M24": 0.0550, "M25": 10.1097, "M26": 10.1097, "M27": 0.0, "M28": 0.9000, "M29": 0.5117,
            "M30": 0.6067, "M31": 0.1600, "M1": 119.5493, "M2": 19793.0
        }),
        ("bge-m3", "BAAI/bge-m3", "Primitive", {
            "M1": 47.7141, "M2": 19793.0000, "M3": 0.0410, "M4": 0.6691, "M5": 0.9364,
            "M6": 21.3849, "M7": 13.3262, "M8": 15.3575, "M9": 888.2091, "M10": 5.2741,
            "M11": 30.6895, "M12": 83.6655, "M13": 0.0000, "M14": 100.0000, "M15": 82.8005,
            "M16": 19.9001, "M17": 0.0563, "M18": 0.0000, "M19": 2.4900, "M20": 86.9848,
            "M21": 85.0000, "M22": 80.0000, "M23": 85.0000, "M24": 5.0000, "M25": 1.1271,
            "M26": 1.1271, "M27": 56.1985, "M28": 0.9700, "M29": 0.8158, "M30": 0.8525, "M31": 0.2036
        }),
        ("bge-m3", "BAAI/bge-m3", "Enhanced", {
            "M1": 47.7141, "M2": 19793.0000, "M3": 0.3006, "M4": 0.6531, "M5": 0.9855,
            "M6": 11.0686, "M7": 6.9371, "M8": 8.0410, "M9": 891.4000, "M10": 2.8129,
            "M11": 15.3238, "M12": 83.4683, "M13": 4.5455, "M14": 95.4545, "M15": 83.7281,
            "M16": 24.0478, "M17": 0.0442, "M18": 0.0000, "M19": 2.4900, "M20": 65.6212,
            "M21": 81.1364, "M22": 76.3636, "M23": 81.1364, "M24": 4.7727, "M25": 0.9814,
            "M26": 0.9814, "M27": 34.8863, "M28": 1.0000, "M29": 0.8475, "M30": 0.8846, "M31": 0.2236
        }),
        ("minilm", "multi-qa-MiniLM-L6-cos-v1", "Primitive", {
            "M3": 1.1624, "M4": 0.6618, "M4b": 0.6523, "M5": 0.5000, "M6": 0.4224, "M7": 0.1590, "M8": 0.2734,
            "M9": 874.8, "M10": 0.0727, "M11": 0.3479, "M12": 0.8854, "M13": 0.1500, "M14": 0.8500, "M15": 73.7024,
            "M16": 5.5958, "M17": 0.2283, "M18": 93.6600, "M19": 3.1600, "M20": 100.0000, "M21": 0.9000, "M22": 70.0000,
            "M23": 0.8100, "M24": 0.0550, "M25": 4.4334, "M26": 4.4334, "M27": 0.0, "M28": 0.6000, "M29": 0.3792,
            "M30": 0.4315, "M31": 0.1000, "M1": 29.3932, "M2": 22400.0
        }),
        ("minilm", "multi-qa-MiniLM-L6-cos-v1", "Enhanced", {
            "M3": 2.3740, "M4": 0.6517, "M4b": 0.6826, "M5": 0.6000, "M6": 0.4059, "M7": 0.1531, "M8": 0.2665,
            "M9": 891.9, "M10": 0.0583, "M11": 0.3151, "M12": 0.8832, "M13": 0.0833, "M14": 0.9167, "M15": 71.7024,
            "M16": 6.1666, "M17": 0.1814, "M18": 93.3700, "M19": 3.1600, "M20": 75.0000, "M21": 0.9000, "M22": 75.0000,
            "M23": 0.8500, "M24": 0.0500, "M25": 3.7920, "M26": 3.7920, "M27": 0.0, "M28": 0.7000, "M29": 0.4658,
            "M30": 0.5202, "M31": 0.1200, "M1": 29.3932, "M2": 22400.0
        })
    ]

    for short_id, emb_model, mode, val_dict in lexved_configs:
        cases = 110 if short_id == "bge-m3" else None
        notes_text = f"Evaluated over 110 Comprehensive Benchmark Legal Queries with {emb_model} using {mode} retrieval strategy." if short_id == "bge-m3" else f"Evaluated with embedding model {emb_model} using {mode} retrieval strategy."
        run = EvaluationRun(
            run_id=f"LEXVED-{short_id.upper()}-{mode[:4].upper()}",
            system_id=lexved_id,
            evaluation_date=datetime.now(timezone.utc),
            model_name=emb_model,
            dataset_name="Comprehensive Benchmark Legal Queries (110 Queries)" if short_id == "bge-m3" else "Legal Research & Judicial Precedents",
            methodology=f"RAG with {mode} Retrieval pipeline. LLM: nvidia/nemotron-3-ultra-550b-a55b. Judge parse failure rate: 0.0%.",
            test_case_count=cases,
            status="completed",
            notes=notes_text,
            metadata_json={"embedding_model": emb_model, "retrieval_mode": mode, "judge_parse_failure": "0.0%", "benchmark_queries": cases}
        )
        db.add(run)
        db.flush()

        for code, val in val_dict.items():
            metric_key = m_map.get(code, code)
            if metric_key in metrics:
                mv = MetricValue(
                    run_id=run.id,
                    metric_id=metrics[metric_key],
                    value=val
                )
                db.add(mv)

    # 4. LexRAG Runs (Full 31-KPI Institutional Audit Benchmark + Granular Generation Suite)
    lexrag_id = systems["LexRAG"]

    # 4a. Full 31-KPI Institutional Audit Benchmark Run
    run_lexrag_audit = EvaluationRun(
        run_id="LEXRAG-31-KPI-AUDIT",
        system_id=lexrag_id,
        evaluation_date=datetime.now(timezone.utc),
        model_name="LexRAG-Institutional-Audited-v1",
        dataset_name="LexRAG 31-KPI Institutional Audit Suite",
        methodology="Official 31-KPI institutional audit benchmark covering infrastructure latency, retrieval quality, precision, grounding, and system runtime.",
        test_case_count=None,
        status="completed",
        notes="Saved to: /data/nithinh/legalai/LexRAG_Comparison/outputs/lexrag_31_kpi_institutional_audit.csv",
        metadata_json={
            "audit_file": "/data/nithinh/legalai/LexRAG_Comparison/outputs/lexrag_31_kpi_institutional_audit.csv",
            "categories": [
                "Infrastructure Latency", "Retrieval Quality", "Lexical & Semantic",
                "Factual Grounding", "System Runtime", "Legal Compliance",
                "Inference Stream", "IR Benchmark"
            ]
        }
    )
    db.add(run_lexrag_audit)
    db.flush()

    lexrag_31_kpi_vals = {
        # Infrastructure Latency (M1 - M3)
        "emb_latency": 0.0809,           # M1: Embedding Latency (s)
        "index_size": 5271.0000,         # M2: Index Size (Vectors/Chunks)
        "ret_latency": 0.0320,           # M3: Retrieval Latency (s)
        # Retrieval Quality (M4 - M5)
        "query_context_cos_sim": 0.4742, # M4: Cosine Similarity
        "recall_at_5": 94.5500,          # M5: Recall@5 (%) -> Leader!
        # Lexical & Semantic Precision (M6 - M12)
        "rouge_1_f1": 33.4100,           # M6: ROUGE-1 F1 (%)
        "rouge_2_f1": 17.3000,           # M7: ROUGE-2 F1 (%)
        "rouge_l_f1": 22.8200,           # M8: ROUGE-L F1 (%)
        "context_words": 582.0000,       # M9: Context Words
        "bleu_4": 8.0700,                # M10: BLEU Score (BLEU-4) (%)
        "bleu_score": 8.0700,            # M10 alias
        "meteor": 33.8300,               # M11: METEOR Score (%)
        "bertscore_f1": 74.8000,         # M12: BERTScore F1 (%)
        # Factual Grounding (M13 - M15)
        "factual_deviation": 14.7500,    # M13: Factual Deviation (FCD) (%)
        "faithfulness_judge": 85.2500,   # M14: Faithfulness (%)
        "gt_coverage": 60.3600,          # M15: Ground Truth Coverage (%)
        # System Runtime (M16 - M19)
        "e2e_latency": 10.3000,          # M16: End-to-End Latency (s)
        "throughput_qps": 0.0979,        # M17: System Throughput (QPS)
        "cpu_usage": 5.1000,             # M18: CPU Utilization (%) -> Ultra Efficient Leader!
        "ram_usage": 12.3000,            # M19: RAM Utilization (%) -> Ultra Efficient Leader!
        # Legal Compliance (M20 - M24)
        "citation_accuracy": 86.7400,    # M20: Citation Accuracy (%)
        "terminology_precision": 84.1800,# M21: Terminology Precision (%)
        "precedent_match": 94.5500,      # M22: Precedent Match (%) -> Leader!
        "reg_alignment": 95.0000,        # M23: Regulatory Alignment (%)
        "bias_score": 1.5000,            # M24: Bias Score (derived from 98.5% Neutrality)
        # Inference Stream (M25 - M27)
        "prefill_latency": 0.0873,       # M25: Prefill Latency (s) -> Leader (87.3 ms)!
        "ttft": 0.1164,                  # M26: Time to First Token (TTFT) (s) -> Leader (116.4 ms)!
        "tokens_per_sec": 37.0400,       # M27: Generation Throughput (tok/s)
        # IR Benchmark (M28 - M31)
        "recall_at_10": 95.4500,         # M28: Recall@10 (%) -> SYSTEM BENCHMARK LEADER!
        "mrr": 0.8837,                   # M29: Mean Reciprocal Rank (MRR) -> SYSTEM BENCHMARK LEADER!
        "ndcg_at_10": 0.9008,            # M30: nDCG@10 -> SYSTEM BENCHMARK LEADER!
        "precision_at_5": 64.7300        # M31: Precision@5 (%) -> SYSTEM BENCHMARK LEADER!
    }
    for k, v in lexrag_31_kpi_vals.items():
        if k in metrics:
            db.add(MetricValue(run_id=run_lexrag_audit.id, metric_id=metrics[k], value=v, notes="Institutional Audit Benchmark M1-M31"))

    # 4b. Granular Generation Suite Run
    run_lexrag_gen = EvaluationRun(
        run_id="LEXRAG-OFFICIAL-GEN-01",
        system_id=lexrag_id,
        evaluation_date=datetime.now(timezone.utc),
        model_name="LexRAG-Legal-Generator-v1",
        dataset_name="Official Legal Generation Benchmark",
        methodology="Generation benchmark evaluating token, char, and BERTScore precision/recall.",
        test_case_count=None,
        status="completed",
        notes="Official LexRAG Generation Benchmark Report (Screenshot Transcription).",
        metadata_json={"benchmark": "LexRAG Generation Suite"}
    )
    db.add(run_lexrag_gen)
    db.flush()

    lexrag_gen_vals = {
        "rouge_l_f1": 0.2306,
        "bert_precision": 0.7140,
        "bert_recall": 0.7844,
        "bertscore_f1": 0.7472,
        "bleu_1": 0.2854,
        "bleu_2": 0.2526,
        "bleu_3": 0.2233,
        "bleu_4": 0.1852,
        "keyword_accuracy": 0.7329,
        "char_precision": 0.2854,
        "char_recall": 0.8218,
        "char_f1": 0.4120,
        "meteor": 0.3843
    }
    for k, v in lexrag_gen_vals.items():
        if k in metrics:
            db.add(MetricValue(run_id=run_lexrag_gen.id, metric_id=metrics[k], value=v))

    # 5. AILQA Runs (Full M1-M31 Institutional Benchmark + Precedent Dense Retrieval)
    ailqa_id = systems["AILQA"]
    
    # 5a. Primary Official 31 Institutional Metrics Run
    run_ailqa_institutional = EvaluationRun(
        run_id="AILQA-M1-M31-INSTITUTIONAL",
        system_id=ailqa_id,
        evaluation_date=datetime.now(timezone.utc),
        model_name="AILQA-Institutional-Pipeline-v1",
        dataset_name="Institutional Benchmark Suite (M1-M31)",
        methodology="Official institutional evaluation covering all 31 metrics across infrastructure latency, precision, factual grounding, system efficiency, and legal compliance.",
        test_case_count=None,
        status="completed",
        notes="Exported to /data/nithinh/legalai/AILQA_Comparison/outputs/ailqa_m1_m31_institutional_benchmark.csv",
        metadata_json={
            "benchmark_file": "/data/nithinh/legalai/AILQA_Comparison/outputs/ailqa_m1_m31_institutional_benchmark.csv",
            "categories": [
                "Infrastructure Latency", "Retrieval Quality", "Lexical & Semantic Precision",
                "Factual Grounding", "System Runtime & Efficiency", "Legal Compliance & Reasoning",
                "LLM Stream & Inference", "IR Benchmarks"
            ]
        }
    )
    db.add(run_ailqa_institutional)
    db.flush()

    # Exact 31 Institutional Benchmark Metrics (M1 - M31)
    ailqa_m1_m31_vals = {
        # Infrastructure Latency (M1 - M3)
        "emb_latency": 0.0184,           # M1: Embedding Latency (s)
        "index_size": 5271.0000,         # M2: Index Size (Vectors/Chunks)
        "ret_latency": 0.0035,           # M3: Retrieval Latency (s)
        # Retrieval Quality (M4 - M5)
        "query_context_cos_sim": 0.5683, # M4: Cosine Similarity
        "recall_at_5": 0.0000,           # M5: Recall@5 (%)
        # Lexical & Semantic Precision (M6 - M12)
        "rouge_1_f1": 50.3000,           # M6: ROUGE-1 F1 (%)
        "rouge_2_f1": 31.2600,           # M7: ROUGE-2 F1 (%)
        "rouge_l_f1": 37.2600,           # M8: ROUGE-L F1 (%)
        "context_words": 2364.0000,      # M9: Context Words
        "bleu_4": 20.7300,               # M10: BLEU-4 Score (%)
        "meteor": 44.3800,               # M11: METEOR Score (%) -> System Leader!
        "bertscore_f1": 82.5000,         # M12: BERTScore / MPNet F1 (%)
        "semantic_mpnet": 82.5000,       # M12: MPNet F1 (%)
        # Factual Grounding (M13 - M15)
        "factual_deviation": 0.8400,     # M13: Factual Consistency Dev. (FCD) (%)
        "faithfulness_judge": 99.1600,   # M14: Faithfulness (%) -> System Leader!
        "gt_coverage": 88.6900,          # M15: Ground Truth Coverage (%)
        # System Runtime & Efficiency (M16 - M19)
        "e2e_latency": 2.4535,           # M16: End-to-End Latency (s)
        "throughput_qps": 0.4076,        # M17: System Throughput (QPS)
        "cpu_usage": 22.7700,            # M18: CPU Utilization (%)
        "ram_usage": 1.6760,             # M19: RAM Utilization (GB)
        # Legal Compliance & Reasoning (M20 - M24)
        "citation_accuracy": 90.3800,    # M20: Citation Accuracy (%)
        "terminology_precision": 86.8900,# M21: Terminology Precision (%)
        "precedent_match": 71.3600,      # M22: Precedent Match (%)
        "reg_alignment": 95.0000,        # M23: Regulatory Alignment (%)
        "bias_score": 3.5000,            # M24: Bias Score (%)
        # LLM Stream & Inference (M25 - M27)
        "ttft": 0.4500,                  # M25: Time to First Token (TTFT) (s)
        "prefill_latency": 0.2800,       # M26: Prefill Latency (s)
        "tokens_per_sec": 55.6400,       # M27: Generation Throughput (tok/s)
        # IR Benchmarks (M28 - M31)
        "recall_at_10": 0.0000,          # M28: Recall@10 (%)
        "mrr": 0.0000,                   # M29: Mean Reciprocal Rank (MRR)
        "ndcg_at_10": 0.0000,            # M30: nDCG@10
        "precision_at_5": 0.0000         # M31: Precision@5 (%)
    }
    for k, v in ailqa_m1_m31_vals.items():
        if k in metrics:
            db.add(MetricValue(run_id=run_ailqa_institutional.id, metric_id=metrics[k], value=v, notes="Institutional benchmark M1-M31"))

    # 5b. Precedent Dense Retrieval Evaluation Run (Authoritative Legal Precedents)
    run_ailqa_retrieval = EvaluationRun(
        run_id="AILQA-CORK-RETRIEVAL-01",
        system_id=ailqa_id,
        evaluation_date=datetime.now(timezone.utc),
        model_name="AILQA-Precedent-Dense-Retriever",
        dataset_name="AILQA Judicial Precedent Benchmark (Cork)",
        methodology="Dense retrieval evaluation targeting legal case citations and judicial precedents.",
        test_case_count=None,
        status="completed",
        notes="AILQA Precedent Retrieval benchmark from /data/nithinh/legalai/AILQA_Cork.csv",
        metadata_json={"source": "/data/nithinh/legalai/AILQA_Cork.csv", "domain": "Judicial Precedent Retrieval"}
    )
    db.add(run_ailqa_retrieval)
    db.flush()

    ailqa_retrieval_vals = {
        "recall_at_10": 94.5500,
        "mrr": 0.8613,
        "ndcg_at_10": 0.8600,
        "semantic_mpnet": 82.5000,
        "meteor": 44.3800,
        "rouge_l_f1": 37.2600,
        "bleu_4": 20.7300
    }
    for k, v in ailqa_retrieval_vals.items():
        if k in metrics:
            db.add(MetricValue(run_id=run_ailqa_retrieval.id, metric_id=metrics[k], value=v, notes="Precedent retrieval benchmark"))

    db.commit()
    print("Database successfully seeded with LexVed, LexRAG, and updated AILQA M1-M31 institutional evaluation data!")
