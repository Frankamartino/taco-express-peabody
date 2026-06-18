"""Split Jarritos variety-pack image into individual bottle PNGs."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "drinks" / "jarritos-variety-pack-source.png"
OUT = ROOT / "images" / "drinks"

# Top row left → right, then bottom row (labels on pack)
FLAVORS = [
    ("jarritos-tamarind.png", "Tamarind"),
    ("jarritos-fruit-punch.png", "Fruit Punch"),
    ("jarritos-grapefruit.png", "Grapefruit"),
    ("jarritos-mango.png", "Mango"),
    ("jarritos-mandarin.png", "Mandarin"),
    ("jarritos-mexican-cola.png", "Mexican Cola"),
    ("jarritos-lime.png", "Lime"),
    ("jarritos-guava.png", "Guava"),
    ("jarritos-strawberry.png", "Strawberry"),
    ("jarritos-watermelon.png", "Watermelon"),
    ("jarritos-pina.png", "Piña"),
    ("jarritos-passion-fruit.png", "Passion Fruit"),
]

# Manual crop boxes (left, top, right, bottom) for 1024×1024 pack photo
CROP_BOXES = [
    (22, 70, 168, 456),    # Tamarind
    (158, 70, 308, 456),   # Fruit Punch
    (298, 70, 448, 456),   # Grapefruit
    (438, 70, 588, 456),   # Mango
    (578, 70, 698, 456),   # Mandarin
    (688, 70, 912, 456),   # Mexican Cola
    (8, 462, 188, 962),    # Lime
    (178, 462, 308, 962),  # Guava
    (298, 462, 428, 962),  # Strawberry
    (418, 462, 548, 962),  # Watermelon
    (538, 462, 648, 962),  # Piña
    (638, 462, 768, 962),  # Passion Fruit
]


def crop_bottle(im: Image.Image, index: int) -> Image.Image:
    return im.crop(CROP_BOXES[index])


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source image: {SRC}")
    im = Image.open(SRC).convert("RGBA")
    for i, (filename, label) in enumerate(FLAVORS):
        bottle = crop_bottle(im, i)
        out_path = OUT / filename
        bottle.save(out_path, format="PNG", optimize=True)
        print(f"{filename} ({label}) -> {bottle.size}")


if __name__ == "__main__":
    main()
