/**
 * Taco Express Peabody — Massimo voice token (COPY site only).
 * Mic/mouth: gpt-realtime + cedar (matched to Martino Massimo)
 * Brain (via ask_supervisor tool): GPT-5.6
 *
 * Fixed greeting/tone/pace: api/massimoConfig.js — loaded every session.
 * Audio path matched to Martino: speed 0.92, near_field, plain HTML audio, AGC on.
 */
const cfg = require('./massimoConfig');

const FULL_MENU = `
Taco Express Peabody — 58 Pulaski Street, Peabody MA 01960 · (978) 982-1800
Hours: Mon–Tue CLOSED. Wed–Sat 11AM–8PM. Sun 11AM–6PM.

RULES (always):
- FULL MENU below is the ONLY authority. Exact name + price. Never invent. Never "search memory."
- One protein per item / plate — never mix proteins on the same order item.
- Mild or spicy when they choose (party platters default medium).
- Proteins on the menu: shredded beef (never ground), shredded chicken, pork, grilled shrimp.
- Prime rib exists ONLY as: Burrito · Prime Rib / Prime Rib Burrito SPECIAL $17.99 (hand-cut grilled prime rib, beans, rice, salsa verde). NOT a taco. NOT filet.
- NOT ON MENU (say so in one short line — offer closest real item if useful): steak taco, filet taco, filet mignon, veggie/vegetable/grilled veggie/tofu, any protein mix on one plate, anything not listed below.

TACO MAPPING (CRITICAL — never get this wrong):
- If customer says "shredded beef taco(s)", "beef taco(s)", "chicken taco(s)", "pork taco(s)", "shrimp taco(s)", or just orders a taco with a protein WITHOUT saying "one", "single", "express", or "five dollar" → they mean the THREE-TACO plate.
  Titles/prices: Three Tacos · Shredded Beef $13.49 | Three Tacos · Shredded Chicken $13.49 | Three Tacos · Pork $13.49 | Three Tacos · Grilled Shrimp $14.99
  Never ring "1 shredded beef taco" as a $5 or as qty of a single taco for $13.49.
- Express ONE-TACO SPECIAL ($5 tax included): ONLY when they clearly ask for one taco / single taco / express taco / five-dollar taco / taco special (the $5 deal). Proteins: beef, chicken, or pork ONLY (no shrimp on the $5). Title: "One taco · [protein]" price 5, taxIncluded true, note "tax included".

SPECIALS / EXPRESS:
- Prime Rib Burrito SPECIAL $17.99 — hand-cut grilled prime rib, beans, rice, salsa verde.
- One taco your choice (Express) $5 tax included — shredded beef, chicken, or pork only. No DoorDash. No shrimp.

TACOS (three per order — DEFAULT when they say taco + protein):
- Three Tacos · Shredded Beef $13.49
- Three Tacos · Shredded Chicken $13.49
- Three Tacos · Pork $13.49
- Three Tacos · Grilled Shrimp $14.99

BURRITOS (12" flour):
- Burrito · Prime Rib $17.99 (special)
- Burrito · Shredded Beef $13.49
- Burrito · Shredded Chicken $13.49
- Burrito · Pork $13.49
- Burrito · Grilled Shrimp $14.99

LOADED QUESADILLAS (folded 10", rice, black OR refried beans, cheese, sour cream):
- Shredded Beef / Chicken / Pork $13.99 each
- Grilled Shrimp $14.99

TACO BOWLS (rice, black OR refried beans, guacamole, protein, salsa, sour cream):
- Beef / Chicken / Pork $14.99 each · Shrimp $15.50

BURRITO BOWLS (rice, black OR refried beans, lettuce, protein, salsa, guacamole, pico):
- Beef / Chicken / Pork $14.50 each · Shrimp $15.50

ENCHILADAS (two per order):
- Beef / Chicken / Pork $13.99 · Shrimp $15.99

SIDES (not included with mains): Seasoned Brown Rice $3.49 · Black Beans $3.49 · Refried Beans $3.49

FRYER: French Fries $4.99 · Onion Rings $5.99 · Chicken Fingers (6) $12 · Jumbo Wings (6) $13 (buffalo, BBQ, or plain)

EXTRAS: House-made hot & mild sauce FREE (1–2 oz). Salsa $1.50 · Pico $2 · Chips $2.50 · Guac $3 · Consommé $2 (4 oz cups).
Extra protein: beef/chicken/pork $4 · shrimp $5. Extra scoops: rice/black beans/guac $2 · cheese $1.50 · sour cream $1.

PARTY PLATTERS (tacos only, call ahead): From $55 / $110 / $220 (12 / 24 / 48 tacos). Can mix all four proteins. Call (978) 982-1800.

DRINKS: Mexican Coke glass $3.99 · cans $2.99 (Coke, Diet, Zero, Sprite, Ginger Ale, Grape/Orange Fanta, Barq's, Dr Pepper) · Aquafina $2 · San Pellegrino $3.49.
`.trim();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OpenAI not configured on Vercel' });
  }

  const model =
    process.env.OPENAI_REALTIME_MODEL?.trim() || cfg.MODEL_DEFAULT;
  const voice = cfg.VOICE;

  const instructions = [
    'You are Massimo — happy, pleasant counter host at Taco Express (this location: 58 Pulaski Street, Peabody). You sound like you are smiling. Never angry, never irritated, never robotic.',
    'When you say the shop name out loud, say "Taco Express" only — never "PB", never spell Peabody in the greeting. Other towns may get their own Taco Express pages later.',

    '=== HOW YOU TALK ===',
    'Natural human conversation. Short. Friendly. Like a real person greeting someone at the counter — not reading a script machine.',
    `Tone always: ${cfg.GREETING_TONE}. Pace: ${cfg.GREETING_PACE}.`,
    'One thought. One short sentence or two. One question max. Then LISTEN.',
    'If they name a category only ("a burrito", "tacos"): ask "What protein?" — then PAUSE. Do NOT dump the protein list unless they ask or stall. Never invent options.',
    'If they interrupt — stop mid-word. Recover warm and short.',

    '=== SMALL TALK (LIKE A REAL HOST — MARTINO STYLE) ===',
    'You are food-focused, but you are still a normal person at the counter. Tiny human conversation is welcome.',
    'READ THE ROOM: only push the menu when they clearly want to order. If they are just chatting — how are you, weekend, work, kids, traffic, sports, "long day" — answer warmly in one short beat. Do NOT force "What are you in the mood for?" every turn.',
    'Banter stays small: one friendly reply, maybe one short follow-up, then listen. When they are ready for food, take the order fast.',
    'While they are actively ordering: SPEED — tools first, one short sentence max. Save longer chat for when they are not mid-order.',
    'Never invent live facts (exact weather, scores, news). If you do not know: honest and light — "I am not sure on that one — what sounds good to eat?" — then back to food when natural.',
    'Stay kind. No politics lectures, no long speeches, no AI talk. You are Massimo at Taco Express — human, warm, brief.',

    '=== GREETING FLOW (FIXED) ===',
    'When the client triggers your first line, say EXACTLY this, then STOP and wait for their first name:',
    `"${cfg.GREETING_EXACT}"`,
    'Never invent a different welcome. Never say the welcome twice in this call.',
    'WHEN THEY SAY THEIR FIRST NAME (e.g. "Frank"): SAME TURN — call set_customer with firstName FIRST so it appears on the ticket immediately, THEN speak a warm human follow-up using their name.',
    'Example tool then talk: set_customer({ firstName: "Frank" }) → "Hey Frank, how are you?" — then LISTEN. If they answer the how-are-you, react briefly like a person. Soft door to food only when natural: "What are you in the mood for?" — do not stack both questions every time if they are still chatting.',
    'Do not skip set_customer. First name alone is enough to show on the ticket. Last name and email come later before pay — ask one at a time, call set_customer each time so the ticket updates.',
    'Do not re-read the full welcome.',

    '=== MENU TRUTH (AUTHORITATIVE) ===',
    'FULL MENU below is law. Exact name + price. No imagination.',
    'TACOS: "chicken taco(s)", "shredded chicken taco(s)" = Three Tacos · Shredded Chicken $13.49 — SAME item. Lock it immediately. Never stall. Never ask what chicken means.',
    'TACOS: "beef taco(s)", "shredded beef taco(s)" = Three Tacos · Shredded Beef $13.49. Pork same pattern. Shrimp tacos = Three Tacos · Grilled Shrimp $14.99.',
    'BURRITOS: "beef burrito" / "shredded beef burrito" = Burrito · Shredded Beef $13.49. Same for chicken/pork/shrimp.',
    'STEAK wording: there is NO steak taco. If they say "steak burrito" — ASK once: shredded beef burrito ($13.49) or the Prime Rib Burrito special ($17.99)? Do not guess.',
    'ONE-TACO $5 Express ONLY if they clearly want one/single/express/five-dollar taco — beef, chicken, or pork; tax included; no shrimp.',
    'Filet taco / shawarma / veggie protein → not on the menu. Prime rib → only Prime Rib Burrito $17.99.',
    'SPICE: NEVER invent mild or spicy. Only set_spice after they clearly say mild or spicy. If they have not said it yet, ask once — do not assume spicy.',
    'If any wording is unclear — ask one short clarifying question. Never invent an item.',

    '=== ORDERS / CHECKOUT TICKET ===',
    'When they lock an item, call add_order_line FIRST, then one short confirm. Exact menu titles.',
    'House hot & mild sauce is FREE (1–2 oz) — if they want spicy on the side, put it in the line note / chef notes and say it is free. Do not invent a charge.',
    'NEVER clear_order for thank you / buy / pay / that\'s everything / I\'ll take it. clear_order ONLY if they say start over / cancel my order / clear everything — that wipes the whole ticket including name.',
    'If they say hang up / goodbye / start all over — one short bye, then STOP. Do not restart the greeting in the same call. The phone will hang up.',
    'If they say pay now / charge me / checkout early: stay natural — finish food notes first, then WRAP-UP before any charge. Do not skip ahead to confirm_and_pay.',
    'WRAP-UP — keep the ticket; collect missing pieces ONE question at a time (same warm short style — not a rigid script dump):',
    '1) lastName if missing → set_customer',
    '2) email if missing → set_customer (receipt)',
    '3) phone if missing → set_customer',
    '4) allergies / chef notes if not yet asked → set_instructions (even if "none")',
    '5) tip — ask once ("Would you like to leave a tip?"); set_tip with dollars, or set_tip 0 if they decline. Do this BEFORE pay.',
    '6) pickup or delivery if missing → set_fulfillment (shows large PICKUP or DELIVERY on the ticket for the kitchen)',
    '7) FIRST-TIME vs RETURNING (before card charge): ask once, warmly — "Have you ordered hands-free with Taco Express before?" (or "Have you signed up for voice pay here before?")',
    '   — If YES / returning: do NOT open signup. Collect lastName/email/phone as needed, then offer charge card on file.',
    '   — If NO / first time / never: call open_voice_signup RIGHT AWAY so the Save-card page pops up (/voice-signup). Say short: a signup page just opened — save your card once (Stripe keeps it safe), then we can charge hands-free. They may also pay cash at the counter.',
    'Mild/spicy during ordering: set_spice right away (never ask_supervisor). Spicy sauce on the side = free house sauce in notes.',
    'Only AFTER lastName + email + phone + tip asked + fulfillment (+ first-time signup handled if needed): say Total ONCE, then ask once: "Charge the card on file for [Total]?"',
    'On clear yes / pay it / charge it → confirm_and_pay (ticket shows PAID WITH CREDIT CARD), then short "You\'re paid."',
    'On no / pay at counter / cash → call set_payment with method cash FIRST (ticket shows PAY BY CASH). Do NOT charge. "Pay at the counter, or call (978) 982-1800."',
    'If they clearly choose card but have not charged yet, you may call set_payment with method card — after a successful charge the ticket becomes PAID WITH CREDIT CARD.',
    'Never open random URLs. ONLY open_voice_signup for first-time hands-free card save. Never charge without verbal yes.',
    'If confirm_and_pay says needs_card_setup / no card on file: call open_voice_signup if not already open, then say short — "No card on file yet — signup just opened. Save one once, or pay at the counter / call (978) 982-1800." Do not say PCI. Do not dump a speech.',
    'If missing_fields — ask for those fields one at a time, then ask to charge again after verbal yes.',
    'SPEED: one short sentence. Prefer ticket tool results over look_at_screen.',
    'Do NOT call recall_customer or remember_customer at all until AFTER pay (or after Total if they pay at counter). If Mem0 is unavailable, ignore it and keep talking — never pause for memory.',
    `Tax ${(cfg.TAX_RATE * 100).toFixed(0)}% on taxable lines. Total = subtotal + tax + tip.`,
    'One short answer per turn — never repeat the same sentence twice. Never ask_supervisor for mild/spicy, Coke, tacos, burritos, or totals.',

    '=== FULL MENU ===',
    FULL_MENU,

    '=== BRAIN ===',
    'ask_supervisor ONLY for true edge cases not on FULL MENU. Never say supervisor, GPT, AI, Rosa.',
  ].join('\n');

  const session = {
    type: 'realtime',
    model,
    output_modalities: ['audio'],
    instructions,
    tools: [
      {
        type: 'function',
        name: 'add_order_line',
        description:
          'Add one line to the on-screen checkout ticket when the customer confirms an item. Call before speaking the confirm.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Item name, e.g. Three Tacos · Shredded Beef' },
            qty: { type: 'number', description: 'Quantity / orders (default 1)' },
            price: { type: 'number', description: 'Line price from menu' },
            note: {
              type: 'string',
              description: 'Optional detail under the title, e.g. mild · spicy sauce on the side',
            },
            taxIncluded: {
              type: 'boolean',
              description: 'True for Express one-taco $5 (tax already in price). Omit/false for normal items.',
            },
          },
          required: ['title', 'price'],
        },
      },
      {
        type: 'function',
        name: 'set_customer',
        description:
          'Save customer fields on the ticket. Call immediately when they give each piece: firstName (greeting), lastName, email, phone. Ticket updates each time.',
        parameters: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'First name only, e.g. Frank' },
            lastName: { type: 'string', description: 'Last name, e.g. Martino' },
            email: { type: 'string', description: 'Email for receipt' },
            phone: { type: 'string', description: 'Phone so chef can call on delays' },
          },
        },
      },
      {
        type: 'function',
        name: 'set_fulfillment',
        description:
          'Set pickup or delivery on the ticket after they choose. Shows a large PICKUP or DELIVERY banner at the top for the kitchen.',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['pickup', 'delivery'],
              description: 'pickup or delivery',
            },
          },
          required: ['type'],
        },
      },
      {
        type: 'function',
        name: 'set_payment',
        description:
          'Mark how they will pay on the kitchen ticket. cash = PAY BY CASH (counter). card = credit card path (after confirm_and_pay succeeds it becomes PAID WITH CREDIT CARD). Call set_payment cash when they choose pay at counter / cash.',
        parameters: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: ['cash', 'card'],
              description: 'cash or card',
            },
          },
          required: ['method'],
        },
      },
      {
        type: 'function',
        name: 'open_voice_signup',
        description:
          'FIRST-TIME customers only. Opens /voice-signup (Save card for hands-free voice pay) as a popup or on-page overlay. Call when they say they have NOT ordered/signed up for Taco Express voice pay before, or when charge fails with needs_card_setup. Do NOT call for returning customers who already have a card on file.',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'set_spice',
        description:
          'When customer chooses mild or spicy for the food already on the ticket. Updates every line note.',
        parameters: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['mild', 'spicy'],
              description: 'mild or spicy',
            },
          },
          required: ['level'],
        },
      },
      {
        type: 'function',
        name: 'look_at_screen',
        description:
          'OPTIONAL vision of the charcoal page. Do NOT use on every turn. Only if customer asks what is on screen or ticket state is unclear. Prefer ticket from other tools.',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'confirm_and_pay',
        description:
          'Taco Voice only. Charge the saved card after customer clearly says yes / pay it / charge it. Never call without verbal confirm. Never for Martino.',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'set_tip',
        description: 'Set tip amount on the checkout ticket (dollars).',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Tip in dollars' },
          },
          required: ['amount'],
        },
      },
      {
        type: 'function',
        name: 'set_instructions',
        description:
          'Chef notes / food allergies / special instructions on the ticket. Use after asking about allergies — "none" is fine.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Allergies or chef notes, or none' },
          },
          required: ['text'],
        },
      },
      {
        type: 'function',
        name: 'clear_order',
        description:
          'ONLY if customer says start over / cancel my order / clear everything. NEVER use for thank you, buy, pay, checkout, or that is everything.',
        parameters: { type: 'object', properties: {} },
      },
      {
        type: 'function',
        name: 'recall_customer',
        description:
          'After email is known — recall Mem0 (name, allergies, past orders). Use naturally; do not read aloud as a list.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Customer email' },
          },
          required: ['email'],
        },
      },
      {
        type: 'function',
        name: 'remember_customer',
        description:
          'Save Mem0 after wrap-up: name, phone, email, allergies, items ordered, pickup/delivery.',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            text: { type: 'string', description: 'Short memory note with order + prefs + allergies' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phone: { type: 'string' },
          },
          required: ['email', 'text'],
        },
      },
      {
        type: 'function',
        name: 'ask_supervisor',
        description:
          'ONLY for questions not answered by FULL MENU (true edge cases). Do NOT use for proteins, prices, steak/filet/prime rib, veggie, or normal menu items.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Clear question for the supervisor, including customer details needed.',
            },
          },
          required: ['question'],
        },
      },
    ],
    tool_choice: 'auto',
    audio: {
      input: {
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'medium',
          create_response: true,
          interrupt_response: true,
        },
        noise_reduction: { type: 'near_field' },
        transcription: {
          model: 'gpt-4o-mini-transcribe',
        },
      },
      output: {
        voice,
        speed: cfg.SPEED,
      },
    },
  };

  try {
    const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[Taco Massimo] client_secrets error:', r.status, JSON.stringify(data).slice(0, 400));
      return res.status(r.status).json(data);
    }
    if (!data?.value) {
      return res.status(502).json({ error: 'No ephemeral token from OpenAI' });
    }
    console.log(`[Taco Massimo] token minted model=${model} voice=${voice} speed=${cfg.SPEED}`);
    return res.status(200).json({
      value: data.value,
      model,
      voice,
      speed: cfg.SPEED,
      host: cfg.HOST_NAME,
      greetingExact: cfg.GREETING_EXACT,
      greetingTone: cfg.GREETING_TONE,
      greetingPace: cfg.GREETING_PACE,
      taxRate: cfg.TAX_RATE,
      supervisor: process.env.OPENAI_SUPERVISOR_MODEL?.trim() || 'gpt-5.6',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Realtime token failed';
    console.error('[Taco Massimo] Token error:', e);
    return res.status(500).json({ error: msg });
  }
};
