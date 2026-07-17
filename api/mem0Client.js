/**
 * Mem0 long-term memory for Taco Express Peabody voice (/voice).
 * User key = email (normalized). Requires MEM0_API_KEY on Vercel.
 */
const MEM0_BASE = 'https://api.mem0.ai';

function mem0Key() {
  return (process.env.MEM0_API_KEY || '').trim();
}

function mem0Configured() {
  return !!mem0Key();
}

function mem0UserIdFromEmail(email) {
  if (!email) return null;
  const e = String(email).trim().toLowerCase();
  if (!e || !e.includes('@')) return null;
  return `email:${e}`;
}

async function searchMem0ForUser(userId, limit = 8) {
  const key = mem0Key();
  if (!key || !userId) return [];
  try {
    const r = await fetch(`${MEM0_BASE}/v2/memories/search/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query:
          'customer name phone email food allergies preferences past orders favorites usual order pickup delivery',
        filters: { user_id: userId },
        limit,
      }),
    });
    if (!r.ok) {
      console.warn('[Taco Mem0] search failed:', r.status, (await r.text()).slice(0, 200));
      return [];
    }
    const data = await r.json();
    const items = Array.isArray(data) ? data : data.results || [];
    return items
      .map((m) => (m && m.memory ? String(m.memory) : ''))
      .filter(Boolean);
  } catch (e) {
    console.warn('[Taco Mem0] search error:', e instanceof Error ? e.message : e);
    return [];
  }
}

async function addMem0Memory(userId, text, metadata) {
  const key = mem0Key();
  if (!key || !userId || !String(text || '').trim()) return { ok: false };
  try {
    const r = await fetch(`${MEM0_BASE}/v1/memories/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: String(text).trim() }],
        user_id: userId,
        metadata: metadata || { shop: 'taco-express-peabody' },
      }),
    });
    if (!r.ok) {
      console.warn('[Taco Mem0] add failed:', r.status, (await r.text()).slice(0, 200));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Taco Mem0] add error:', e instanceof Error ? e.message : e);
    return { ok: false };
  }
}

module.exports = {
  mem0Configured,
  mem0UserIdFromEmail,
  searchMem0ForUser,
  addMem0Memory,
};
