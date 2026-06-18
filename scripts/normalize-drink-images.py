"""Normalize drink PNGs — tight crop, product fills portrait frame."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance

DRINKS_DIR = Path(__file__).resolve().parent.parent / "images" / "drinks"
TARGET_W = 480
TARGET_H = 720
FILL = 0.96  # default product uses 96% of canvas height
BG = (255, 255, 255, 255)

# Skinny glass bottles (Jarritos, Mexican Coke) need extra zoom vs cans
NARROW_ASPECT = 0.48  # width / height after trim
MIN_WIDTH_FRACTION = 0.54  # zoom until bottle ~54% of card width
TRIM_THRESHOLD = 12


def trim_whitespace(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    rgb = rgba.convert("RGB")
    bg = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, bg)
    gray = diff.convert("L")
    mask = gray.point(lambda p: 255 if p > TRIM_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    return rgba


def enhance(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    rgb = rgba.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.22)
    rgba.paste(rgb, mask=rgba.split()[3])
    return rgba


def center_crop(im: Image.Image, w: int, h: int) -> Image.Image:
    if im.width <= w and im.height <= h:
        return im
    left = max(0, (im.width - w) // 2)
    top = max(0, (im.height - h) // 2)
    return im.crop((left, top, left + w, top + h))


def fit_portrait(im: Image.Image) -> Image.Image:
    im = trim_whitespace(im)
    max_w = int(TARGET_W * FILL)
    max_h = int(TARGET_H * FILL)
    aspect = im.width / im.height

    if aspect < NARROW_ASPECT:
        # Zoom narrow bottles so they read closer to can size on the menu
        target_w = int(TARGET_W * MIN_WIDTH_FRACTION)
        scale = target_w / im.width
        new_w = max(1, int(im.width * scale))
        new_h = max(1, int(im.height * scale))
        im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        im = center_crop(im, TARGET_W, TARGET_H)
    else:
        scale = min(max_w / im.width, max_h / im.height)
        new_w = max(1, int(im.width * scale))
        new_h = max(1, int(im.height * scale))
        im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

    im = enhance(im)

    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), BG)
    x = (TARGET_W - im.width) // 2
    y = (TARGET_H - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


SKIP_PREFIXES = ("jarritos-variety-pack",)


def main() -> None:
    for path in sorted(DRINKS_DIR.glob("*.png")):
        if any(path.name.startswith(p) for p in SKIP_PREFIXES):
            continue
        out = fit_portrait(Image.open(path))
        out.save(path, format="PNG", optimize=True)
        print(f"{path.name}: {out.size}")


if __name__ == "__main__":
    main()
