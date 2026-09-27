/**
 * Taco Express — sold out / unavailable / out for today (live 86).
 * Persists in Supabase menu_sold_out_live (slug taco-express-peabody) when configured;
 * falls back to in-memory for the current serverless instance.
 */
const { MENU_ITEMS } = require('./menuCatalog');
const { readTurnOffToday } = require('./turnOffToday');

const RESTAURANT_SLUG =
  String(process.env.TACO_RESTAURANT_SLUG || 'taco-express-peabody').trim() ||
  'taco-express-peabody';

/** @type {{ ids: string[], updatedAt?: string, updatedBy?: string }} */
let memoryState = { ids: [] };

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

function normalizeKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStaffPin(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function verifyStaffCredentials(ownerName, pin) {
  const expectedPin = normalizeStaffPin(
    process.env.TACO_STAFF_PIN || process.env.MARTINO_STAFF_PIN || '2468'
  );
  const gotPin = normalizeStaffPin(pin);
  if (!expectedPin || gotPin !== expectedPin) {
    return { ok: false, error: 'Invalid staff PIN.' };
  }
  const allowedRaw =
    process.env.TACO_STAFF_OWNER_NAMES ||
    process.env.MARTINO_STAFF_OWNER_NAMES ||
    'Frank A Martino,Frank Martino,Frankamartino,Frank';
  const allowed = allowedRaw
    .split(',')
    .map((s) => normalizeKey(s))
    .filter(Boolean);
  const got = normalizeKey(ownerName);
  if (!got) return { ok: false, error: 'Owner or manager name is required.' };
  const match = allowed.some(
    (name) => got === name || got.includes(name) || name.includes(got)
  );
  if (!match) {
    return { ok: false, error: 'Staff name not recognized for this restaurant.' };
  }
  return { ok: true };
}

function itemById(id) {
  return MENU_ITEMS.find((i) => i.id === id) || null;
}

function resolveItemIds(itemName, matchContains) {
  const ids = new Set();
  const pattern = normalizeKey(matchContains);
  if (pattern) {
    MENU_ITEMS.forEach((item) => {
      const blob = normalizeKey(item.id + ' ' + item.name + ' ' + item.title + ' ' + item.section);
      if (blob.includes(pattern)) ids.add(item.id);
    });
  }
  const raw = String(itemName || '').trim();
  if (raw) {
    const norm = normalizeKey(raw);
    const exactId = MENU_ITEMS.find((i) => i.id === raw || normalizeKey(i.id) === norm);
    if (exactId) {
      ids.add(exactId.id);
    } else {
      const byName = MENU_ITEMS.find((i) => normalizeKey(i.name) === norm);
      if (byName) {
        ids.add(byName.id);
      } else {
        const protein = /\bshrimp\b/.test(norm)
          ? 'shrimp'
          : /\bchicken\b/.test(norm)
            ? 'chicken'
            : /\bpork\b/.test(norm)
              ? 'pork'
              : /\bbeef\b/.test(norm)
                ? 'beef'
                : '';
        const isPlate = /\b(plate|dinner)\b/.test(norm);
        let prefix = '';
        if (/\bburrito/.test(norm)) prefix = 'burrito';
        else if (/\benchilada/.test(norm)) prefix = 'enchilada';
        else if (/\bquesadilla/.test(norm)) prefix = 'quesadilla';
        else if (/\btaco/.test(norm)) prefix = 'tacos';
        if (prefix && protein) {
          const id = prefix + '-' + protein + (isPlate ? '-plate' : '');
          if (itemById(id)) ids.add(id);
        }
        if (!ids.size) {
          MENU_ITEMS.forEach((item) => {
            if (normalizeKey(item.name).includes(norm) || norm.includes(normalizeKey(item.name))) {
              ids.add(item.id);
            }
          });
        }
      }
    }
  }
  return [...ids];
}

function labelsForIds(ids) {
  return ids.map((id) => {
    const item = itemById(id);
    return item ? item.name : id;
  });
}

async function fetchLiveState(now = new Date()) {
  const fileOff = readTurnOffToday(now);
  if (fileOff && fileOff.soldOutAll) {
    const ids = MENU_ITEMS.map((item) => item.id);
    return {
      ids,
      updatedAt: fileOff.updatedAt,
      updatedBy: fileOff.updatedBy || 'Frank Martino',
      source: 'turn-off-today',
    };
  }
  const cfg = getSupabase();
  if (!cfg) {
    return {
      ids: [...memoryState.ids],
      updatedAt: memoryState.updatedAt,
      updatedBy: memoryState.updatedBy,
      source: 'memory',
    };
  }
  try {
    const q =
      cfg.url +
      '/rest/v1/menu_sold_out_live?restaurant_slug=eq.' +
      encodeURIComponent(RESTAURANT_SLUG) +
      '&select=items,match_name_contains,updated_at,updated_by';
    const r = await fetch(q, { method: 'GET', headers: sbHeaders(cfg) });
    if (!r.ok) {
      console.warn('[Taco soldOut] read HTTP', r.status);
      return {
        ids: [...memoryState.ids],
        updatedAt: memoryState.updatedAt,
        updatedBy: memoryState.updatedBy,
        source: 'memory',
      };
    }
    const rows = await r.json().catch(() => []);
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (!data) {
      return { ids: [], source: 'supabase' };
    }
    /* Prefer ids stored in items when they look like catalog ids; else resolve names. */
    const rawItems = Array.isArray(data.items) ? data.items.map(String) : [];
    const ids = new Set();
    rawItems.forEach((entry) => {
      if (itemById(entry)) {
        ids.add(entry);
        return;
      }
      resolveItemIds(entry, '').forEach((id) => ids.add(id));
    });
    const patterns = Array.isArray(data.match_name_contains)
      ? data.match_name_contains.map(String)
      : [];
    patterns.forEach((p) => resolveItemIds('', p).forEach((id) => ids.add(id)));
    const state = {
      ids: [...ids],
      updatedAt: data.updated_at || undefined,
      updatedBy: data.updated_by || undefined,
      source: 'supabase',
    };
    memoryState = { ids: state.ids, updatedAt: state.updatedAt, updatedBy: state.updatedBy };
    return state;
  } catch (e) {
    console.warn('[Taco soldOut] fetch error', e && e.message ? e.message : e);
    return {
      ids: [...memoryState.ids],
      updatedAt: memoryState.updatedAt,
      updatedBy: memoryState.updatedBy,
      source: 'memory',
    };
  }
}

async function saveLiveState(state) {
  memoryState = {
    ids: [...state.ids],
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
  };
  const cfg = getSupabase();
  if (!cfg) return { ok: true, persisted: 'memory' };
  try {
    const row = {
      restaurant_slug: RESTAURANT_SLUG,
      items: state.ids,
      match_name_contains: [],
      updated_at: state.updatedAt || new Date().toISOString(),
      updated_by: state.updatedBy || null,
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
      console.warn('[Taco soldOut] write HTTP', r.status, errText.slice(0, 200));
      return { ok: true, persisted: 'memory', error: 'supabase_write_failed' };
    }
    return { ok: true, persisted: 'supabase' };
  } catch (e) {
    console.warn('[Taco soldOut] save error', e && e.message ? e.message : e);
    return { ok: true, persisted: 'memory', error: 'supabase_exception' };
  }
}

function publicPayload(state) {
  const ids = Array.isArray(state.ids) ? state.ids : [];
  return {
    ids,
    items: labelsForIds(ids),
    updatedAt: state.updatedAt || null,
    updatedBy: state.updatedBy || null,
  };
}

function buildRuntimeLine(state) {
  const labels = labelsForIds(state.ids || []);
  if (!labels.length) return '';
  return (
    'SOLD OUT / UNAVAILABLE TODAY (never add_order_line for these): ' +
    labels.join('; ') +
    ' — tell customers warmly; suggest a similar protein or item.'
  );
}

function listMessage(state) {
  const labels = labelsForIds(state.ids || []);
  if (!labels.length) return 'Nothing is marked sold out / unavailable right now.';
  return 'Sold out / unavailable today: ' + labels.join('; ');
}

async function staffSetAvailability(req) {
  const auth = verifyStaffCredentials(req.owner_name || req.ownerName, req.pin);
  if (!auth.ok) return { ok: false, message: auth.error || 'Staff verification failed.' };

  const soldRaw = req.sold_out != null ? req.sold_out : req.soldOut;
  const soldOut =
    soldRaw === true || soldRaw === 'true' || soldRaw === 1 || soldRaw === '1';

  const wantAll =
    req.all === true ||
    req.all === 'true' ||
    /^(all|everything|entire.?menu)$/i.test(String(req.item_name || req.itemName || req.match_contains || req.matchContains || req.action || ''));

  const targetIds = wantAll
    ? MENU_ITEMS.map((item) => item.id)
    : resolveItemIds(req.item_name || req.itemName, req.match_contains || req.matchContains);
  if (!targetIds.length) {
    return {
      ok: false,
      message:
        'Could not match that item. Name it clearly (e.g. "shrimp tacos", "Burrito · Pork") or use match_contains like "shrimp".',
    };
  }

  const current = await fetchLiveState();
  const set = new Set(current.ids || []);
  const changed = labelsForIds(targetIds);
  if (soldOut) {
    targetIds.forEach((id) => set.add(id));
  } else {
    targetIds.forEach((id) => set.delete(id));
  }

  const next = {
    ids: [...set],
    updatedAt: new Date().toISOString(),
    updatedBy: String(req.owner_name || req.ownerName || '').trim(),
  };
  const saved = await saveLiveState(next);
  const action = soldOut ? 'sold out / unavailable for today' : 'back on the menu (available)';
  return {
    ok: true,
    message:
      changed.join(', ') +
      ' marked ' +
      action +
      '. Live menu updated' +
      (saved.persisted === 'supabase' ? '.' : ' (this server instance — Supabase write pending).'),
    state: publicPayload(next),
    persisted: saved.persisted,
  };
}

async function staffListSoldOut(ownerName, pin) {
  const auth = verifyStaffCredentials(ownerName, pin);
  if (!auth.ok) return { ok: false, message: auth.error || 'Staff verification failed.' };
  const state = await fetchLiveState();
  return { ok: true, message: listMessage(state), state: publicPayload(state) };
}

module.exports = {
  fetchLiveState,
  publicPayload,
  buildRuntimeLine,
  staffSetAvailability,
  staffListSoldOut,
  verifyStaffCredentials,
  resolveItemIds,
};
