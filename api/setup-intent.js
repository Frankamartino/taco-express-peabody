/**
 * Taco Express Peabody VOICE only — SetupIntent for on-page card recruit form.
 * Not Martino. Not the DoorDash menu site.
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
  const publishable = clean(process.env.STRIPE_PUBLISHABLE_KEY);
  if (!secret) {
    return res.status(503).json({
      error: 'STRIPE_SECRET_KEY not set on taco-express-peabody (Voice). Use live sk_live_ for live cards.',
    });
  }
  if (!publishable) {
    return res.status(503).json({
      error: 'STRIPE_PUBLISHABLE_KEY not set on taco-express-peabody (Voice). Use matching live pk_live_.',
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

  let customerId = '';
  const search = await stripeGet(
    secret,
    'customers?email=' + encodeURIComponent(email) + '&limit=1'
  );
  if (search.ok && search.data.data && search.data.data[0]) {
    customerId = search.data.data[0].id;
  }

  if (!customerId) {
    const created = await stripeForm(secret, 'customers', {
      email,
      name: name || undefined,
      phone: phone || undefined,
      'metadata[shop]': 'taco-express-peabody-voice',
      'metadata[billing_boundary]': 'taco_voice_only_not_martino_not_menu',
    });
    if (!created.ok || !created.data.id) {
      return res.status(502).json({
        error: (created.data.error && created.data.error.message) || 'Could not create customer',
      });
    }
    customerId = created.data.id;
  } else if (name || phone) {
    await stripeForm(secret, 'customers/' + customerId, {
      name: name || undefined,
      phone: phone || undefined,
    });
  }

  const si = await stripeForm(secret, 'setup_intents', {
    customer: customerId,
    'payment_method_types[0]': 'card',
    usage: 'off_session',
    'metadata[shop]': 'taco-express-peabody-voice',
    'metadata[email]': email,
  });

  if (!si.ok || !si.data.client_secret) {
    return res.status(502).json({
      error: (si.data.error && si.data.error.message) || 'Could not start card setup',
    });
  }

  return res.status(200).json({
    ok: true,
    shop: 'taco-express-peabody-voice',
    publishableKey: publishable,
    clientSecret: si.data.client_secret,
    setupIntentId: si.data.id,
    customerId,
    email,
    liveMode: !!si.data.livemode,
  });
};
