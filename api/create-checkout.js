const { buildLinesFromCart, computeTotals } = require('./menuCatalog');

function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function formEncode(obj) {
  return Object.keys(obj)
    .filter((k) => obj[k] != null && obj[k] !== '')
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(String(obj[k])))
    .join('&');
}

async function stripeForm(secret, path, params) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formEncode(params),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
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
      ok: false,
      code: 'stripe_not_configured',
      error: 'STRIPE_SECRET_KEY not set on taco-express-peabody Vercel.',
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

  const cart = Array.isArray(body.cart) ? body.cart : [];
  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone);
  const instructions = clean(body.instructions).slice(0, 300);
  const fulfillment = clean(body.fulfillment || 'pickup') || 'pickup';

  if (!name) {
    return res.status(400).json({ ok: false, code: 'missing_name', error: 'Name is required.' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, code: 'missing_email', error: 'Email is required.' });
  }
  if (!phone) {
    return res.status(400).json({ ok: false, code: 'missing_phone', error: 'Phone is required.' });
  }

  let lines;
  try {
    lines = buildLinesFromCart(cart);
  } catch (err) {
    return res.status(400).json({ ok: false, code: 'bad_cart', error: err.message || 'Invalid cart.' });
  }

  const { subtotalCents, taxCents, totalCents } = computeTotals(lines);
  if (totalCents < 50) {
    return res.status(400).json({ ok: false, code: 'bad_amount', error: 'Order total is too small.' });
  }

  const baseUrl = clean(process.env.PUBLIC_BASE_URL || 'https://www.tacoexpresspeabody.com').replace(/\/$/, '');
  const orderId = 'TACO-WEB-' + Date.now();
  const params = {
    mode: 'payment',
    success_url: baseUrl + '/order-success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: baseUrl + '/checkout?canceled=1',
    customer_email: email,
    'metadata[shop]': 'taco-express-peabody-web',
    'metadata[orderId]': orderId,
    'metadata[name]': name,
    'metadata[phone]': phone,
    'metadata[fulfillment]': fulfillment,
    'metadata[instructions]': instructions,
    'metadata[lines]': lines
      .map((line) => line.qty + 'x ' + line.name)
      .join('; ')
      .slice(0, 400),
  };

  lines.forEach((line, index) => {
    params['line_items[' + index + '][quantity]'] = String(line.qty);
    params['line_items[' + index + '][price_data][currency]'] = 'usd';
    params['line_items[' + index + '][price_data][unit_amount]'] = String(line.priceCents);
    params['line_items[' + index + '][price_data][product_data][name]'] = line.name;
  });

  const taxIndex = lines.length;
  params['line_items[' + taxIndex + '][quantity]'] = '1';
  params['line_items[' + taxIndex + '][price_data][currency]'] = 'usd';
  params['line_items[' + taxIndex + '][price_data][unit_amount]'] = String(taxCents);
  params['line_items[' + taxIndex + '][price_data][product_data][name]'] = 'MA meals tax (7%)';

  const session = await stripeForm(secret, 'checkout/sessions', params);
  if (!session.ok) {
    const msg =
      (session.data && session.data.error && session.data.error.message) || 'Stripe checkout failed';
    console.error('[Taco web checkout]', session.status, msg);
    return res.status(502).json({ ok: false, code: 'stripe_error', error: msg });
  }

  return res.status(200).json({
    ok: true,
    checkoutUrl: session.data.url,
    sessionId: session.data.id,
    orderId,
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    total: totalCents / 100,
  });
};
