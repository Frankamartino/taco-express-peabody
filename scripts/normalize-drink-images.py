"""Normalize drink PNGs to uniform portrait canvases."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

DRINKS_DIR = Path(__file__).resolve().parent.parent / "images" / "drinks"
TARGET_W = 320
TARGET_H = 480
BG = (255, 255, 255, 0)  # transparent — site uses dark card background


def trim_whitespace(im: Image.Image) -> Image.Image:
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        return im.crop(bbox)
    # Fallback: trim near-white pixels
    rgb = im.convert("RGB")
    inverted = Image.eval(rgb.convert("L"), lambda p: 255 if p > 245 else 0)
    bbox = inverted.getbbox()
    return im.crop(bbox) if bbox else im


def fit_portrait(im: Image.Image) -> Image.Image:
    im = trim_whitespace(im)
    if im.mode != "RGBA":
        im = im.convert("RGBA")

    max_w = int(TARGET_W * 0.82)
    max_h = int(TARGET_H * 0.88)
    im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), BG)
    x = (TARGET_W - im.width) // 2
    y = (TARGET_H - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def main() -> None:
    for path in sorted(DRINKS_DIR.glob("*.png")):
        out = fit_portrait(Image.open(path))
        out.save(path, format="PNG", optimize=True)
        print(f"normalized {path.name} -> {out.size}")


if __name__ == "__main__":
    main()
