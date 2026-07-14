/**
 * Taco Express Peabody VOICE only — create Stripe Checkout Session in setup mode
 * so a customer can save a card once (signup). Never shared with Martino Pasta Bar.
 *
 * Env (taco-express-peabody Vercel ONLY):
 *   STRIPE_SECRET_KEY
 *   STRIPE_PUBLISHABLE_KEY (returned to client for display only; Checkout uses session URL)
 *   PUBLIC_BASE_URL optional — https://www.tacoexpresspeabody.com
 */
function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\r\n]+/g, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] != null && obj[k] !== '')
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(String(obj[k])))
    .join('&');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = clean(process.env.STRIPE_SECRET_KEY);
  if (!secret) {
    return res.status(503).json({
      error: 'STRIPE_SECRET_KEY not set on taco-express-peabody Voice project.',
    });
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

  const email = clean(body.email).toLowerCase();
  const name = clean(body.name || '');
  const phone = clean(body.phone || '');
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const base =
    clean(process.env.PUBLIC_BASE_URL) ||
    (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host']
      ? String(req.headers['x-forwarded-proto']).split(',')[0].trim() +
        '://' +
        String(req.headers['x-forwarded-host']).split(',')[0].trim()
      : 'https://www.tacoexpresspeabody.com');

  const successUrl =
    base.replace(/\/$/, '') + '/voice-signup?setup=success&session_id={CHECKOUT_SESSION_ID}';
  const cancelUrl = base.replace(/\/$/, '') + '/voice-signup?setup=cancel';

  // Find or create Customer in THIS Stripe account only (Taco Voice).
  let customerId = '';
  try {
    const search = await fetch(
      'https://api.stripe.com/v1/customers?email=' + encodeURIComponent(email) + '&limit=1',
      { headers: { Authorization: 'Bearer ' + secret } }
    );
    const searchData = await search.json().catch(() => ({}));
    if (search.ok && searchData.data && searchData.data[0] && searchData.data[0].id) {
      customerId = searchData.data[0].id;
    }
  } catch (e) {
    console.warn('[Taco Voice signup] customer search', e);
  }

  if (!customerId) {
    const createCust = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formEncode({
        email,
        name: name || undefined,
        phone: phone || undefined,
        'metadata[shop]': 'taco-express-peabody-voice',
        'metadata[billing_boundary]': 'taco_voice_only_not_martino_not_menu',
      }),
    });
    const custData = await createCust.json().catch(() => ({}));
    if (!createCust.ok || !custData.id) {
      return res.status(502).json({
        error: (custData.error && custData.error.message) || 'Could not create Stripe customer',
      });
    }
    customerId = custData.id;
  }

  const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formEncode({
      mode: 'setup',
      customer: customerId,
      currency: 'usd',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'payment_method_types[0]': 'card',
      'metadata[shop]': 'taco-express-peabody-voice',
      'metadata[billing_boundary]': 'taco_voice_only_not_martino_not_menu',
      'metadata[email]': email,
    }),
  });
  const session = await sessionRes.json().catch(() => ({}));
  if (!sessionRes.ok || !session.url) {
    return res.status(502).json({
      error: (session.error && session.error.message) || 'Could not start card signup',
    });
  }

  return res.status(200).json({
    ok: true,
    checkout_url: session.url,
    session_id: session.id,
    customer_id: customerId,
    shop: 'taco-express-peabody-voice',
    note: 'After success, set TACO_VOICE_STRIPE_CUSTOMER_ID (and optional PM) on taco Vercel only — never Martino.',
  });
};
