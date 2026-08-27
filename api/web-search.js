/**
 * POST /api/web-search  { query: "Peabody MA weather today" }
 * Used by Diego voice tool web_search.
 */
const { runDiegoWebSearch } = require('./diegoWebSearch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
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

  const query = String(body.query || body.q || '').trim();
  if (!query) {
    return res.status(400).json({ ok: false, error: 'query required' });
  }

  const result = await runDiegoWebSearch(query);
  return res.status(200).json({ ok: true, query, result });
};
