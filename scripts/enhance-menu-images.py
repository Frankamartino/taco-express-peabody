"""Upscale and sharpen menu JPGs for sharper cards on the site.

Run from repo root:
  python scripts/enhance-menu-images.py

For Cloudinary paid upscale (if configured), upload then fetch with:
  e_upscale or generative restore — see Cloudinary console.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent / "images"
TARGET_W = 1200
FOLDERS = ("menu", "platters", "sides", "fryer")


def enhance(path: Path) -> None:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    if w < TARGET_W:
        scale = TARGET_W / w
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = ImageEnhance.Sharpness(im).enhance(1.15)
    im.save(path, "JPEG", quality=92, optimize=True)
    print(f"{path.relative_to(ROOT.parent)} -> {im.size}")


def main() -> None:
    for folder in FOLDERS:
        d = ROOT / folder
        if not d.is_dir():
            continue
        for path in sorted(d.glob("*.jpg")):
            enhance(path)


if __name__ == "__main__":
    main()
