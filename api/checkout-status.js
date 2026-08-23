function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = clean(process.env.STRIPE_SECRET_KEY);
  if (!secret) {
    return res.status(503).json({ ok: false, error: 'Stripe not configured.' });
  }

  const sessionId = clean(req.query && req.query.session_id);
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'session_id required' });
  }

  const r = await fetch(
    'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + secret },
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data.error && data.error.message) || 'Could not load checkout session';
    return res.status(502).json({ ok: false, error: msg });
  }

  return res.status(200).json({
    ok: true,
    paid: data.payment_status === 'paid',
    status: data.status,
    paymentStatus: data.payment_status,
    amountTotal: data.amount_total != null ? data.amount_total / 100 : null,
    customerEmail: data.customer_details && data.customer_details.email,
    orderId: data.metadata && data.metadata.orderId,
    metadata: data.metadata || {},
  });
};
