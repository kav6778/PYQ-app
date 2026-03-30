"""
main.py — Question Extraction Pipeline Orchestrator

Runs the full four-stage pipeline on one or more competitive exam PDFs:

  Stage 1: Render PDF pages to PNG at 300 DPI (strips headers/footers)
  Stage 2: Detect layout regions with LayoutParser + Detectron2
  Stage 3: Dual OCR — Tesseract for text, pix2tex for math formulas
  Stage 4: Classify questions by subject/topic and write JSON output

Usage:
    python main.py <pdf_file> [<pdf_file> ...]
    python main.py <pdf_file> --odd-only --skip-covers

Flags:
    --odd-only      Only process odd-numbered pages (English in UPSC bilingual papers)
    --skip-covers   Skip the first and last pages (cover pages)

Output:
    /output/questions/<pdf_stem>.json   — all questions extracted
    /output/logs/<pdf_stem>_log.json    — extraction summary statistics
    /output/pages/<pdf_stem>_page_*.png — intermediate page images
"""

from __future__ import annotations

import argparse
import sys
import traceback
from pathlib import Path

from PIL import Image

from stages.classify import (
    build_question_dict,
    save_questions,
    save_summary_log,
)
from stages.layout import detect_layout
from stages.ocr import RawQuestion, extract_text_from_page
from stages.render import render_pdf_to_images


def should_process_page(
    page_num: int,
    total_pages: int,
    odd_only: bool,
    skip_covers: bool,
    even_only: bool = False,
) -> bool:
    """Return True if this page should be processed given the current flags."""
    if skip_covers and (page_num == 1 or page_num == total_pages):
        return False
    if odd_only and page_num % 2 == 0:
        return False
    if even_only and page_num % 2 == 1:
        return False
    return True


def process_pdf(
    pdf_path: Path,
    odd_only: bool = False,
    even_only: bool = False,
    skip_covers: bool = False,
) -> None:
    """
    Run the complete extraction pipeline on a single PDF file.

    Args:
        pdf_path: Path to the PDF file to process.
        odd_only: When True, only process odd-numbered pages.
        even_only: When True, only process even-numbered pages.
        skip_covers: When True, skip page 1 and the last page.
    """
    print(f"\n{'=' * 60}")
    print(f"Processing: {pdf_path.name}")
    if skip_covers:
        print("  ↳ Skipping first and last pages (cover pages)")
    if odd_only:
        print("  ↳ Only processing odd-numbered pages")
    if even_only:
        print("  ↳ Only processing even-numbered pages")
    print(f"{'=' * 60}")

    page_paths = render_pdf_to_images(pdf_path)
    total_pages = len(page_paths)

    # Delete page images that won't be processed so that the admin UI only
    # shows the relevant pages (no covers, no Hindi pages when odd-only set).
    pages_to_process: list[Path] = []
    for page_num, img_path in enumerate(page_paths, start=1):
        if should_process_page(page_num, total_pages, odd_only, skip_covers, even_only):
            pages_to_process.append(img_path)
        else:
            print(f"Page {page_num}/{total_pages} — skipped (deleting image)")
            try:
                img_path.unlink(missing_ok=True)
            except Exception as exc:
                print(f"  WARN: could not delete {img_path.name}: {exc}")

    # Build a set for O(1) lookup
    keep_set = set(pages_to_process)
    # Map each kept path → its original 1-based page number
    orig_page_nums = {
        img_path: page_num
        for page_num, img_path in enumerate(page_paths, start=1)
        if img_path in keep_set
    }

    all_raw_questions: list[RawQuestion] = []

    for img_path in pages_to_process:
        page_num_orig = orig_page_nums[img_path]
        try:
            image = Image.open(img_path).convert("RGB")
            bboxes = detect_layout(image)
            raw_questions = extract_text_from_page(image, bboxes, page_num_orig)
            all_raw_questions.extend(raw_questions)
            print(f"Page {page_num_orig}/{total_pages} — {len(raw_questions)} questions found")
        except Exception:
            print(f"ERROR on page {page_num_orig}/{total_pages} ({img_path.name}):")
            traceback.print_exc()
            print("Skipping page and continuing …")

    source_pdf_name = pdf_path.name
    questions_json = [
        build_question_dict(rq, source_pdf=source_pdf_name)
        for rq in all_raw_questions
    ]

    save_questions(questions_json, pdf_path.stem)
    save_summary_log(questions_json, pdf_path.stem, total_pages)

    print(f"\nDone: {len(questions_json)} question(s) extracted from '{pdf_path.name}'.")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Extract questions from competitive exam PDFs"
    )
    parser.add_argument("pdfs", nargs="*", help="PDF file paths to process")
    parser.add_argument(
        "--odd-only",
        action="store_true",
        dest="odd_only",
        help="Only process odd-numbered pages",
    )
    parser.add_argument(
        "--even-only",
        action="store_true",
        dest="even_only",
        help="Only process even-numbered pages",
    )
    parser.add_argument(
        "--skip-covers",
        action="store_true",
        dest="skip_covers",
        help="Skip the first and last pages (cover pages)",
    )
    args = parser.parse_args(argv[1:])

    if not args.pdfs:
        parser.print_help()
        return 1

    for pdf_arg in args.pdfs:
        pdf_path = Path(pdf_arg)
        if not pdf_path.exists():
            print(f"File not found: {pdf_path}")
            continue
        if pdf_path.suffix.lower() != ".pdf":
            print(f"Skipping non-PDF file: {pdf_path}")
            continue
        try:
            process_pdf(pdf_path, odd_only=args.odd_only, even_only=args.even_only, skip_covers=args.skip_covers)
        except Exception:
            print(f"FATAL ERROR processing '{pdf_path.name}':")
            traceback.print_exc()

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
