# Taco Express Peabody — The New Build (August 27, 2026)

**One restaurant. One repo. One address.**

Rex: this Cursor home is **Taco Express only**. Read [`AGENTS.md`](AGENTS.md) before touching anything else.

| Cursor home | Site | Work here? |
|---|---|---|
| **Taco Express Peabody** | tacoexpresspeabody.com | **Yes — this repo** |
| Machines and Man | machinesandman.com | No. Own GitHub + own Cursor environment. Ara. |
| Martino Pasta Bar | martinopastabar.com | No. Own GitHub + own Cursor environment. Massimo. |

| | |
|---|---|
| **Website** | https://www.tacoexpresspeabody.com |
| **GitHub** | [Frankamartino/taco-express-peabody](https://github.com/Frankamartino/taco-express-peabody) |
| **Hosting** | Vercel project `taco-express-peabody` (its own project, its own keys) |
| **Address** | 58 Pulaski St, Peabody, MA 01960 — inside The Mill (Eatery 58) |
| **Phone** | (978) 982-1800 |
| **Hours** | Wed–Sat 11 AM–8 PM · Sun 11 AM–6 PM · Mon–Tue closed |

## Its own entity

This repository is **standalone**. It is not a fork and shares no code, keys, or
accounts with anything else:

- **Not** Martino Pasta Bar (`martinopastabar.com` lives in its own repo)
- **Not** Frankie's Slice
- **Not** Maya or any other project

The **only** shared thing is physical: kitchen tickets print on the same Star
thermal printer / kitchen laptop at The Mill that Martino uses. Confirmed live
on Aug 27 — Leo watched a voice cash order hit the printer in about half a
second.

Stripe keys, the OpenAI key for Diego, and Supabase printer credentials are set
on **this** Vercel project only. Never copy another restaurant's secrets here,
and never copy these anywhere else.

## How a customer orders

Everything happens at **one address** — the home page. The URL never changes
while ordering, so a refresh always lands back on the front page.

1. **Tap to order** — Add buttons on the menu fill the cart. Checkout opens as
   a panel over the menu. Pay by card (Stripe) or choose cash at the counter.
2. **Talk to Diego** — the voice host. One button, one call, start to finish:
   he takes the order, opens the checkout panel *while staying on the line*,
   fills in name/email/phone and chef notes, sets the tip, and takes cash or
   the saved card. The call never drops at checkout.
3. **Phone** — (978) 982-1800.

Third-party apps (DoorDash / Uber Eats / Grubhub) are **off**.

## The rules this build enforces (in code, not just prompts)

**One unbroken call.** Going to checkout never reloads the page. Checkout is a
panel on top of the menu, so Diego's live WebRTC call survives it. "Oops, add a
Coke" drops the panel and he keeps talking.

**Closed means closed — everywhere.**
- Diego says it in his *first breath* when the shop is closed, with when it
  opens next ("we open tomorrow at 11 AM").
- While closed, **no money moves and no tickets print**: Diego's `set_payment`
  and `confirm_and_pay` refuse, and the server refuses too —
  `queue-kitchen-ticket`, `create-checkout`, and `charge-order` all return
  `409 shop_closed`. This covers the website as well as the voice line.
- The staff early-close override (`/api/shop-status`) counts as closed.
- **Testing after hours is refused by design.** To watch a ticket print, test
  during open hours.

**Nobody gets hung up on.** No hangup timers on a clock. A paid or cash-queued
order ends the call only after Diego's actual goodbye or the customer's
thanks/bye — and if the customer keeps talking, the goodbye is cancelled.
Asking "what time do you close?" can never end the call mid-answer.

**No personal data in the address bar.** Name, email, and phone travel in
browser storage, never in the URL. Old links that still carry them are wiped on
arrival and deliberately ignored, so a shared link can't fill in someone else's
details.

**Refresh = clean slate.** A refresh empties the cart back to zero (before
anything renders) and drops that order's chef note. The returning-guest
contact stays remembered. Opening the checkout panel or coming back from a
cancelled Stripe payment is *not* a refresh — the cart survives those.

**Money is guarded.** `confirm_and_pay` and `set_payment` refuse until last
name, email, and phone are on the ticket, and the kitchen API double-checks
server-side. Chef notes live in session storage only, so one order's allergy
note can never reattach to a later order. Diego answering the allergy question
with "none" is not printed on the ticket.

## The map — what every file does

### Pages

| File | What it is |
|---|---|
| `index.html` | The whole show: menu board, cart, Diego host, and the checkout panel (`#checkoutOverlay`). |
| `checkout.html` | The checkout form. Loaded inside the panel (`?embed=1`). Visited directly, it bounces home and reopens as the panel. |
| `voice.html` | Diego's engine: WebRTC to OpenAI Realtime, the ticket, all his tools. Runs hidden in an iframe. |
| `voice-signup.html` | One-time card save for hands-free voice pay. |
| `order.html` / `order-success.html` | Order landing / receipt page. |
| `menu-print.html` / `menu-descriptions.html` | Printable menu, menu copy. |
| `drop-photos.html` | Photo install status board (see `OPEN-LOCAL-REX.md`). |

### Shared scripts

| File | What it does |
|---|---|
| `js/taco-cart.js` | The cart (`tacoExpressCartV1` in localStorage). Steppers, cart bar, refresh-clears-cart, panel sync. |
| `js/menu-catalog-data.js` | The menu catalog the cart builds from. |
| `js/taco-sold-out.js` | Sold-out badges, live from the server. |
| `css/taco-cart.css` | Cart bar styling. |

### API (Vercel functions)

| File | What it does |
|---|---|
| `api/realtime-token.js` | Mints Diego's OpenAI session: voice, greeting, tools, menu truth, known guests. |
| `api/tacoShopHours.js` | The hours brain: `getTacoShopStatus()`, `shopClosedCheck()`, `nextOpenPhrase()`. |
| `api/queue-kitchen-ticket.js` | Cash tickets → kitchen printer. Refuses while closed. |
| `api/create-checkout.js` | Stripe hosted checkout for card orders. Refuses while closed. |
| `api/charge-order.js` | Hands-free saved-card charge (voice). Refuses while closed. Prints on success. |
| `api/kitchenPrint.js` | The printer queue (Supabase → Star printer at The Mill). |
| `api/checkout-status.js` | Confirms a Stripe session after payment; queues the ticket. |
| `api/shop-status.js` + `api/shopStatusStore.js` | Staff emergency close / reopen (owner name + PIN). |
| `api/sold-out.js` + `api/soldOutStore.js` | Staff sold-out flags. |
| `api/setup-card*.js`, `api/setup-intent*.js` | Voice-pay card saving (Stripe SetupIntents). |
| `api/menuCatalog.js`, `api/tacoMenu.js`, `api/menu-catalog.js` | Menu data for server + Diego. |
| `api/supervisor.js`, `api/vision.js`, `api/web-search.js`, `api/mem0*.js` | Diego's helpers: hard questions, screen look, search, guest memory. |

### Env vars (names only — values live in Vercel on this project)

`OPENAI_API_KEY` · `OPENAI_REALTIME_MODEL` · `OPENAI_SUPERVISOR_MODEL` ·
`STRIPE_SECRET_KEY` · `STRIPE_PUBLISHABLE_KEY` · `SUPABASE_URL` ·
`SUPABASE_SERVICE_ROLE_KEY` · `TACO_VOICE_EMAIL_ALLOWLIST` · `MEM0_API_KEY`
(optional) · Cloudinary keys for photo work (see `.env.example`).

## Working on it

```powershell
cd C:\Users\Frank\taco-express-peabody
npx --yes serve .
# open http://localhost:3000
```

Static site — no build step. Push to `main` on GitHub and Vercel deploys
`tacoexpresspeabody.com` automatically, usually within a minute.

- Photos: `OPEN-LOCAL-REX.md` (menu photo install), `PHOTO-SHOOT.md`.
- Voice pay setup: enter a live card once at `/voice-signup`, then Diego can
  charge it by email with a spoken yes.
- Kitchen printer: same Supabase queue as Martino; header reads TACO EXPRESS.

## What went into the new build (Aug 27, 2026)

The site broke on Aug 27 when a checkout page handoff was bolted onto Diego —
every trip to checkout destroyed the page and killed his call mid-sentence.
The new build fixed it the way the Aug 24 version and Martino Pasta Bar work:
the page never changes, so the call never breaks.

Shipped, in order ([PR #3](https://github.com/Frankamartino/taco-express-peabody/pull/3),
[PR #4](https://github.com/Frankamartino/taco-express-peabody/pull/4)):

1. Fixed the checkout crash (`ReferenceError` that killed Diego's resume and
   the pre-filled pickup details).
2. Chef notes ("mild") and the tip now carry through to checkout; the tip
   drives the real tip picker and both pay buttons.
3. Checkout became a panel over the menu — one unbroken call, verified on
   production with a live OpenAI session: 400 audio packets kept flowing after
   tapping Checkout mid-call.
4. Took the guest's name/email/phone out of the URL; old links get scrubbed.
5. One address: `/checkout` bounces home, refresh always lands on the front
   page.
6. Refresh clears the cart to zero.
7. Kept the checkout header's Diego button (it drives the one live call) and
   the "Oops! Forgot something · Menu" button — UI untouched.
8. Diego announces closed hours up front; closed blocks tickets and charges
   everywhere; killed the 14-second auto-hangup that cut customers off.

Kitchen print confirmed same day: voice cash order → thermal printer at The
Mill in ~half a second (Frank + Leo, 8:34 PM).
