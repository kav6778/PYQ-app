"""
Utility: run stages 2-4 on already-rendered page PNGs.

Saves results incrementally after each page so a timeout never loses work.
Skips pages already processed by checking the checkpoint file.

Usage:
    python run_from_pages.py <pdf_stem>                 # all pages
    python run_from_pages.py <pdf_stem> 1 20            # pages 1-20 only
    python run_from_pages.py --pdf /path/to/file.pdf    # argparse style
    python run_from_pages.py --pdf /path/to/file.pdf --odd-only --skip-covers
"""
from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

from PIL import Image

from stages.layout import detect_layout
from stages.ocr import RawQuestion, extract_text_from_page
from stages.classify import build_question_dict, save_questions, save_summary_log

PAGES_DIR = Path(__file__).parent / "output" / "pages"
QUESTIONS_DIR = Path(__file__).parent / "output" / "questions"
LOGS_DIR = Path(__file__).parent / "output" / "logs"
OCR_SCALE = 0.4  # ~120 DPI; fast and sufficient for print-quality PDFs


def _load_checkpoint(pdf_stem: str) -> list[dict]:
    path = QUESTIONS_DIR / f"{pdf_stem}.json"
    if path.exists():
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    return []


def _save_checkpoint(questions: list[dict], pdf_stem: str) -> None:
    QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)
    path = QUESTIONS_DIR / f"{pdf_stem}.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(questions, fh, indent=2, ensure_ascii=False)


def build_page_list(
    all_paths: list[Path],
    start_page: int,
    end_page: int | None,
    odd_only: bool,
    skip_covers: bool,
) -> list[tuple[int, Path]]:
    """
    Return (page_number, path) pairs after applying all filters.

    - start_page / end_page: explicit range (1-based, inclusive)
    - odd_only: keep only odd-numbered pages (1, 3, 5, …)
    - skip_covers: drop the first and last pages in the full set
    """
    total = len(all_paths)
    # Build full numbered list first
    numbered = [(i + 1, p) for i, p in enumerate(all_paths)]

    if skip_covers and total >= 2:
        # Remove first and last pages
        first_page = numbered[0][0]
        last_page = numbered[-1][0]
        numbered = [(n, p) for n, p in numbered if n != first_page and n != last_page]

    # Apply explicit range
    numbered = [(n, p) for n, p in numbered if start_page <= n <= (end_page or total)]

    if odd_only:
        numbered = [(n, p) for n, p in numbered if n % 2 == 1]

    return numbered


def run(
    pdf_stem: str,
    start_page: int = 1,
    end_page: int | None = None,
    odd_only: bool = False,
    skip_covers: bool = False,
) -> None:
    page_paths = sorted(PAGES_DIR.glob(f"{pdf_stem}_page_*.png"))
    if not page_paths:
        print(f"No pages found for '{pdf_stem}' in {PAGES_DIR}")
        sys.exit(1)

    total_pages = len(page_paths)
    to_process = build_page_list(page_paths, start_page, end_page, odd_only, skip_covers)

    flags = []
    if skip_covers:
        flags.append("skip-covers")
    if odd_only:
        flags.append("odd-only")
    flags_str = f" [{', '.join(flags)}]" if flags else ""

    print(f"Total pages on disk: {total_pages}")
    print(f"Pages to process: {len(to_process)}{flags_str}")
    print(f"OCR scale: {OCR_SCALE*100:.0f}%")

    already_done_pages: set[int] = set()
    all_questions: list[dict] = _load_checkpoint(pdf_stem)
    if all_questions:
        already_done_pages = {q["source_page"] for q in all_questions}
        print(f"Loaded checkpoint: {len(all_questions)} questions "
              f"from pages {sorted(already_done_pages)}")

    for page_num, img_path in to_process:
        if page_num in already_done_pages:
            print(f"Page {page_num}/{total_pages} — already done, skipping")
            continue
        try:
            img = Image.open(img_path).convert("RGB")
            img = img.resize(
                (int(img.width * OCR_SCALE), int(img.height * OCR_SCALE)),
                Image.LANCZOS,
            )
            bboxes = detect_layout(img, None)
            raw_qs = extract_text_from_page(img, bboxes, page_num)
            page_questions = [
                build_question_dict(rq, source_pdf=f"{pdf_stem}.pdf")
                for rq in raw_qs
            ]
            all_questions.extend(page_questions)
            _save_checkpoint(all_questions, pdf_stem)
            print(f"Page {page_num}/{total_pages} — {len(raw_qs)} questions "
                  f"[total so far: {len(all_questions)}]", flush=True)
        except Exception:
            print(f"ERROR on page {page_num}/{total_pages}:")
            traceback.print_exc()

    save_summary_log(all_questions, pdf_stem, total_pages)
    print(f"\nDone. {len(all_questions)} total question(s) in checkpoint.")


if __name__ == "__main__":
    # Support both legacy positional args and modern argparse style
    if len(sys.argv) >= 2 and not sys.argv[1].startswith("--"):
        # Legacy: run_from_pages.py <pdf_stem> [start] [end]
        stem = sys.argv[1]
        s = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        e = int(sys.argv[3]) if len(sys.argv) > 3 else None
        run(stem, start_page=s, end_page=e)
    else:
        parser = argparse.ArgumentParser(description="Run OCR on pre-rendered page images")
        parser.add_argument("--pdf", required=True, help="Path to the original PDF (stem is derived from filename)")
        parser.add_argument("--start_page", type=int, default=1, help="First page to process (1-based)")
        parser.add_argument("--end_page", type=int, default=None, help="Last page to process (1-based)")
        parser.add_argument("--odd-only", action="store_true", dest="odd_only",
                            help="Only process odd-numbered pages (English pages in UPSC bilingual papers)")
        parser.add_argument("--skip-covers", action="store_true", dest="skip_covers",
                            help="Skip the first and last pages (cover pages)")
        args = parser.parse_args()
        pdf_path = Path(args.pdf)
        run(
            pdf_path.stem,
            start_page=args.start_page,
            end_page=args.end_page,
            odd_only=args.odd_only,
            skip_covers=args.skip_covers,
        )
