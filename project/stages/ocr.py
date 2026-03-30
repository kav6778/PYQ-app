"""
Stage 3 — Dual OCR + Question Boundary Detection

For each sorted bounding box from Stage 2:
- text_block  → run Tesseract OCR (lang=eng, PSM 6)
- math_block  → run pix2tex to get a LaTeX string

After extracting text, applies regex patterns to split the combined OCR
output into individual questions with their options (A/B/C/D).

Passage-based questions are handled by detecting passage headers and
linking subsequent questions to the same passage_id.

Can be run independently (requires Stage 1 + Stage 2 output):
    python -m stages.ocr
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from PIL import Image

from utils.bbox_utils import BBox, crop_image_for_bbox
from utils.regex_utils import (
    is_passage_header,
    parse_options,
    split_into_questions,
    strip_options,
)

try:
    import pytesseract  # type: ignore[import]
except ImportError:
    pytesseract = None  # type: ignore[assignment]


@dataclass
class RawQuestion:
    """
    Intermediate representation of a single question extracted from a page.

    Attributes:
        question_text: The text of the question (stem only, options excluded).
        options: Mapping of option letters to their text (may be empty).
        has_math: True if the question or its options contain a math block.
        math_latex: LaTeX string from pix2tex, or None.
        column: 'left' or 'right'.
        passage_id: Identifier linking to a passage, or None.
        source_page: 1-based page number.
        needs_review: True when question boundary detection is uncertain.
    """

    question_text: str
    options: dict[str, str] = field(default_factory=dict)
    has_math: bool = False
    math_latex: str | None = None
    column: str = "left"
    passage_id: str | None = None
    source_page: int = 0
    needs_review: bool = False


def ocr_text_block(image_crop: Image.Image) -> str:
    """
    Run Tesseract OCR on a cropped text-block image.

    Uses lang=eng and PSM 6 (assume a uniform block of text).

    Args:
        image_crop: PIL Image of the cropped text region.

    Returns:
        Extracted text string (may be empty if OCR yields nothing).
    """
    if pytesseract is None:
        raise ImportError("pytesseract is not installed.")
    config = "--psm 6"
    return pytesseract.image_to_string(image_crop, lang="eng", config=config)


def ocr_math_block(image_crop: Image.Image) -> str:
    """
    Run pix2tex (LaTeX-OCR) on a cropped math-block image.

    Args:
        image_crop: PIL Image of the cropped math region.

    Returns:
        LaTeX string representation of the formula.
    """
    from pix2tex.cli import LatexOCR  # type: ignore[import]

    model = LatexOCR()
    return model(image_crop)


def extract_text_from_page(
    image: Image.Image,
    bboxes: list[BBox],
    page_number: int,
) -> list[RawQuestion]:
    """
    Extract raw questions from a single page given its sorted bounding boxes.

    Iterates over bounding boxes in reading order. For each box:
    - text_block: run Tesseract, accumulate text, detect questions.
    - math_block: run pix2tex, attach LaTeX to the current question context.

    Passage headers are detected and a running passage_id counter tracks
    which questions belong to each passage.

    Args:
        image: Full page PIL Image (already header/footer stripped).
        bboxes: Sorted list of BBox objects for this page.
        page_number: 1-based page number (used on each RawQuestion).

    Returns:
        List of RawQuestion objects found on this page.
    """
    raw_questions: list[RawQuestion] = []
    accumulated_text = ""
    current_column = "left"
    passage_counter = 0
    current_passage_id: str | None = None
    pending_latex: list[str] = []

    def flush_text_block(text: str, column: str) -> None:
        """Parse accumulated text and append questions to raw_questions."""
        nonlocal current_passage_id, passage_counter

        if is_passage_header(text):
            passage_counter += 1
            current_passage_id = f"P{passage_counter:03d}"
            return

        chunks = split_into_questions(text)
        uncertain = len(chunks) == 1 and not any(
            kw in text for kw in ["Q.", "Q1", "1.", "(1)"]
        )
        for chunk in chunks:
            if not chunk.strip():
                continue
            opts = parse_options(chunk)
            stem = strip_options(chunk) if opts else chunk
            rq = RawQuestion(
                question_text=stem.strip(),
                options=opts,
                has_math=bool(pending_latex),
                math_latex="\n".join(pending_latex) if pending_latex else None,
                column=column,
                passage_id=current_passage_id,
                source_page=page_number,
                needs_review=uncertain,
            )
            raw_questions.append(rq)
        pending_latex.clear()

    for bbox in bboxes:
        crop = crop_image_for_bbox(image, bbox)
        if bbox.box_type == "math_block":
            try:
                latex = ocr_math_block(crop)
                pending_latex.append(latex)
            except Exception as exc:
                print(f"    WARN: math OCR failed for bbox on page {page_number}: {exc}")
        elif bbox.box_type == "text_block":
            if bbox.column != current_column and accumulated_text.strip():
                flush_text_block(accumulated_text, current_column)
                accumulated_text = ""
            current_column = bbox.column
            try:
                text = ocr_text_block(crop)
                accumulated_text += "\n" + text
            except Exception as exc:
                print(f"    WARN: Tesseract failed for bbox on page {page_number}: {exc}")

    if accumulated_text.strip():
        flush_text_block(accumulated_text, current_column)

    return raw_questions


if __name__ == "__main__":
    print("Stage 3 (OCR) must be invoked from main.py or with specific page images.")
    sys.exit(0)
