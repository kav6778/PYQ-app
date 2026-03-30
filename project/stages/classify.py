"""
Stage 4 — Classify + Build JSON

Takes a list of RawQuestion objects (from Stage 3) and produces a list of
fully-populated question dicts matching the output JSON schema.

Each question is tagged with:
- subject / topic (via keyword_dict.classify_text)
- question_type  (MCQ | passage-based | integer | descriptive)
- extraction_confidence (estimated from OCR completeness / boundary certainty)
- needs_review flag

Output is saved to /output/questions/<pdf_stem>.json.
A summary log is written to /output/logs/<pdf_stem>_log.json.

Can be run independently (requires a Stage 3 RawQuestion list in memory).
"""

from __future__ import annotations

import json
import sys
from itertools import count
from pathlib import Path
from typing import Any

from stages.ocr import RawQuestion
from utils.keyword_dict import classify_text

OUTPUT_QUESTIONS_DIR = (
    Path(__file__).resolve().parent.parent / "output" / "questions"
)
OUTPUT_LOGS_DIR = Path(__file__).resolve().parent.parent / "output" / "logs"

_question_counter = count(1)


def _next_question_id() -> str:
    """
    Generate the next auto-incremented question ID in the format Q001.

    Returns:
        Zero-padded question ID string (e.g. 'Q001', 'Q042').
    """
    return f"Q{next(_question_counter):03d}"


def _detect_question_type(rq: RawQuestion) -> str:
    """
    Infer the question type from options, passage linkage, and text cues.

    Rules:
    - If the question has a passage_id → 'passage-based'
    - If it has 4 options (A–D) → 'MCQ'
    - If the stem contains 'integer' or asks for a numeric answer → 'integer'
    - Otherwise → 'descriptive'

    Args:
        rq: A RawQuestion from Stage 3.

    Returns:
        One of: 'MCQ', 'passage-based', 'integer', 'descriptive'.
    """
    if rq.passage_id:
        return "passage-based"
    if set(rq.options.keys()) >= {"A", "B", "C", "D"}:
        return "MCQ"
    stem_lower = rq.question_text.lower()
    if "integer" in stem_lower or "find the value" in stem_lower:
        return "integer"
    return "descriptive"


def _estimate_confidence(rq: RawQuestion) -> float:
    """
    Estimate an extraction confidence score in [0.0, 1.0].

    Deductions:
    - 0.15 if needs_review is True
    - 0.10 if no options were parsed and the type is expected to be MCQ
    - 0.05 if question_text is very short (< 10 chars)

    Args:
        rq: A RawQuestion from Stage 3.

    Returns:
        Float confidence value between 0.0 and 1.0.
    """
    score = 1.0
    if rq.needs_review:
        score -= 0.15
    if not rq.options and "?" in rq.question_text:
        score -= 0.05
    if len(rq.question_text) < 10:
        score -= 0.10
    return max(0.0, round(score, 2))


def build_question_dict(
    rq: RawQuestion,
    source_pdf: str,
    question_id: str | None = None,
) -> dict[str, Any]:
    """
    Convert a RawQuestion into the canonical output JSON object.

    Args:
        rq: The RawQuestion to convert.
        source_pdf: Filename of the source PDF (e.g. 'exam2024.pdf').
        question_id: Optional explicit ID; auto-generated if None.

    Returns:
        Dict matching the output JSON schema described in the project spec.
    """
    qid = question_id or _next_question_id()
    subject, topic = classify_text(rq.question_text)
    q_type = _detect_question_type(rq)
    confidence = _estimate_confidence(rq)
    needs_review = rq.needs_review or confidence < 0.75

    return {
        "question_id": qid,
        "source_pdf": source_pdf,
        "source_page": rq.source_page,
        "column": rq.column,
        "passage_id": rq.passage_id,
        "question_text": rq.question_text,
        "options": rq.options if rq.options else {"A": "", "B": "", "C": "", "D": ""},
        "has_math": rq.has_math,
        "math_latex": rq.math_latex,
        "question_type": q_type,
        "subject": subject,
        "topic": topic,
        "difficulty": "unclassified",
        "extraction_confidence": confidence,
        "needs_review": needs_review,
    }


def save_questions(
    questions: list[dict[str, Any]],
    pdf_stem: str,
    output_dir: Path = OUTPUT_QUESTIONS_DIR,
) -> Path:
    """
    Serialize a list of question dicts to JSON and write to disk.

    Args:
        questions: List of question dicts from build_question_dict.
        pdf_stem: Stem of the source PDF filename (no extension).
        output_dir: Directory to write the JSON file into.

    Returns:
        Path to the written JSON file.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{pdf_stem}.json"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(questions, fh, indent=2, ensure_ascii=False)
    print(f"Questions saved → {out_path}")
    return out_path


def save_summary_log(
    questions: list[dict[str, Any]],
    pdf_stem: str,
    total_pages: int,
    output_dir: Path = OUTPUT_LOGS_DIR,
) -> Path:
    """
    Write a summary log JSON for the extraction run.

    The log includes counts for total pages, questions, math questions,
    passage-based questions, unclassified subjects, and low-confidence
    questions (confidence < 0.75).

    Args:
        questions: Finalized list of question dicts.
        pdf_stem: Stem of the source PDF filename (no extension).
        total_pages: Total number of pages processed.
        output_dir: Directory to write the log file into.

    Returns:
        Path to the written log JSON file.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    math_qs = sum(1 for q in questions if q["has_math"])
    passage_qs = sum(1 for q in questions if q["passage_id"] is not None)
    unclassified = sum(1 for q in questions if q["subject"] == "unclassified")
    low_conf = sum(1 for q in questions if q["extraction_confidence"] < 0.75)

    log = {
        "source_pdf": f"{pdf_stem}.pdf",
        "total_pages": total_pages,
        "total_questions_found": len(questions),
        "math_questions": math_qs,
        "passage_questions": passage_qs,
        "unclassified_count": unclassified,
        "low_confidence_count": low_conf,
    }
    out_path = output_dir / f"{pdf_stem}_log.json"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(log, fh, indent=2, ensure_ascii=False)
    print(f"Summary log saved → {out_path}")
    return out_path


if __name__ == "__main__":
    print("Stage 4 (classify) must be invoked from main.py.")
    sys.exit(0)
