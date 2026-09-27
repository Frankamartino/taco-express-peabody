'use strict';

/** Short-lived account name check. Returns no secrets. 404 without the probe token. */
module.exports = async function handler(req, res) {
  const expected = String(process.env.PROBE_TOKEN || '');
  const got = String(req.headers['x-probe-token'] || '');
  if (!expected || got !== expected) {
    return res.status(404).json({ error: 'not found' });
  }
  const secret = String(process.env.STRIPE_SECRET_KEY || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
  if (!secret) return res.status(503).json({ configured: false });

  const accountRes = await fetch('https://api.stripe.com/v1/account', {
    headers: { Authorization: 'Bearer ' + secret },
  });
  const account = await accountRes.json().catch(() => ({}));
  const hooksRes = await fetch('https://api.stripe.com/v1/webhook_endpoints?limit=20', {
    headers: { Authorization: 'Bearer ' + secret },
  });
  const hooks = await hooksRes.json().catch(() => ({}));
  const profile = account.business_profile || {};
  const dashboard = (account.settings && account.settings.dashboard) || {};
  const payments = (account.settings && account.settings.payments) || {};
  const endpoints = Array.isArray(hooks.data)
    ? hooks.data.map((row) => ({
        url: row.url,
        status: row.status,
        events: row.enabled_events,
      }))
    : [];

  return res.status(accountRes.ok ? 200 : 502).json({
    configured: true,
    livemode: account.livemode === true,
    charges_enabled: account.charges_enabled === true,
    business_name: profile.name || null,
    business_url: profile.url || null,
    display_name: dashboard.display_name || null,
    statement_descriptor: payments.statement_descriptor || null,
    country: account.country || null,
    endpoints,
  });
};
