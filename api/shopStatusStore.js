/**
 * Taco Express — emergency / early close for the day (staff PIN).
 * Persists via Supabase menu_sold_out_live slug taco-express-peabody-hours when available.
 */
const { verifyStaffCredentials } = require('./soldOutStore');

const STATUS_SLUG =
  String(process.env.TACO_HOURS_SLUG || 'taco-express-peabody-hours').trim() ||
  'taco-express-peabody-hours';

/** @type {{ closed: boolean, reason: string, closedDate: string, updatedAt?: string, updatedBy?: string }} */
let memoryStatus = {
  closed: false,
  reason: '',
  closedDate: '',
};

function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function getSupabase() {
  const url = clean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(
    /\/$/,
    ''
  );
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  return { url, key };
}

function sbHeaders(cfg) {
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function easternDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function normalizeStatus(raw) {
  const closed = !!(raw && raw.closed);
  const closedDate = String((raw && raw.closedDate) || '').trim();
  const today = easternDateKey();
  if (closed && closedDate && closedDate !== today) {
    return { closed: false, reason: '', closedDate: '', updatedAt: raw.updatedAt, updatedBy: raw.updatedBy };
  }
  return {
    closed,
    reason: closed ? String((raw && raw.reason) || '').trim() : '',
    closedDate: closed ? closedDate || today : '',
    updatedAt: raw && raw.updatedAt,
    updatedBy: raw && raw.updatedBy,
  };
}

function publicPayload(state) {
  const n = normalizeStatus(state);
  return {
    closed: n.closed,
    reason: n.reason || null,
    closedDate: n.closedDate || null,
    updatedAt: n.updatedAt || null,
    updatedBy: n.updatedBy || null,
  };
}

async function fetchShopOverride() {
  const cfg = getSupabase();
  if (!cfg) {
    return normalizeStatus(memoryStatus);
  }
  try {
    const q =
      cfg.url +
      '/rest/v1/menu_sold_out_live?restaurant_slug=eq.' +
      encodeURIComponent(STATUS_SLUG) +
      '&select=items,match_name_contains,updated_at,updated_by';
    const r = await fetch(q, { method: 'GET', headers: sbHeaders(cfg) });
    if (!r.ok) return normalizeStatus(memoryStatus);
    const rows = await r.json().catch(() => []);
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data) return { closed: false, reason: '', closedDate: '' };
    const items = Array.isArray(data.items) ? data.items.map(String) : [];
    const patterns = Array.isArray(data.match_name_contains)
      ? data.match_name_contains.map(String)
      : [];
    const closed = items.some((x) => /^(EMERGENCY_CLOSED|CLOSED_TODAY|CLOSED)$/i.test(x));
    const reason = patterns[0] || '';
    const closedDate = patterns[1] || easternDateKey(data.updated_at ? new Date(data.updated_at) : new Date());
    const state = normalizeStatus({
      closed,
      reason,
      closedDate,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    });
    memoryStatus = state;
    return state;
  } catch (e) {
    console.warn('[Taco shopStatus] fetch error', e && e.message ? e.message : e);
    return normalizeStatus(memoryStatus);
  }
}

async function saveShopOverride(state) {
  const n = normalizeStatus(state);
  memoryStatus = n;
  const cfg = getSupabase();
  if (!cfg) return { ok: true, persisted: 'memory' };
  try {
    const row = {
      restaurant_slug: STATUS_SLUG,
      items: n.closed ? ['EMERGENCY_CLOSED'] : [],
      match_name_contains: n.closed ? [n.reason || 'Closed early today', n.closedDate] : [],
      updated_at: n.updatedAt || new Date().toISOString(),
      updated_by: n.updatedBy || null,
    };
    const r = await fetch(cfg.url + '/rest/v1/menu_sold_out_live', {
      method: 'POST',
      headers: Object.assign({}, sbHeaders(cfg), {
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.warn('[Taco shopStatus] write HTTP', r.status, errText.slice(0, 200));
      return { ok: true, persisted: 'memory', error: 'supabase_write_failed' };
    }
    return { ok: true, persisted: 'supabase' };
  } catch (e) {
    console.warn('[Taco shopStatus] save error', e && e.message ? e.message : e);
    return { ok: true, persisted: 'memory', error: 'supabase_exception' };
  }
}

function buildOverrideLine(state) {
  const n = normalizeStatus(state);
  if (!n.closed) return '';
  const why = n.reason ? ' Reason: ' + n.reason + '.' : '';
  return (
    'EMERGENCY / EARLY CLOSE (AUTHORITATIVE — OVERRIDES NORMAL HOURS): We are CLOSED for the rest of today (Eastern ' +
    n.closedDate +
    ').' +
    why +
    ' Do NOT take live orders, do NOT promise pickup today, do NOT charge. You may still walk the menu for a future visit. Be calm and caring. Staff can reopen with staff_set_shop_status.'
  );
}

async function staffSetShopStatus(req) {
  const auth = verifyStaffCredentials(req.owner_name || req.ownerName, req.pin);
  if (!auth.ok) return { ok: false, message: auth.error || 'Staff verification failed.' };

  const closedRaw = req.closed != null ? req.closed : req.is_closed;
  const closed =
    closedRaw === true ||
    closedRaw === 'true' ||
    closedRaw === 1 ||
    closedRaw === '1' ||
    /^(close|closed|shutdown|evacuate|gas.?leak|go.?home)/i.test(String(req.action || ''));

  const reason = String(req.reason || req.message || '').trim();
  const next = {
    closed: !!closed,
    reason: closed ? reason || 'Closed early today' : '',
    closedDate: closed ? easternDateKey() : '',
    updatedAt: new Date().toISOString(),
    updatedBy: String(req.owner_name || req.ownerName || '').trim(),
  };
  const saved = await saveShopOverride(next);
  return {
    ok: true,
    message: closed
      ? 'Restaurant marked CLOSED for the rest of today' +
        (reason ? ' — ' + reason : '') +
        '. Customers will be told we are closed.'
      : 'Restaurant reopened for normal hours (if within schedule).',
    state: publicPayload(next),
    persisted: saved.persisted,
  };
}

module.exports = {
  fetchShopOverride,
  publicPayload,
  buildOverrideLine,
  staffSetShopStatus,
  easternDateKey,
  normalizeStatus,
};
