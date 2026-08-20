# Taco Express Peabody

GitHub repo: **[Frankamartino/taco-express-peabody](https://github.com/Frankamartino/taco-express-peabody)**  
This is the Taco Express Peabody site only — own repo, own Vercel project, own Stripe keys for `/voice`.

- **Domain:** https://www.tacoexpresspeabody.com
- **Phone:** (978) 982-1800
- **Address:** 58 Pulaski St, Peabody, MA 01960
- **Ordering:** DoorDash (delivery & pickup) + Massimo voice (`/voice`) + phone

## Online ordering

The website is a **menu board** — items are not clickable for checkout. Customers pay through **DoorDash**.

1. Complete [DoorDash Merchant](https://get.doordash.com/) onboarding for 58 Pulaski St.
2. Copy your store URL from the DoorDash Merchant Portal.
3. Paste it into `order-config.json` as `orderOnlineUrl` (or `doordashUrl`) and push — all **DoorDash** buttons update automatically.

Until the store is live, buttons link to a DoorDash search for Taco Express Peabody.

## Preview locally

Double-click `index.html` or:

```powershell
cd C:\Users\Frank\taco-express-peabody
npx --yes serve .
```

Then open http://localhost:3000

## Drink photos

Drop PNG product shots into `images/drinks/` — see `images/drinks/README.txt` for filenames.

## Deploy to Vercel

1. Import GitHub repo `taco-express-peabody` as its **own** Vercel project (do not attach this folder to another restaurant).
2. Framework: **Other** (static HTML)
3. Add domain `tacoexpresspeabody.com` in Vercel when DNS is ready

## One Taco Express site (two order paths)

Same domain / repo: **menu + photos** (`/`) and **Massimo voice** (`/voice`, `/voice-signup`).

| Surface | Job | Billing |
|--------|-----|---------|
| **`/`** | Menu board, photos, DoorDash | DoorDash |
| **`/voice`** | Talk to Massimo, ticket, cash or saved card | Stripe on **this** Vercel project |

Header / Order section / footer on the photo site link to `/voice`.

Canonical voice menu lives in `api/tacoMenu.js` (Massimo + supervisor). Keep it matched to DoorDash.

### Voice hands-free pay (this repo only)

1. On the **taco-express-peabody** Vercel project set **live** keys: `STRIPE_SECRET_KEY` (`sk_live_…`) and `STRIPE_PUBLISHABLE_KEY` (`pk_live_…`).
2. Open `/voice-signup` — name, email, phone, then enter a **live** card on the page.
3. Order on `/voice` with the same email. When Massimo asks to charge, say **yes** (no taps). Charge looks up the card by email in Stripe.

Do **not** reuse another restaurant’s `cus_` / `pm_` / secrets on this project.
