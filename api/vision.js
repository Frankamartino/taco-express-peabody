/**
 * Screen vision for Massimo — describe the charcoal ticket / full page JPEG.
 * Uses the same OPENAI_API_KEY as Realtime (gpt-4o-mini).
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OPENAI_API_KEY not set' });
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

  const image = String(body.image || '').replace(/^data:image\/\w+;base64,/, '').trim();
  if (!image) {
    return res.status(400).json({ error: 'image required (base64 jpeg)' });
  }

  const prompt =
    String(body.prompt || '').trim() ||
    'This is the Taco Express Peabody voice-order screen (charcoal background, white receipt ticket). Read EVERYTHING visible: customer name, phone, email, pickup or delivery, each food line with qty and price, chef notes/allergies, subtotal, tax, tip, total. Be exact with dollars. Reply in a tight bullet list a counter host can trust.';

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/jpeg;base64,' + image,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 400,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[Taco vision]', r.status, JSON.stringify(data).slice(0, 300));
      return res.status(r.status).json({
        error: 'vision failed',
        detail: data.error?.message || data,
      });
    }

    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      '';
    return res.status(200).json({ ok: true, text: String(text).trim() });
  } catch (e) {
    console.error('[Taco vision]', e);
    return res.status(500).json({ error: e instanceof Error ? e.message : 'vision error' });
  }
};
