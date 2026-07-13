/**
 * GPT-5.6 supervisor brain for Taco Express Massimo (COPY /voice only).
 * Realtime 2.1 talks; this endpoint thinks hard and returns a short answer Massimo can speak.
 */
const MENU_BRIEF = `
Taco Express Peabody — 58 Pulaski Street, Peabody MA 01960 · (978) 982-1800
COPY voice-order experiment (not the photo menu board).

Rules: one protein per item (no mix on same plate). Mild or spicy when asked.

Tacos: Three Tacos shredded beef/chicken/pork $13.49; grilled shrimp $14.99.
Express single taco (counter): beef/chicken/pork $5 tax included.
Burritos 12": shredded beef/chicken/pork $13.49; shrimp $14.99.
Prime Rib Burrito SPECIAL: hand-cut grilled prime rib, beans, rice, salsa verde $17.99.
Loaded quesadillas ~$13.99–$14.99 by protein.
Taco bowls / burrito bowls ~$14.50–$15.50.
Two enchiladas ~$13.99–$15.99.
Sides extras, fries, drinks (Mexican Coke, Jarritos, sodas, water) available.
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

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const question = String(body.question || body.request || '').trim();
  const history = Array.isArray(body.history) ? body.history : [];
  if (!question) {
    return res.status(400).json({ error: 'question required' });
  }

  const model =
    process.env.OPENAI_SUPERVISOR_MODEL?.trim() || 'gpt-5.6';

  const historyText = history
    .slice(-12)
    .map((h) => {
      if (!h || typeof h !== 'object') return '';
      const role = h.role || 'unknown';
      const text = h.text || h.content || '';
      return `${role}: ${String(text).slice(0, 400)}`;
    })
    .filter(Boolean)
    .join('\n');

  const system = [
    'You are the silent supervisor brain for Massimo at Taco Express Peabody.',
    'Massimo speaks to the customer with Realtime voice. You never speak as yourself.',
    'Return a short, clear answer Massimo can say out loud (1–3 short sentences max).',
    'Be accurate on menu, prices, and rules. If unsure, say so briefly and suggest calling (978) 982-1800.',
    'Do not invent items. No AI disclaimers.',
    '',
    MENU_BRIEF,
  ].join('\n');

  const user = [
    historyText ? `Recent conversation:\n${historyText}\n` : '',
    `Massimo needs help with:\n${question}`,
  ].join('\n');

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          { role: 'developer', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[Taco Supervisor] error:', r.status, JSON.stringify(data).slice(0, 500));
      return res.status(r.status).json(data);
    }

    const answer = extractResponseText(data);
    if (!answer) {
      return res.status(502).json({ error: 'Empty supervisor answer', raw: data });
    }

    console.log(`[Taco Supervisor] model=${model} q_len=${question.length} a_len=${answer.length}`);
    return res.status(200).json({ answer, model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Supervisor failed';
    console.error('[Taco Supervisor]', e);
    return res.status(500).json({ error: msg });
  }
};

function extractResponseText(data) {
  if (!data || typeof data !== 'object') return '';
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const out = data.output;
  if (!Array.isArray(out)) return '';
  const chunks = [];
  for (const item of out) {
    if (!item || item.type !== 'message') continue;
    const content = item.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && (part.type === 'output_text' || part.type === 'text') && part.text) {
        chunks.push(String(part.text));
      }
    }
  }
  return chunks.join('\n').trim();
}
