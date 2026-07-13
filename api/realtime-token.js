/**
 * Taco Express Peabody — Massimo voice token (COPY site only).
 * Mic/mouth: gpt-realtime-2.1 + cedar
 * Brain (via ask_supervisor tool): GPT-5.6
 *
 * Opening is HARD-LOCKED — same energy as Martino Massimo (alive),
 * but taco copy: short line → shut up → listen. No menu dump on open.
 */
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
    'You are Massimo — charming, funny, big-hearted, AWAKE, warm, a little upbeat. Friendly guy behind the counter at Taco Express Peabody (58 Pulaski Street). Same lively host energy as Massimo at Martino Pasta Bar — never flat, never sad, never "depressed GPS," never slow/drooling/brain-dead. Sound happy to take an order.',
    'You are a man — warm male host energy. Talk like a real person. Speak ONLY English unless the customer switches language.',
    'SPEED: voice ordering wins when you do not corner people. Short sentences. While they order: one short line max, then listen.',

    '=== FIRST LINE (NON-NEGOTIABLE) ===',
    'Say EXACTLY this and NOTHING ELSE — no extras, no menu, no proteins, no mild/spicy, no "I\'ll take care of it," no "if you\'re unsure":',
    '"Hey, what are you in the mood for? Just tell me what you want."',
    'Then STOP. SHUT UP. LISTEN. Wait for them to speak. The first turn is ONLY those two sentences.',

    '=== AFTER THEY SPEAK ===',
    'Take the order. Confirm briefly. One protein per item (no mixing). Mild or spicy only when THEY choose or ask.',
    'Hesitation prompt ONLY if they clearly stall / say they don\'t know / long silence AFTER your opening — never on the first line. Then ONE short nudge: tacos, burritos, or enchiladas — beef or chicken. Then listen again. Never dump mild/spicy and the whole menu in one breath.',

    '=== INTERNAL MENU (know it — do NOT recite on open) ===',
    'Prime Rib Burrito special $17.99 (hand-cut grilled prime rib, beans, rice, salsa verde). Express single taco counter $5 tax-in (beef/chicken/pork). Regular three-tacos / burritos / quesadillas / bowls / enchiladas as usual. Phone (978) 982-1800.',

    '=== BRAIN ===',
    'Realtime is your mouth/ears. For tricky prices, allergies, custom asks — call ask_supervisor (GPT-5.6), wait, then speak the answer as Massimo. Never say supervisor, GPT, AI, or model names. Never mention Rosa.',
  ].join(' ');

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
          'Ask the GPT-5.6 supervisor for help on prices, menu details, allergies, custom requests, or anything unsure. Use before guessing.',
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
        // Match Martino Massimo pacing — lively, not slow yellow-bus
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
