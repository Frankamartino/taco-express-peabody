# The Mill — three shops, one map

**58 Pulaski St, Peabody, MA 01960** — Eatery 58 / The Mill.

Open this file and you have all three. You do not need to hunt GitHub, Vercel, or Squarespace.

Taco Express and Martino Pasta Bar are the same *kind* of build (own repo, own Vercel, own voice host). Frankie Slice is the pizza shop next door on Squarespace. Same hallway. Three counters.

| | **Frankie Slice** | **Taco Express Peabody** | **Martino Pasta Bar** |
|---|---|---|---|
| **What** | Pizza | Tacos, burritos, enchiladas | Fresh pasta, Italian takeout |
| **Website** | https://www.frankieslice.com | https://www.tacoexpresspeabody.com | https://martinopastabar.com |
| **Order** | frankieslice.com (Squarespace / Toast) | This site — tap to order or talk to **Diego** | martinopastabar.com/menu — tap or talk to **Massimo** |
| **Code lives** | Squarespace. No GitHub repo. | **This repo** — `Frankamartino/taco-express-peabody` | Its **own** repo. Not this one. Vercel project `martino-bar`. |
| **Hosting** | Squarespace | Vercel `taco-express-peabody` | Vercel `martino-bar` |
| **Voice** | None on the site | Diego | Massimo |
| **Email** | hello@frankieslice.com | — | martinopastabar@gmail.com |
| **Can this repo change it?** | No | Yes — this is the only shop you can edit here | No. Open a Cursor chat on the pasta repo, or pause Vercel `martino-bar`. |

**Shared (physical, not code):**

- Same building, same hallway
- Same phone: **(978) 982-1800**
- Same Star kitchen printer / kitchen laptop at The Mill (taco tickets print with header `TACO EXPRESS`)

**Not shared:** GitHub repos, Vercel projects, Stripe keys, OpenAI keys, menus, voice hosts.

## You landed in Taco Express

This workspace is **only** Taco Express Peabody.

- A commit here deploys **tacoexpresspeabody.com**. It does not touch pasta or pizza.
- Diego is the taco host. If someone asks for Massimo: *"I'm Diego — Massimo's at the pasta bar next door."*
- Frankie Slice is pizza next door. Do not put pizza on this menu or send taco customers to edit frankieslice.com from here.

## Hours (posted on each live site)

All three post the same skeleton: **Wed–Sat 11 AM–8 PM · Sun 11 AM–6 PM · Mon–Tue closed** (US Eastern). Frankie Slice’s site also banners **Tuesdays 11 AM–3 PM**.

Taco hours in code live in `api/tacoShopHours.js`. Staff can close Taco early with `/api/shop-status` (owner name + PIN). That override does **not** close pasta or Frankie.

Pasta has no emergency-close API — it follows its own hours on `martinopastabar.com`. Frankie is Squarespace; staff turn that board off there.

## If Frank says “shut them all off”

| Shop | How |
|---|---|
| **Taco Express** | `/api/shop-status` in **this** repo (or the staff close on the taco site). |
| **Martino Pasta Bar** | Must be done in the **pasta** repo or by pausing Vercel project `martino-bar`. Editing this repo will not take pasta offline. |
| **Frankie Slice** | Squarespace / Toast on frankieslice.com. No API from here. |

## Do not mix these

- **Not** Maya, Elena, Machines and Man, or any other project.
- **Not** `martinopastabarpeabody.com` — old third-party Slice storefront, closed. Pasta’s only official site is `martinopastabar.com`.
- **Not** `pasta-bar.vercel.app` or `martino.vercel.app` — those are other people’s sites.

## Where to work

| If you need to change… | Open |
|---|---|
| Taco menu, Diego, taco hours, taco Stripe, taco close | **This repo** (`taco-express-peabody`) |
| Pasta menu, Massimo, pasta hours, pasta Stripe | The Martino Pasta Bar repo / Vercel `martino-bar` |
| Frankie pizza site, photos, Squarespace hours | https://www.frankieslice.com (Squarespace) |
