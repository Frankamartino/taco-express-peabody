"""Upload menu JPGs to Cloudinary, apply upscale + sharpen, save back locally.

Requires credentials in .env.local (see .env.example). Cloud name defaults to drwvnkshg.

  python scripts/cloudinary-enhance-menu.py
  python scripts/cloudinary-enhance-menu.py --folder menu
  python scripts/cloudinary-enhance-menu.py --dry-run

Uses e_upscale (paid Cloudinary credits) + sharpen + limit width 1400.
"""
from __future__ import annotations

import argparse
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE_ROOT = ROOT / "images"
FOLDERS = ("menu", "platters", "sides", "fryer")
ENHANCE_TRANSFORM = "e_upscale/e_sharpen/c_limit,w_1400/f_jpg/q_auto:good"


def load_dotenv_local() -> None:
    env_path = ROOT / ".env.local"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and val and key not in os.environ:
            os.environ[key] = val


def get_cloudinary():
    try:
        import cloudinary
        import cloudinary.uploader
    except ImportError:
        print("Install: pip install cloudinary")
        sys.exit(1)

    cloud = os.environ.get("CLOUDINARY_CLOUD_NAME", "drwvnkshg").strip()
    api_key = os.environ.get("CLOUDINARY_API_KEY", "").strip()
    api_secret = os.environ.get("CLOUDINARY_API_SECRET", "").strip()
    preset = os.environ.get("CLOUDINARY_UPLOAD_PRESET", "").strip()

    if not api_key or not api_secret:
        if not preset:
            print(
                "Missing Cloudinary credentials.\n"
                "Add to .env.local (copy from .env.example):\n"
                "  CLOUDINARY_CLOUD_NAME=drwvnkshg\n"
                "  CLOUDINARY_API_KEY=...\n"
                "  CLOUDINARY_API_SECRET=...\n"
                "Or set CLOUDINARY_UPLOAD_PRESET for unsigned uploads.\n"
                "Get keys: https://console.cloudinary.com/settings/api-keys"
            )
            sys.exit(1)
        cloudinary.config(cloud_name=cloud)
    else:
        cloudinary.config(cloud_name=cloud, api_key=api_key, api_secret=api_secret)

    return cloudinary, cloudinary.uploader, preset


def upload(path: Path, uploader, preset: str) -> dict:
    folder = f"taco-express-peabody/{path.parent.name}"
    opts = {
        "folder": folder,
        "public_id": path.stem,
        "overwrite": True,
        "invalidate": True,
    }
    if preset:
        opts["upload_preset"] = preset
    return uploader.upload(str(path), **opts)


def enhanced_url(cloudinary_mod, public_id: str) -> str:
    from cloudinary import CloudinaryImage

    return CloudinaryImage(public_id).build_url(transformation=ENHANCE_TRANSFORM)


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "taco-express-peabody/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Cloudinary enhance menu JPGs")
    parser.add_argument("--folder", choices=FOLDERS, help="Only one images/ subfolder")
    parser.add_argument("--dry-run", action="store_true", help="List files only")
    args = parser.parse_args()

    load_dotenv_local()
    folders = (args.folder,) if args.folder else FOLDERS
    paths: list[Path] = []
    for folder in folders:
        d = IMAGE_ROOT / folder
        if d.is_dir():
            paths.extend(sorted(d.glob("*.jpg")))

    if not paths:
        print("No JPG files found.")
        return

    print(f"Cloudinary cloud: {os.environ.get('CLOUDINARY_CLOUD_NAME', 'drwvnkshg')}")
    print(f"Transform: {ENHANCE_TRANSFORM}")
    print(f"Files: {len(paths)}")

    if args.dry_run:
        for p in paths:
            print(f"  {p.relative_to(ROOT)}")
        return

    cloudinary_mod, uploader, preset = get_cloudinary()

    for path in paths:
        rel = path.relative_to(ROOT)
        print(f"Uploading {rel}...")
        try:
            result = upload(path, uploader, preset)
            public_id = result.get("public_id") or ""
            url = enhanced_url(cloudinary_mod, public_id)
            print(f"  Fetching enhanced → {rel}")
            download(url, path)
            print(f"  OK ({path.stat().st_size:,} bytes)")
        except Exception as e:
            print(f"  FAILED {rel}: {e}")


if __name__ == "__main__":
    main()
