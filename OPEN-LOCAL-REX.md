# Taco Express Peabody — local photo install (Rex)

**This project only.** Not Martino Pasta Bar.

## Quick status

Open `drop-photos.html` in a browser (or run `npx serve .` and visit `/drop-photos.html`) to see which food photos are installed.

## Expected filenames

| File | Menu item |
|------|-----------|
| `images/menu/tacos-beef.jpg` | Three Tacos · Shredded Beef |
| `images/menu/tacos-chicken.jpg` | Three Tacos · Shredded Chicken |
| `images/menu/tacos-shrimp.jpg` | Three Tacos · Grilled Shrimp |
| `images/menu/burrito-beef.jpg` | Burrito · Shredded Beef |
| `images/menu/burrito-chicken.jpg` | Burrito · Shredded Chicken |
| `images/menu/burrito-shrimp.jpg` | Burrito · Grilled Shrimp |
| `images/menu/enchiladas-beef.jpg` | Two Enchiladas · Shredded Beef |
| `images/menu/enchiladas-chicken.jpg` | Two Enchiladas · Shredded Chicken |
| `images/platters/platter.jpg` | Party platter hero card |

**No photo** for shrimp enchiladas — gray placeholder stays on the menu.

Drinks are already in `images/drinks/`.

Hero video: add `videos/hero.mp4` when ready. The site hides the hero video until that file exists.

## Install one photo from `taco-express-photos.zip`

Zip path (default): `%USERPROFILE%\Downloads\taco-express-photos.zip`

```powershell
$zip = "$env:USERPROFILE\Downloads\taco-express-photos.zip"
$dest = "C:\Users\Frank\taco-express-peabody"
$tmp  = "$env:TEMP\taco-express-photos-extract"

# Example: shredded beef tacos
Expand-Archive -Path $zip -DestinationPath $tmp -Force
Copy-Item "$tmp\images\menu\tacos-beef.jpg" "$dest\images\menu\tacos-beef.jpg" -Force
```

Swap the last line’s filename for each item. `index.html` auto-loads photos when the file is present — no HTML edit needed.

## Preview

```powershell
cd C:\Users\Frank\taco-express-peabody
npx --yes serve .
```

Open http://localhost:3000 — beef tacos should show a photo; missing files keep the gray placeholder.

## Deploy

Push to GitHub → Vercel project `taco-express-peabody` (never Martino).

## Cloudinary photo enhance (paid)

Cloud name: **`drwvnkshg`**

1. Copy `.env.example` → `.env.local` and add API key + secret from [Cloudinary console](https://console.cloudinary.com/settings/api-keys) (or an unsigned upload preset).
2. Run:
   ```powershell
   cd C:\Users\Frank\taco-express-peabody
   python scripts\cloudinary-enhance-menu.py
   ```
3. Refresh local preview — tacos/burritos get `e_upscale` + sharpen via Cloudinary credits.

Local-only fallback (no Cloudinary): `python scripts\enhance-menu-images.py`
