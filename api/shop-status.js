/**
 * GET  /api/shop-status — public emergency-close flag
 * POST /api/shop-status — staff close / reopen (owner_name + pin)
 */
const {
  fetchShopOverride,
  publicPayload,
  staffSetShopStatus,
} = require('./shopStatusStore');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const state = await fetchShopOverride();
    return res.status(200).json(publicPayload(state));
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') body = {};

  const result = await staffSetShopStatus(body);
  return res
    .status(result.ok ? 200 : /PIN|name/i.test(result.message || '') ? 403 : 400)
    .json(result);
};
