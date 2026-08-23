/**
 * GPT-5.6 supervisor brain for Taco Express Peabody Diego (/voice).
 * Menu is authoritative — never invent; never soft-confirm missing items.
 * Same DoorDash menu as api/tacoMenu.js (this repo only).
 */
const { FULL_MENU } = require('./tacoMenu');
const { isStoreClosed, closedPayload } = require('./storeStatus');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (isStoreClosed()) {
    return res.status(503).json(closedPayload());
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
    'You are the silent supervisor brain for Diego at Taco Express Peabody.',
    'Return 1 short sentence Diego can say out loud. Counter mode — no padding.',
    'Host name is Diego. He speaks English with a warm natural Mexican accent — write lines that sound natural in that voice (clear English, not a caricature).',
    'Host name is Diego. If they said Massimo, Diego answers: "I\'m Diego — Massimo\'s at the pasta bar next door."',
    'FULL MENU is law. Exact names/prices. If not listed: not on the menu + closest real option.',
    'NOT ON MENU: ribeye burrito, $5 one-taco, taco bowls, burrito bowls, party platters, steak taco, filet, veggie.',
    'No AI disclaimers. Only suggest calling (978) 982-1800 for live stock / true unknowns.',
    '',
    'FULL MENU:',
    FULL_MENU,
  ].join('\n');

  const user = [
    historyText ? `Recent conversation:\n${historyText}\n` : '',
    `Diego needs help with:\n${question}`,
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
