"""
Stage 2 — Column Divider Detection

Finds the vertical gap between two text columns by analysing ink density
along each column of pixels.  No ML model required.

Algorithm
---------
1. Convert the page image to grayscale and invert (ink → bright).
2. Sum inverted pixel values along each column (vertical axis) to get
   an "ink density" profile across the page width.
3. Smooth the profile with a small sliding window.
4. Inside the central search band (default 25 %–75 % of page width),
   find the x position with the *minimum* ink density.
5. If that minimum is at least ``gap_ratio`` lower than the mean density
   in the search band, treat it as the column divider and return two
   BBox objects (left half, right half).
6. Otherwise (single-column page or narrow margin) return one BBox that
   spans the full page.

Can be run independently:
    python -m stages.layout <image_path> [<image_path> ...]
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from utils.bbox_utils import BBox

# Fraction of page width to search for the divider (centre band).
SEARCH_LO: float = 0.25
SEARCH_HI: float = 0.75

# The minimum ink-density at the gap candidate must be this fraction
# below the mean density inside the search band to be accepted.
GAP_RATIO: float = 0.55

# Smoothing window as a fraction of page width (≥ 1 px).
SMOOTH_FRAC: float = 0.01


# ── public API (kept identical to the old layout.py so main.py / ocr.py
#                need zero changes) ─────────────────────────────────────


def load_model() -> Any | None:
    """
    No-op stub kept for API compatibility with the old LayoutParser version.
    Always returns None; detect_layout handles None gracefully.
    """
    return None


def find_column_split(
    image: Image.Image,
    search_lo: float = SEARCH_LO,
    search_hi: float = SEARCH_HI,
    gap_ratio: float = GAP_RATIO,
) -> int | None:
    """
    Return the x-coordinate of the vertical column divider, or None.

    Args:
        image:      PIL Image of the page (RGB or L).
        search_lo:  Left edge of the search band as a fraction of page width.
        search_hi:  Right edge of the search band as a fraction of page width.
        gap_ratio:  Accept the gap only if its ink density is ≤ gap_ratio×mean.

    Returns:
        Integer x pixel coordinate of the divider, or None if no clear gap.
    """
    gray = np.array(image.convert("L"), dtype=np.float32)
    # Invert so ink → high value, white → 0
    ink = 255.0 - gray

    # Sum along rows to get a 1-D ink-density profile (one value per column)
    col_density = ink.sum(axis=0)

    w = col_density.shape[0]
    lo = max(0, int(w * search_lo))
    hi = min(w, int(w * search_hi))
    if hi <= lo:
        return None

    # Smooth with a sliding-average window
    win = max(1, int(w * SMOOTH_FRAC))
    kernel = np.ones(win, dtype=np.float32) / win
    smoothed = np.convolve(col_density, kernel, mode="same")

    region = smoothed[lo:hi]
    region_mean = float(region.mean())
    if region_mean == 0:
        return None

    min_offset = int(region.argmin())
    min_val = float(region[min_offset])

    if min_val <= region_mean * gap_ratio:
        return lo + min_offset

    return None


def detect_layout(
    image: Image.Image,
    model: Any | None = None,  # ignored — kept for API compatibility
) -> list[BBox]:
    """
    Return a list of BBox objects for the page using column-split detection.

    If a clear vertical gap is found, returns two BBoxes (left, right).
    Otherwise returns a single BBox spanning the full page.

    Args:
        image:  PIL Image of the page.
        model:  Ignored (kept for compatibility with old call-sites).

    Returns:
        List of BBox objects in left-to-right reading order.
    """
    w, h = image.size
    split_x = find_column_split(image)

    if split_x is not None:
        print(f"    Column divider detected at x={split_x} / {w} "
              f"({split_x / w * 100:.1f} % from left)")
        return [
            BBox(box_type="text_block", x1=0,       y1=0, x2=split_x, y2=h, column="left"),
            BBox(box_type="text_block", x1=split_x, y1=0, x2=w,       y2=h, column="right"),
        ]

    print("    No column divider found — treating as single column")
    return [BBox(box_type="text_block", x1=0, y1=0, x2=w, y2=h, column="left")]


def process_page_images(
    image_paths: list[Path],
    model: Any | None = None,
) -> list[tuple[Path, list[BBox]]]:
    """
    Detect layout for a list of page image paths.

    Args:
        image_paths: Ordered list of PNG paths output by Stage 1.
        model:       Ignored (kept for API compatibility).

    Returns:
        List of (image_path, bboxes) tuples in the same order as input.
    """
    results: list[tuple[Path, list[BBox]]] = []
    total = len(image_paths)

    for idx, img_path in enumerate(image_paths, start=1):
        try:
            image = Image.open(img_path).convert("RGB")
            bboxes = detect_layout(image, model)
            results.append((img_path, bboxes))
            print(f"  Layout detected: page {idx}/{total} — {len(bboxes)} column(s)")
        except Exception as exc:
            print(f"  ERROR on page {idx}/{total} ({img_path.name}): {exc}")
            results.append((img_path, []))

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m stages.layout <image_path> [<image_path> ...]")
        sys.exit(1)

    paths = [Path(p) for p in sys.argv[1:]]
    for img_path, boxes in process_page_images(paths):
        print(f"\n{img_path.name}: {len(boxes)} region(s)")
        for b in boxes:
            print(f"  [{b.column}] {b.box_type} "
                  f"({b.x1:.0f},{b.y1:.0f})–({b.x2:.0f},{b.y2:.0f})")
