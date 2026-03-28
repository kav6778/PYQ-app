#!/usr/bin/env python3
"""
Quick OCR debug on a single page image.
Prints the raw Tesseract output without running the full pipeline.
Useful for tuning lang, PSM mode, or image preprocessing.

Usage:
    python project/debug_ocr.py --page 3
    python project/debug_ocr.py --page 3 --lang eng
    python project/debug_ocr.py --page 3 --psm 3
    python project/debug_ocr.py --page 3 --lang eng+hin --psm 6
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).parent
PAGES_DIR = ROOT / "output" / "pages"

try:
    import pytesseract
    from PIL import Image
except ImportError:
    print("pytesseract and Pillow must be installed.")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Debug OCR on a single page")
    parser.add_argument("--page", type=int, default=1, help="Page number to debug (default: 1)")
    parser.add_argument("--lang", default="eng+hin", help="Tesseract language(s) e.g. eng, eng+hin, hin (default: eng+hin)")
    parser.add_argument("--psm", type=int, default=6, help="Tesseract PSM mode (default: 6)")
    parser.add_argument("--crop", default=None, help="Optional crop: x1,y1,x2,y2 (pixels) e.g. 0,100,800,400")
    parser.add_argument("--list-langs", action="store_true", help="Show installed Tesseract language packs")
    parser.add_argument("--list-pages", action="store_true", help="List available page images")
    args = parser.parse_args()

    if args.list_langs:
        import subprocess
        result = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True)
        print(result.stdout or result.stderr)
        return

    pages = sorted(PAGES_DIR.glob("*_page_*.png"))
    if args.list_pages:
        for p in pages:
            print(p.name)
        return

    if not pages:
        print(f"No page images found in {PAGES_DIR}")
        print("Run the PDF render stage first: python project/main.py <pdf>")
        sys.exit(1)

    # Find the page by number
    target = None
    for p in pages:
        stem = p.stem
        parts = stem.rsplit("_page_", 1)
        if len(parts) == 2 and int(parts[1]) == args.page:
            target = p
            break

    if target is None:
        print(f"Page {args.page} not found. Available pages: 1–{len(pages)}")
        sys.exit(1)

    print(f"File  : {target.name}")
    print(f"Lang  : {args.lang}")
    print(f"PSM   : {args.psm}")
    print("-" * 60)

    img = Image.open(target)
    print(f"Size  : {img.width}×{img.height} px")

    if args.crop:
        x1, y1, x2, y2 = map(int, args.crop.split(","))
        img = img.crop((x1, y1, x2, y2))
        print(f"Crop  : ({x1},{y1}) → ({x2},{y2}), size {img.width}×{img.height}")

    print("-" * 60)

    config = f"--psm {args.psm}"
    text = pytesseract.image_to_string(img, lang=args.lang, config=config)

    print(text)
    print("-" * 60)
    print(f"[{len(text.split(chr(10)))} lines, {len(text)} chars]")


if __name__ == "__main__":
    main()
