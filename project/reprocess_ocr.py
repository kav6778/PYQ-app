#!/usr/bin/env python3
"""
Re-run OCR + classify on already-rendered page images.
Use this when you fix stages/ocr.py or stages/classify.py
WITHOUT needing to re-render the PDF (Stage 1 is the slow step).

Usage:
    python project/reprocess_ocr.py
    python project/reprocess_ocr.py --pages 1-5        # only pages 1-5
    python project/reprocess_ocr.py --pages 1,3,7      # specific pages
    python project/reprocess_ocr.py --dry-run          # just print OCR output, don't save

After this runs, re-import into the DB:
    cd artifacts/api-server
    node --enable-source-maps ./dist/import-existing.mjs
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent
OUTPUT_DIR = ROOT / "output"
PAGES_DIR = OUTPUT_DIR / "pages"
QUESTIONS_DIR = OUTPUT_DIR / "questions"
QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(ROOT))
from stages.layout import load_model, detect_regions_for_image, fallback_regions
from stages.ocr import extract_text_from_page
from stages.classify import classify_questions
from PIL import Image


def parse_pages_arg(pages_arg: str | None, max_page: int) -> list[int]:
    if not pages_arg:
        return list(range(1, max_page + 1))
    pages: set[int] = set()
    for part in pages_arg.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            pages.update(range(int(a), int(b) + 1))
        else:
            pages.add(int(part))
    return sorted(p for p in pages if 1 <= p <= max_page)


def main():
    parser = argparse.ArgumentParser(description="Re-run OCR on existing page images")
    parser.add_argument("--pages", default=None, help="Pages to process: '1-5' or '1,3,7'")
    parser.add_argument("--odd-only", action="store_true", dest="odd_only",
                        help="Only process odd-numbered pages (English in UPSC bilingual papers)")
    parser.add_argument("--skip-covers", action="store_true", dest="skip_covers",
                        help="Skip the first and last pages (cover pages)")
    parser.add_argument("--dry-run", action="store_true", help="Print OCR output, don't save JSON")
    parser.add_argument("--verbose", action="store_true", help="Print each question as it is extracted")
    args = parser.parse_args()

    # Find all page image files, grouped by PDF stem
    stems: dict[str, list[tuple[int, Path]]] = {}
    for f in sorted(PAGES_DIR.glob("*_page_*.png")):
        # filename: <stem>_page_NNNN.png
        parts = f.stem.rsplit("_page_", 1)
        if len(parts) != 2:
            continue
        stem, page_str = parts
        try:
            page_num = int(page_str)
        except ValueError:
            continue
        stems.setdefault(stem, []).append((page_num, f))

    if not stems:
        print(f"No page images found in {PAGES_DIR}")
        sys.exit(1)

    model = load_model()
    if model is None:
        print("LayoutParser model not available, using fallback regions")

    for stem, pages_list in stems.items():
        pages_list.sort()
        max_page = pages_list[-1][0]
        total = len(pages_list)

        wanted = parse_pages_arg(args.pages, max_page)

        # Apply --skip-covers
        if args.skip_covers and total >= 2:
            first_pg = pages_list[0][0]
            last_pg = pages_list[-1][0]
            wanted = [p for p in wanted if p != first_pg and p != last_pg]

        # Apply --odd-only
        if args.odd_only:
            wanted = [p for p in wanted if p % 2 == 1]

        wanted_set = set(wanted)

        print(f"\n=== Processing: {stem} ===")
        print(f"  Total pages available: {len(pages_list)}, processing: {len(wanted)}")

        all_questions = []
        q_counter = 1

        for page_num, page_path in pages_list:
            if page_num not in wanted_set:
                continue

            print(f"  Page {page_num}: {page_path.name}", end="  ", flush=True)
            try:
                img = Image.open(page_path)
                try:
                    if model:
                        bboxes = detect_regions_for_image(img, model)
                    else:
                        bboxes = fallback_regions(img)
                except Exception as e:
                    print(f"WARN layout: {e}", end="  ")
                    bboxes = fallback_regions(img)

                raw = extract_text_from_page(img, bboxes, page_num)
                print(f"→ {len(raw)} questions")

                if args.verbose or args.dry_run:
                    for rq in raw:
                        print(f"    {rq.question_text[:80]!r}")
                        if rq.options:
                            print(f"    Options: {rq.options}")

                for rq in raw:
                    all_questions.append({
                        "question_id": f"Q{q_counter:03d}",
                        "source_pdf": f"{stem}.pdf",
                        "source_page": rq.source_page,
                        "column": rq.column,
                        "passage_id": rq.passage_id,
                        "question_text": rq.question_text,
                        "options": rq.options,
                        "has_math": rq.has_math,
                        "math_latex": rq.math_latex,
                        "question_type": "mcq" if rq.options else "descriptive",
                        "subject": "unclassified",
                        "topic": "General",
                        "difficulty": "unclassified",
                        "extraction_confidence": 1.0,
                        "needs_review": rq.needs_review,
                    })
                    q_counter += 1

            except Exception as e:
                print(f"ERROR: {e}")

        if args.dry_run:
            print(f"\n[Dry run] Would save {len(all_questions)} questions — not written.")
        else:
            out_file = QUESTIONS_DIR / f"{stem}.json"
            # Classify subjects/topics
            try:
                from stages.classify import classify_questions as classify
                classified = classify(all_questions)
            except Exception as e:
                print(f"WARN classify failed: {e}")
                classified = all_questions

            with open(out_file, "w") as f:
                json.dump(classified, f, ensure_ascii=False, indent=2)
            print(f"\nSaved {len(classified)} questions → {out_file}")
            print("\nNext step: re-import into DB:")
            print("  cd artifacts/api-server && node --enable-source-maps ./dist/import-existing.mjs")


if __name__ == "__main__":
    main()
