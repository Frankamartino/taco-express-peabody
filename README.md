# Taco Express Peabody

**Separate project** — not Martino Pasta Bar.

- **Domain:** https://tacoexpresspeabody.com
- **Phone:** (978) 982-1800
- **Address:** 58 Pulaski St, Peabody, MA 01960
- **Ordering:** Call to order only (no voice agent, no online checkout yet)

## Preview locally

Double-click `index.html` or:

```powershell
cd C:\Users\Frank\taco-express-peabody
npx --yes serve .
```

Then open http://localhost:3000

## Drink photos

Drop PNG product shots into `images/drinks/` — see `images/drinks/README.txt` for filenames.

## Deploy to Vercel (new project only)

1. Create GitHub repo `taco-express-peabody` (do **not** use `martino-bar`)
2. Push this folder
3. Vercel → **Add New → Project** → import `taco-express-peabody`
4. Framework: **Other** (static HTML)
5. Add domain `tacoexpresspeabody.com` in Vercel when DNS is ready

**Never** deploy this on the Martino Vercel project (`martino-bar`).
