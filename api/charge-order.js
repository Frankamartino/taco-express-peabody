/**
 * Taco Express Peabody VOICE only — hands-free off_session charge.
 * Fresh stack for /voice — do not share Stripe with Martino Pasta Bar or the DoorDash menu site.
 *
 * Env (taco-express-peabody Vercel project ONLY):
 *   STRIPE_SECRET_KEY
 *   TACO_VOICE_STRIPE_CUSTOMER_ID
 *   TACO_VOICE_STRIPE_PAYMENT_METHOD_ID (optional)
 *   TACO_VOICE_EMAIL_ALLOWLIST (default frankamartino@gmail.com)
 */
function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/\\r\\n/g, '')
    .replace(/\\n/g, '')
    .replace(/\\r/g, '')
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

async function stripeGet(secret, path) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + secret },
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
  const customerId = clean(process.env.TACO_VOICE_STRIPE_CUSTOMER_ID);
  const pmEnv = clean(process.env.TACO_VOICE_STRIPE_PAYMENT_METHOD_ID);
  const allowEmail = clean(
    process.env.TACO_VOICE_EMAIL_ALLOWLIST || 'frankamartino@gmail.com'
  ).toLowerCase();

  if (!secret) {
    return res.status(503).json({
      ok: false,
      code: 'stripe_not_configured',
      error: 'STRIPE_SECRET_KEY not set on taco-express-peabody (Voice project only).',
    });
  }
  if (!customerId) {
    return res.status(503).json({
      ok: false,
      code: 'needs_card_setup',
      error:
        'No Taco Voice Stripe customer. Save a card once at /voice-signup, then set TACO_VOICE_STRIPE_CUSTOMER_ID.',
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

  const ticket = body.ticket && typeof body.ticket === 'object' ? body.ticket : body;
  const cust = ticket.customer && typeof ticket.customer === 'object' ? ticket.customer : {};
  const email = clean(cust.email || body.email).toLowerCase();
  const phone = clean(cust.phone || body.phone);
  const firstName = clean(cust.firstName || '');
  const lastName = clean(cust.lastName || '');
  const name = clean([firstName, lastName].filter(Boolean).join(' ') || body.customerName || 'Customer');
  const fulfillment = clean(ticket.fulfillment || body.fulfillment || 'pickup');
  const instructions = clean(ticket.instructions || body.instructions || '');

  if (!email || email !== allowEmail) {
    return res.status(403).json({
      ok: false,
      code: 'email_not_allowed',
      error:
        'Hands-free charge is only for the Taco Voice allowlisted email. Pay at the counter, or call (978) 982-1800.',
    });
  }

  const lines = Array.isArray(ticket.lines) ? ticket.lines : [];
  if (!lines.length) {
    return res.status(400).json({ ok: false, code: 'empty_ticket', error: 'No items on ticket.' });
  }

  let total = Number(ticket.total);
  if (!isFinite(total) || total <= 0) {
    const sub = lines.reduce((s, ln) => s + (Number(ln.price) || 0), 0);
    const taxRate = Number(ticket.taxRate) || 0.07;
    const taxable = lines.reduce(
      (s, ln) => (ln.taxIncluded ? s : s + (Number(ln.price) || 0)),
      0
    );
    const tax = Math.round(taxable * taxRate * 100) / 100;
    const tip = Math.round((Number(ticket.tip) || 0) * 100) / 100;
    total = Math.round((sub + tax + tip) * 100) / 100;
  }

  const amountCents = Math.round(total * 100);
  if (!isFinite(amountCents) || amountCents < 50) {
    return res.status(400).json({
      ok: false,
      code: 'bad_amount',
      error: 'Total too small to charge.',
    });
  }

  let pmId = pmEnv;
  if (!pmId) {
    const list = await stripeGet(
      secret,
      'payment_methods?customer=' + encodeURIComponent(customerId) + '&type=card&limit=5'
    );
    if (!list.ok) {
      return res.status(502).json({
        ok: false,
        code: 'stripe_list_pm_failed',
        error: (list.data && list.data.error && list.data.error.message) || 'Could not list cards.',
      });
    }
    const first = list.data && list.data.data && list.data.data[0];
    pmId = first && first.id ? first.id : '';
  }

  if (!pmId) {
    return res.status(503).json({
      ok: false,
      code: 'needs_card_setup',
      error: 'No card on file for Taco Voice. Open /voice-signup once to save a card.',
    });
  }

  const orderId = 'TACO-VOICE-' + Date.now();
  const lineSummary = lines
    .map((ln) => {
      const q = ln.qty != null ? ln.qty : 1;
      return q + 'x ' + String(ln.title || 'item');
    })
    .join('; ')
    .slice(0, 400);

  const pi = await stripeForm(secret, 'payment_intents', {
    amount: String(amountCents),
    currency: 'usd',
    customer: customerId,
    payment_method: pmId,
    off_session: 'true',
    confirm: 'true',
    description: 'Taco Express Peabody Voice — ' + orderId,
    receipt_email: email,
    'metadata[shop]': 'taco-express-peabody-voice',
    'metadata[billing_boundary]': 'taco_voice_only_not_martino_not_menu',
    'metadata[orderId]': orderId,
    'metadata[email]': email,
    'metadata[phone]': phone,
    'metadata[name]': name,
    'metadata[fulfillment]': fulfillment,
    'metadata[instructions]': instructions.slice(0, 200),
    'metadata[lines]': lineSummary,
  });

  if (!pi.ok) {
    const msg =
      (pi.data && pi.data.error && pi.data.error.message) || 'Stripe charge failed';
    const code = (pi.data && pi.data.error && pi.data.error.code) || 'stripe_error';
    console.error('[Taco Voice charge]', pi.status, code, msg);
    return res.status(402).json({ ok: false, paid: false, code, error: msg });
  }

  const intent = pi.data || {};
  if (intent.status !== 'succeeded') {
    return res.status(402).json({
      ok: false,
      paid: false,
      code: intent.status || 'not_succeeded',
      error: 'Payment status: ' + (intent.status || 'unknown'),
      paymentIntentId: intent.id || '',
    });
  }

  return res.status(200).json({
    ok: true,
    paid: true,
    paymentIntentId: intent.id,
    amount: total,
    amountCents,
    orderId,
    shop: 'taco-express-peabody-voice',
  });
};
