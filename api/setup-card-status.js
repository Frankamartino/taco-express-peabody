/**
 * After Stripe Checkout setup success — return customer + payment_method for Taco Voice env.
 * VOICE billing only. Never Martino. Never main menu site.
 */
function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\r\n]+/g, '')
    .trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = clean(process.env.STRIPE_SECRET_KEY);
  if (!secret) {
    return res.status(503).json({ error: 'STRIPE_SECRET_KEY not set' });
  }

  const sessionId = clean(
    (req.query && req.query.session_id) ||
      (req.url && new URL(req.url, 'http://localhost').searchParams.get('session_id'))
  );
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'session_id required' });
  }

  const r = await fetch(
    'https://api.stripe.com/v1/checkout/sessions/' +
      encodeURIComponent(sessionId) +
      '?expand[]=setup_intent',
    { headers: { Authorization: 'Bearer ' + secret } }
  );
  const session = await r.json().catch(() => ({}));
  if (!r.ok) {
    return res.status(r.status).json({
      error: (session.error && session.error.message) || 'Session lookup failed',
    });
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer && session.customer.id
        ? session.customer.id
        : '';

  let paymentMethodId = '';
  const si = session.setup_intent;
  if (si && typeof si === 'object') {
    paymentMethodId =
      typeof si.payment_method === 'string'
        ? si.payment_method
        : si.payment_method && si.payment_method.id
          ? si.payment_method.id
          : '';
  }

  return res.status(200).json({
    ok: true,
    shop: 'taco-express-peabody-voice',
    customer_id: customerId,
    payment_method_id: paymentMethodId,
    email: session.customer_email || session.customer_details?.email || '',
    hint: 'Paste TACO_VOICE_STRIPE_CUSTOMER_ID and TACO_VOICE_STRIPE_PAYMENT_METHOD_ID into the taco-express-peabody Vercel project only. Do not put these on Martino Pasta Bar.',
  });
};
