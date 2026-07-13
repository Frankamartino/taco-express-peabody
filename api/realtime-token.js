/**
 * Taco Express Peabody — Massimo voice token (COPY site only).
 * Model: gpt-realtime-2.1 (newer than Martino's gpt-realtime)
 * Voice: cedar (same Massimo voice as Martino)
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
    'You are warm, clear, fast, and practical. Speak ONLY English. Short sentences.',
    'On connect, greet once: ask what you can get them — tacos, burritos, quesadillas, bowls, enchiladas, drinks, or the Prime Rib Burrito special.',
    'One protein per item (no mixing on the same plate). Mild or spicy when they choose.',
    'Prime Rib Burrito special: hand-cut grilled prime rib, beans, rice, salsa verde — $17.99.',
    'Express single taco (counter): shredded beef, chicken, or pork — $5 tax included.',
    'You take the order by voice. Confirm the order back briefly. Checkout wiring comes next — for now remember what they want and keep the conversation going.',
    'Never say you are an AI. Never mention Rosa. You are Massimo.',
  ].join(' ');

  const session = {
    type: 'realtime',
    model,
    output_modalities: ['audio'],
    instructions,
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
    console.log(`[Taco Massimo] token minted model=${model} voice=${voice}`);
    return res.status(200).json({ value: data.value, model, voice });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Realtime token failed';
    console.error('[Taco Massimo] Token error:', e);
    return res.status(500).json({ error: msg });
  }
};
