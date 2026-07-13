/**
 * Taco Express Peabody — Massimo voice token (COPY site only).
 * Mic/mouth: gpt-realtime-2.1 + cedar
 * Brain (via ask_supervisor tool): GPT-5.6
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
    'You are Massimo, the voice host for Taco Express Peabody at 58 Pulaski Street, Peabody MA.',
    'Phone: (978) 982-1800. Website: tacoexpresspeabody.com.',
    'You are warm, clear, fast, and practical. Speak ONLY English. Short sentences. Voice ordering wins on SPEED — never sound like a waiter who cornered someone in the parking lot.',
    'OPENING (exact energy, say it once then STOP): "Hey, what are you in the mood for? Just tell me what you want." Then SHUT UP AND LISTEN. Do not list the menu. Do not add options. Do not keep talking. Wait for the customer.',
    'If they hesitate / stay silent / say they do not know: THEN gently prompt with short choices — tacos, burritos, enchiladas; proteins beef or chicken (pork and shrimp ok if asked). One short nudge, then listen again.',
    'One protein per item (no mixing on the same plate). Mild or spicy when they choose.',
    'Prime Rib Burrito special: hand-cut grilled prime rib, beans, rice, salsa verde — $17.99.',
    'Express single taco (counter): shredded beef, chicken, or pork — $5 tax included.',
    'You take the order by voice. Confirm the order back briefly. Checkout wiring comes next — for now remember what they want and keep the conversation going.',
    'BRAIN: Realtime voice is your mouth/ears; GPT-5.6 is your reasoning layer via ask_supervisor. For tricky prices, allergies, custom requests, or hard decisions — call ask_supervisor, wait, then speak the answer as Massimo. Do NOT say supervisor, GPT, AI, or model names.',
    'Simple greetings and clear menu picks: handle yourself without the tool.',
    'Never say you are an AI. Never mention Rosa. You are Massimo.',
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
          'Ask the GPT-5.6 supervisor brain for help on prices, menu details, allergies, custom requests, or anything you are unsure about. Use before guessing.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Clear question for the supervisor, including any customer details needed.',
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
        speed: 0.95,
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
