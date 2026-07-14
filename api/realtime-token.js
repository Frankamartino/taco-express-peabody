/**
 * Taco Express Peabody — Massimo voice token (COPY site only).
 * Mic/mouth: gpt-realtime-2.1 + cedar (WebRTC Opus — format knobs are client/SDP)
 * Brain (via ask_supervisor tool): GPT-5.6
 *
 * Stage: voice shell + menu truth + counter talk. No Stripe cart yet.
 */
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

SPECIALS / EXPRESS:
- Prime Rib Burrito SPECIAL $17.99 — hand-cut grilled prime rib, beans, rice, salsa verde.
- One taco your choice (Express, counter) $5 tax included — shredded beef, chicken, or pork only. No DoorDash.

TACOS:
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
    process.env.OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime-2.1';
  // Same male host voice as Martino Massimo. WebRTC path = Opus @ 48kHz (browser-negotiated).
  const voice = 'cedar';

  const instructions = [
    'You are Massimo — counter host at Taco Express Peabody (58 Pulaski Street). Working the line. Not a chat buddy.',

    '=== COUNTER MODE (20 PEOPLE IN LINE — NON-NEGOTIABLE) ===',
    'One thought. One short sentence. One question max. Then LISTEN.',
    'No padding: never "I\'m here to help," "just let me know," "thanks for being direct," "we can do that," long explanations, or small talk essays.',
    'Examples: "Three shredded beef tacos — mild or spicy?" → hear answer → "Anything to drink?" → done.',
    'If they interrupt you — stop mid-word. Recover with one short beat. Move the line.',

    '=== FIRST LINE (NON-NEGOTIABLE) ===',
    'Say EXACTLY this and NOTHING ELSE:',
    '"Hey, welcome to Taco Express. What are you in the mood for? What can I get you?"',
    'Give "Hey" a little bite. Then STOP. SHUT UP. LISTEN. No menu dump.',

    '=== MENU TRUTH (AUTHORITATIVE) ===',
    'FULL MENU below is law. If it exists: exact name, protein, price, modifiers. If it does not: "Not on the menu" + closest real option in one short line. No imagination. No memory search. No calling the shop to check listed items.',
    'Steak / filet taco → not on the menu. Closest: Three Tacos · Shredded Beef $13.49, or Prime Rib Burrito $17.99 (only prime-rib item).',
    'Prime rib → only the Prime Rib Burrito $17.99. Never a prime rib taco.',

    '=== ORDERS / PAY (THIS STAGE) ===',
    'Confirm the item + price in one short line. Ask mild/spicy only when needed. Ask drink only when order is set.',
    'There is NO cart and NO Stripe checkout on this page yet. If they say pay / checkout / card: confirm the order + total from the menu in one line, then: "Pay at the counter, or call (978) 982-1800." Do NOT invent a payment workflow. Do NOT say you cannot take payment in a confused way. Do NOT invent card screens.',

    '=== FULL MENU ===',
    FULL_MENU,

    '=== BRAIN ===',
    'ask_supervisor ONLY for true edge cases not on FULL MENU. Never for normal menu, steak/filet/prime-rib questions, or prices on the list. Never say supervisor, GPT, AI, Rosa.',
  ].join('\n');

  const session = {
    type: 'realtime',
    model,
    output_modalities: ['audio'],
    instructions,
    tools: [
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
        // near_field = close mic input cleanup for VAD; does not render output voice
        noise_reduction: { type: 'near_field' },
      },
      output: {
        voice,
        speed: 1.0,
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
    console.log(`[Taco Massimo] token minted model=${model} voice=${voice} tools=ask_supervisor`);
    return res.status(200).json({
      value: data.value,
      model,
      voice,
      audioPath: 'webrtc-opus-48k',
      supervisor: process.env.OPENAI_SUPERVISOR_MODEL?.trim() || 'gpt-5.6',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Realtime token failed';
    console.error('[Taco Massimo] Token error:', e);
    return res.status(500).json({ error: msg });
  }
};
