/**
 * Mem0 API for Taco Massimo — recall / remember by email.
 * POST { action: "recall"|"remember", email, text? }
 */
const {
  mem0Configured,
  mem0UserIdFromEmail,
  searchMem0ForUser,
  addMem0Memory,
} = require('./mem0Client');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!mem0Configured()) {
    return res.status(503).json({
      error: 'Mem0 not configured',
      hint: 'Set MEM0_API_KEY on the taco-express-peabody Vercel project',
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

  const action = String(body.action || '').trim().toLowerCase();
  const email = String(body.email || '').trim();
  const userId = mem0UserIdFromEmail(email);
  if (!userId) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (action === 'recall') {
    const memories = await searchMem0ForUser(userId);
    return res.status(200).json({ ok: true, email, memories, configured: true });
  }

  if (action === 'remember') {
    const text = String(body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'text required' });
    const result = await addMem0Memory(userId, text, {
      shop: 'taco-express-peabody',
      firstName: String(body.firstName || ''),
      lastName: String(body.lastName || ''),
      phone: String(body.phone || ''),
    });
    return res.status(200).json({ ok: !!result.ok, email });
  }

  return res.status(400).json({ error: 'action must be recall or remember' });
};
