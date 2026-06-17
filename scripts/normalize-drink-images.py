"""Normalize drink PNGs — tight crop, product fills portrait frame."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops

DRINKS_DIR = Path(__file__).resolve().parent.parent / "images" / "drinks"
TARGET_W = 480
TARGET_H = 720
FILL = 0.94  # product uses 94% of the shorter canvas edge
BG = (255, 255, 255, 255)


def trim_whitespace(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    rgb = rgba.convert("RGB")
    # Trim near-white background
    bg = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, bg)
    gray = diff.convert("L")
    # Ignore faint compression noise
    mask = gray.point(lambda p: 255 if p > 18 else 0)
    bbox = mask.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    return rgba


def fit_portrait(im: Image.Image) -> Image.Image:
    im = trim_whitespace(im)
    max_w = int(TARGET_W * FILL)
    max_h = int(TARGET_H * FILL)

    # Scale up so product fills portrait frame (not shrink with padding)
    scale = min(max_w / im.width, max_h / im.height)
    new_w = max(1, int(im.width * scale))
    new_h = max(1, int(im.height * scale))
    im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), BG)
    x = (TARGET_W - im.width) // 2
    y = (TARGET_H - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def main() -> None:
    for path in sorted(DRINKS_DIR.glob("*.png")):
        out = fit_portrait(Image.open(path))
        out.save(path, format="PNG", optimize=True)
        print(f"{path.name}: {out.size}")


if __name__ == "__main__":
    main()
