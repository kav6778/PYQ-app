"""
Stage 2 — Layout Detection

Uses LayoutParser with a pretrained Detectron2 model to detect bounding
boxes on each page image, classifies each box as one of:

    text_block | math_block | figure | table

Then sorts the boxes into two-column reading order (left column top-to-bottom,
then right column top-to-bottom) using helpers from utils.bbox_utils.

Can be run independently:
    python -m stages.layout <image_path> [<image_path> ...]
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from PIL import Image

from utils.bbox_utils import (
    BBox,
    assign_columns,
    layoutparser_block_to_bbox,
    sort_reading_order,
)

MODEL_CONFIG = "lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config"
EXTRA_CONFIG = [
    "MODEL.ROI_HEADS.SCORE_THRESH_TEST", "0.5",
]

LABEL_MAP: dict[int, str] = {
    0: "text_block",
    1: "text_block",
    2: "figure",
    3: "table",
    4: "math_block",
}


def load_model() -> Any | None:
    """
    Load and return a LayoutParser Detectron2 layout model.

    Returns None if Detectron2 is not installed, allowing the pipeline to
    fall back to whole-page Tesseract OCR without crashing.

    Returns:
        A layoutparser.models.Detectron2LayoutModel instance, or None if
        Detectron2 is unavailable.
    """
    try:
        import layoutparser as lp  # type: ignore[import]
        model = lp.Detectron2LayoutModel(
            MODEL_CONFIG,
            extra_config=EXTRA_CONFIG,
            label_map=LABEL_MAP,
        )
        return model
    except Exception as exc:
        print(f"  WARN: Layout model unavailable ({exc}). "
              "Falling back to full-page Tesseract OCR.")
        return None


def _full_page_fallback_bbox(image: Image.Image) -> list[BBox]:
    """
    Return a single text_block BBox covering the entire image.

    Used as a fallback when the Detectron2 layout model is unavailable.

    Args:
        image: PIL Image of the full page.

    Returns:
        A list containing one BBox that spans the whole page, assigned to
        the 'left' column.
    """
    w, h = image.size
    return [BBox(box_type="text_block", x1=0, y1=0, x2=w, y2=h, column="left")]


def detect_layout(
    image: Image.Image,
    model: Any | None,
) -> list[BBox]:
    """
    Run layout detection on a single page image and return sorted BBox list.

    If model is None (Detectron2 unavailable), returns a single BBox covering
    the entire page so downstream OCR still runs via Tesseract.

    Steps (when model is available):
    1. Run the Detectron2 model on the image.
    2. Convert detected blocks to BBox objects using the LABEL_MAP.
    3. Assign each box to 'left' or 'right' column.
    4. Sort boxes in reading order: left column first, then right, each
       ordered top-to-bottom.

    Args:
        image: PIL Image of one PDF page (after header/footer crop).
        model: A pre-loaded LayoutParser layout model, or None to use
               the full-page fallback.

    Returns:
        Sorted list of BBox objects in two-column reading order.
    """
    if model is None:
        return _full_page_fallback_bbox(image)

    import layoutparser as lp  # type: ignore[import]
    import numpy as np

    image_array = np.array(image)
    layout = model.detect(image_array)

    bboxes: list[BBox] = []
    for block in layout:
        bbox = layoutparser_block_to_bbox(block, LABEL_MAP)
        bboxes.append(bbox)

    width = image.size[0]
    assign_columns(bboxes, page_width=width)
    return sort_reading_order(bboxes)


def process_page_images(
    image_paths: list[Path],
    model: Any | None = None,
) -> list[tuple[Path, list[BBox]]]:
    """
    Detect layout for a list of page image paths.

    Loads the model once if not provided, then calls detect_layout on each
    image. Exceptions on individual images are caught and logged so that a
    single bad page does not abort the pipeline.

    Args:
        image_paths: Ordered list of PNG paths output by Stage 1.
        model: Pre-loaded model, or None to load automatically.

    Returns:
        List of (image_path, bboxes) tuples in the same order as input.
    """
    if model is None:
        model = load_model()

    results: list[tuple[Path, list[BBox]]] = []
    total = len(image_paths)

    for idx, img_path in enumerate(image_paths, start=1):
        try:
            image = Image.open(img_path).convert("RGB")
            bboxes = detect_layout(image, model)
            results.append((img_path, bboxes))
            print(f"  Layout detected: page {idx}/{total} — {len(bboxes)} boxes")
        except Exception as exc:
            print(f"  ERROR on page {idx}/{total} ({img_path.name}): {exc}")
            results.append((img_path, []))

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m stages.layout <image_path> [<image_path> ...]")
        sys.exit(1)

    paths = [Path(p) for p in sys.argv[1:]]
    model = load_model()
    for img_path, boxes in process_page_images(paths, model):
        print(f"{img_path.name}: {len(boxes)} boxes detected")
        for b in boxes:
            print(f"  [{b.column}] {b.box_type} ({b.x1:.0f},{b.y1:.0f})-({b.x2:.0f},{b.y2:.0f})")
