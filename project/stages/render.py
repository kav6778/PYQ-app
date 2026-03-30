"""
Stage 1 — Render

Converts each page of an input PDF to a PNG image at 300 DPI, strips
headers and footers by cropping the top 8% and bottom 6% of each page,
and saves the results to /output/pages/.

Can be run independently:
    python -m stages.render <pdf_path>
"""

from __future__ import annotations

import sys
from pathlib import Path

from pdf2image import convert_from_path
from PIL import Image

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output" / "pages"
DPI = 300
HEADER_CROP_FRACTION = 0.08
FOOTER_CROP_FRACTION = 0.06


def render_pdf_to_images(
    pdf_path: str | Path,
    output_dir: str | Path = OUTPUT_DIR,
    dpi: int = DPI,
) -> list[Path]:
    """
    Convert every page of a PDF to a cropped PNG image and save to disk.

    For each page the function:
    1. Renders at `dpi` dots-per-inch.
    2. Crops the top ``HEADER_CROP_FRACTION`` and bottom
       ``FOOTER_CROP_FRACTION`` fractions of the image.
    3. Saves the result as ``<pdf_stem>_page_<N>.png`` inside `output_dir`.

    Args:
        pdf_path: Path to the input PDF file.
        output_dir: Directory where page PNGs are saved.
        dpi: Resolution to render pages at (default 300).

    Returns:
        List of Paths to the saved PNG files, in page order.

    Raises:
        FileNotFoundError: If pdf_path does not exist.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Rendering '{pdf_path.name}' at {dpi} DPI …")
    pages: list[Image.Image] = convert_from_path(str(pdf_path), dpi=dpi)
    total = len(pages)

    saved_paths: list[Path] = []
    for idx, page_img in enumerate(pages, start=1):
        width, height = page_img.size
        top_crop = int(height * HEADER_CROP_FRACTION)
        bottom_crop = int(height * (1 - FOOTER_CROP_FRACTION))
        cropped = page_img.crop((0, top_crop, width, bottom_crop))

        out_name = f"{pdf_path.stem}_page_{idx:04d}.png"
        out_path = output_dir / out_name
        cropped.save(str(out_path), format="PNG")
        saved_paths.append(out_path)
        print(f"  Saved page {idx}/{total} → {out_path.name}")

    print(f"Render complete. {total} page(s) saved to '{output_dir}'.")
    return saved_paths


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m stages.render <pdf_path>")
        sys.exit(1)
    render_pdf_to_images(sys.argv[1])
