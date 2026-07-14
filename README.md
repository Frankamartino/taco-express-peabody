# Taco Express Peabody

**Separate project** — not Martino Pasta Bar.

- **Domain:** https://www.tacoexpresspeabody.com
- **Phone:** (978) 982-1800
- **Address:** 58 Pulaski St, Peabody, MA 01960
- **Ordering:** DoorDash (delivery & pickup) + phone for party platters

## Online ordering

The website is a **menu board** — items are not clickable for checkout. Customers pay through **DoorDash**.

1. Complete [DoorDash Merchant](https://get.doordash.com/) onboarding for 58 Pulaski St.
2. Copy your store URL from the DoorDash Merchant Portal.
3. Paste it into `order-config.json` as `doordashUrl` and push — all **Order on DoorDash** buttons update automatically.

Until the store is live, buttons link to a DoorDash search for Taco Express Peabody.

**Party platters** — call (978) 982-1800 (not on DoorDash menu yet).

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

## Three separate products (do not cross-bill)

| Product | Project / surface | Billing |
|--------|-------------------|---------|
| **Martino Pasta Bar** | `martino-bar` | Martino Stripe / Ara order — leave alone |
| **Taco Express Peabody (menu)** | `index.html` / DoorDash | DoorDash — not Stripe voice |
| **Taco Express Peabody Voice** | `/voice` + `/voice-signup` | **Own** Stripe keys + `TACO_VOICE_*` customer |

### Voice hands-free pay (this repo only)

1. On **taco-express-peabody** Vercel set **live** keys: `STRIPE_SECRET_KEY` (`sk_live_…`) and `STRIPE_PUBLISHABLE_KEY` (`pk_live_…`).
2. Open `/voice-signup` — recruit form: name, email, phone, then enter a **live** card on the page.
3. Order on `/voice` with the same email. When Massimo asks to charge, say **yes** (no taps). Charge looks up the card by email in Stripe.

Do **not** reuse Martino `cus_` / `pm_` / secrets on this project.
