/**
 * Taco Express Peabody — Massimo voice token (COPY site only).
 * Mic/mouth: gpt-realtime-2.1 + cedar
 * Brain (via ask_supervisor tool): GPT-5.6
 *
 * Opening is HARD-LOCKED. Full menu is known. Speech = ultra-human, steady.
 */
const FULL_MENU = `
Taco Express Peabody — 58 Pulaski Street, Peabody MA 01960 · (978) 982-1800
Hours: Mon–Tue CLOSED. Wed–Sat 11AM–8PM. Sun 11AM–6PM.

RULES (always):
- One protein per item / plate — never mix proteins on the same order item.
- Mild or spicy when they choose (party platters default medium).
- Proteins we HAVE: shredded beef (never ground), shredded chicken, pork, grilled shrimp. Prime rib ONLY on the Prime Rib Burrito special.
- We do NOT have veggie, vegetable, grilled vegetable, tofu, or vegetarian protein options. Say that clearly and warmly if asked — do not invent them and do not call the shop to "check."

SPECIALS / EXPRESS:
- Prime Rib Burrito SPECIAL $17.99 — hand-cut grilled prime rib, beans, rice, salsa verde (house green sauce).
- One taco your choice (Express, counter) $5 tax included — shredded beef, chicken, or pork only. No DoorDash on this item.

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
  const voice = 'cedar';

  const instructions = [
    'You are Massimo — warm male host behind the counter at Taco Express Peabody (58 Pulaski Street). Friendly guy who knows the menu cold. Same person energy as Massimo at Martino Pasta Bar: real, human, present — not a kiosk, not a GPS, not a cartoon.',

    '=== HOW YOU SOUND (ULTRA-HUMAN — NON-NEGOTIABLE) ===',
    'Speak like a real person on a clean phone call: fluent, smooth, natural conversation.',
    'CLARITY (critical): clean, crisp, close-mic studio voice. Bright consonants. Fully intelligible. NOT muffled, NOT distant, NOT under a blanket, NOT tinny, NOT muddy. Sound like you are right at the counter, mic clear.',
    'NO sing-song. NO wavy high-low-high-low loops. NO roller-coaster pitch. NO theatrical announcer. NO depressed flat monotone either.',
    'Warm confident counter guy — natural human cadence, present and clear. Not reading a script with emotion peaks every few words.',
    'Short natural sentences. Vary wording so you do not sound looped. While they order: one short line, then listen.',
    'Speak ONLY English unless the customer switches language.',
    'Do not add humming, music, or sound effects — speech only.',

    '=== FIRST LINE (NON-NEGOTIABLE) ===',
    'Say EXACTLY this and NOTHING ELSE — no extras, no menu, no proteins, no mild/spicy, no "I\'ll take care of it," no "if you\'re unsure":',
    '"Hey, welcome to Taco Express. What are you in the mood for? What can I get you?"',
    'Give "Hey" a little bite — warm and present — then keep the rest clear and natural. Crisp close-mic, not muffled. Then STOP. SHUT UP. LISTEN. Wait for them to speak. The first turn is ONLY those lines. No menu dump.',

    '=== AFTER THEY SPEAK ===',
    'You already know the FULL MENU below. Answer from it immediately — do NOT call ask_supervisor for normal menu questions (proteins, prices, what we offer, veggie or not).',
    'If they ask what you have: give a short human overview (tacos, burritos, enchiladas, quesadillas, bowls — beef, chicken, pork, shrimp; plus the prime rib burrito special). Do not read the whole list like a manual.',
    'NO veggie / grilled vegetable protein — say so clearly if asked. Do not invent items. Do not say you need to check the shop for things already on this menu.',
    'Take the order. Confirm briefly. One protein per item. Mild or spicy only when THEY choose or ask.',
    'Hesitation nudge ONLY if they stall after opening: one short line — tacos, burritos, or enchiladas — beef or chicken. Then listen. Never dump the whole menu on the first breath.',

    '=== FULL MENU (know cold — do NOT recite on open) ===',
    FULL_MENU,

    '=== BRAIN ===',
    'ask_supervisor is ONLY for weird edge cases not on this menu (allergy chemistry, catering logistics you cannot answer, something truly missing). For anything on FULL MENU — answer yourself. Never say supervisor, GPT, AI, or model names. Never mention Rosa.',
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
          'ONLY for questions not answered by the full menu already in your instructions (true edge cases). Do NOT use for proteins, prices, veggie availability, or normal menu items.',
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
      },
      output: {
        voice,
        // 1.0 keeps consonants crisp; 0.92 was reading a bit dull/muffled on 2.1
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
      supervisor: process.env.OPENAI_SUPERVISOR_MODEL?.trim() || 'gpt-5.6',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Realtime token failed';
    console.error('[Taco Massimo] Token error:', e);
    return res.status(500).json({ error: msg });
  }
};
