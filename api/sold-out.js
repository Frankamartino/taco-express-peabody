/**
 * GET  /api/sold-out  — public live list (ids + names)
 * POST /api/sold-out  — staff set / list (owner_name + pin)
 */
const {
  fetchLiveState,
  publicPayload,
  staffSetAvailability,
  staffListSoldOut,
} = require('./soldOutStore');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const state = await fetchLiveState();
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

  const action = String(body.action || 'set').toLowerCase();
  if (action === 'list') {
    const result = await staffListSoldOut(body.owner_name || body.ownerName, body.pin);
    return res.status(result.ok ? 200 : 403).json(result);
  }

  const result = await staffSetAvailability(body);
  return res.status(result.ok ? 200 : result.message && /PIN|name/i.test(result.message) ? 403 : 400).json(
    result
  );
};
