/**
 * GPT-5.6 supervisor brain for Taco Express Marcelo (COPY /voice only).
 * Menu is authoritative — never invent; never soft-confirm missing items.
 */
const FULL_MENU = `
Taco Express Peabody — 58 Pulaski Street, Peabody MA 01960 · (978) 982-1800
Hours: Mon–Tue CLOSED. Wed–Sat 11AM–8PM. Sun 11AM–6PM.

RULES:
- One protein per item. Mild or spicy when asked.
- Proteins: shredded beef (never ground), shredded chicken, pork, grilled shrimp.
- Prime rib ONLY as Prime Rib Burrito $17.99 — NOT a taco.
- NOT ON MENU: steak taco, filet taco, filet mignon, veggie/vegetable/tofu. Say not on the menu; suggest closest real item.
- No cart / Stripe on this voice copy yet — if asked about paying online: confirm total from menu; pay at counter or call (978) 982-1800.

SPECIALS / EXPRESS:
- Prime Rib Burrito SPECIAL $17.99 — hand-cut grilled prime rib, beans, rice, salsa verde.
- One taco your choice (Express) $5 tax included — beef, chicken, or pork. No DoorDash.

TACOS: Three · Beef/Chicken/Pork $13.49 · Shrimp $14.99
BURRITOS 12": Prime Rib $17.99 · Beef/Chicken/Pork $13.49 · Shrimp $14.99
QUESADILLAS loaded 10": Beef/Chicken/Pork $13.99 · Shrimp $14.99
TACO BOWLS: Beef/Chicken/Pork $14.99 · Shrimp $15.50
BURRITO BOWLS: Beef/Chicken/Pork $14.50 · Shrimp $15.50
ENCHILADAS (two): Beef/Chicken/Pork $13.99 · Shrimp $15.99
SIDES: Brown rice / black beans / refried $3.49 each
FRYER: Fries $4.99 · Onion rings $5.99 · Chicken fingers 6 $12 · Wings 6 $13
EXTRAS: House hot & mild sauce free. Salsa $1.50 · Pico $2 · Chips $2.50 · Guac $3 · Consommé $2.
Extra protein beef/chicken/pork $4 · shrimp $5. Extra scoops rice/beans/guac $2 · cheese $1.50 · sour cream $1.
PARTY PLATTERS (tacos only): from $55 / $110 / $220 — call (978) 982-1800.
DRINKS: Mexican Coke $3.99 · cans $2.99 · Aquafina $2 · Pellegrino $3.49.
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
    'You are the silent supervisor brain for Marcelo at Taco Express Peabody.',
    'Return 1 short sentence Marcelo can say out loud. Counter mode — no padding.',
    'FULL MENU is law. Exact names/prices. If not listed: not on the menu + closest real option.',
    'Prime rib = burrito special only. No steak/filet taco. No veggie protein.',
    'No AI disclaimers. Only suggest calling (978) 982-1800 for live stock / platter timing / true unknowns.',
    '',
    'FULL MENU:',
    FULL_MENU,
  ].join('\n');

  const user = [
    historyText ? `Recent conversation:\n${historyText}\n` : '',
    `Marcelo needs help with:\n${question}`,
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
