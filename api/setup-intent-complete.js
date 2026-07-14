/**
 * Confirm SetupIntent finished — return customer + payment_method for Taco Voice.
 */
function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\r\n]+/g, '')
    .trim();
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
    return res.status(503).json({ error: 'STRIPE_SECRET_KEY not set' });
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

  const setupIntentId = clean(body.setupIntentId || body.setup_intent_id);
  if (!setupIntentId || !setupIntentId.startsWith('seti_')) {
    return res.status(400).json({ error: 'setupIntentId required' });
  }

  const r = await fetch(
    'https://api.stripe.com/v1/setup_intents/' + encodeURIComponent(setupIntentId),
    { headers: { Authorization: 'Bearer ' + secret } }
  );
  const si = await r.json().catch(() => ({}));
  if (!r.ok) {
    return res.status(r.status).json({
      error: (si.error && si.error.message) || 'SetupIntent lookup failed',
    });
  }

  if (si.status !== 'succeeded') {
    return res.status(400).json({
      ok: false,
      status: si.status,
      error: 'Card setup not complete yet (status: ' + si.status + ')',
    });
  }

  const customerId = typeof si.customer === 'string' ? si.customer : '';
  const paymentMethodId =
    typeof si.payment_method === 'string'
      ? si.payment_method
      : si.payment_method && si.payment_method.id
        ? si.payment_method.id
        : '';

  if (customerId && paymentMethodId) {
    await fetch('https://api.stripe.com/v1/customers/' + encodeURIComponent(customerId), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'invoice_settings[default_payment_method]=' + encodeURIComponent(paymentMethodId),
    }).catch(function () {});
  }

  return res.status(200).json({
    ok: true,
    shop: 'taco-express-peabody-voice',
    customerId,
    paymentMethodId,
    livemode: !!si.livemode,
    readyForVoicePay: true,
    hint: 'Card is on file for Taco Voice. Say yes when Massimo asks to charge — no taps on /voice.',
  });
};
