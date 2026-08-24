/**
 * Queue a kitchen ticket into the SAME Supabase print_jobs table as Martino.
 * Kitchen laptop print-relay + portal pick it up — no second PC/printer.
 *
 * Env (taco-express-peabody Vercel — same values as martino-bar):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function getConfig() {
  const url = clean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(
    /\/$/,
    ''
  );
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  return { url, key };
}

function headers(cfg) {
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function nextDailyTicket(cfg) {
  try {
    const r = await fetch(cfg.url + '/rest/v1/rpc/next_daily_ticket', {
      method: 'POST',
      headers: headers(cfg),
      body: '{}',
    });
    if (!r.ok) return undefined;
    const data = await r.json().catch(() => null);
    const n = typeof data === 'number' ? data : parseInt(String(data), 10);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

async function existingJobs(cfg, orderId) {
  const q =
    cfg.url +
    '/rest/v1/print_jobs?order_id=eq.' +
    encodeURIComponent(orderId) +
    '&select=id,status,receipt_data&order=created_at.desc';
  const r = await fetch(q, { method: 'GET', headers: headers(cfg) });
  if (!r.ok) return [];
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {object} receipt — ReceiptData-shaped (orderId, items, totals, …)
 * @returns {{ queued: boolean, skipped?: boolean, reason?: string, ticketNumber?: number }}
 */
async function queueKitchenPrint(receipt) {
  const cfg = getConfig();
  if (!cfg) {
    console.warn('[Taco kitchenPrint] Supabase not configured — skip queue');
    return { queued: false, reason: 'supabase_not_configured' };
  }

  const orderId = clean(receipt && receipt.orderId);
  if (!orderId) {
    return { queued: false, reason: 'missing_order_id' };
  }

  const jobs = await existingJobs(cfg, orderId);
  if (jobs.some((j) => j.status === 'pending' || j.status === 'printing')) {
    console.log('[Taco kitchenPrint] Skip duplicate — already pending:', orderId);
    return { queued: false, skipped: true, reason: 'already_pending' };
  }

  let ticketNumber =
    receipt.ticketNumber != null && Number.isFinite(Number(receipt.ticketNumber))
      ? Number(receipt.ticketNumber)
      : undefined;
  const prior = jobs.find(
    (j) => j.receipt_data && typeof j.receipt_data.ticketNumber === 'number'
  );
  if (prior) {
    ticketNumber = prior.receipt_data.ticketNumber;
  } else if (ticketNumber === undefined) {
    ticketNumber = await nextDailyTicket(cfg);
  }

  const finalReceipt = {
    address: '58 Pulaski St, Peabody MA 01960',
    phone: '(978) 982-1800',
    date: new Date().toISOString(),
    orderedAt: new Date().toISOString(),
    ...receipt,
    orderId,
    ticketNumber,
    storeName: 'TACO EXPRESS',
  };

  const r = await fetch(cfg.url + '/rest/v1/print_jobs', {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({
      order_id: orderId,
      receipt_data: finalReceipt,
      status: 'pending',
    }),
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    console.error('[Taco kitchenPrint] insert failed', r.status, errText.slice(0, 300));
    return { queued: false, reason: 'insert_failed' };
  }

  console.log('[Taco kitchenPrint] Queued', orderId, 'ticket#', ticketNumber);
  return { queued: true, ticketNumber };
}

/** Build receipt items + money fields from a voice ticket snapshot. */
function receiptFromVoiceTicket(ticket, extras) {
  const t = ticket && typeof ticket === 'object' ? ticket : {};
  const cust = t.customer && typeof t.customer === 'object' ? t.customer : {};
  const lines = Array.isArray(t.lines) ? t.lines : [];
  const taxRate = Number(t.taxRate) || 0.07;
  const tip = Math.round((Number(t.tip) || 0) * 100) / 100;

  const items = lines.map((ln) => {
    const qty = ln.qty != null ? Number(ln.qty) : 1;
    const lineTotal = Math.round((Number(ln.price) || 0) * 100) / 100;
    const unit = qty > 0 ? Math.round((lineTotal / qty) * 100) / 100 : lineTotal;
    const title = String(ln.title || 'item');
    const note = clean(ln.note);
    return {
      name: note ? title + ' — ' + note : title,
      quantity: qty,
      price: unit,
      total: lineTotal,
    };
  });

  const subtotal = Math.round(items.reduce((s, it) => s + it.total, 0) * 100) / 100;
  const taxable = lines.reduce(
    (s, ln) => (ln.taxIncluded ? s : s + (Number(ln.price) || 0)),
    0
  );
  const tax = Math.round(taxable * taxRate * 100) / 100;
  let total = Number(t.total);
  if (!isFinite(total) || total <= 0) {
    total = Math.round((subtotal + tax + tip) * 100) / 100;
  }

  const name = clean(
    [cust.firstName, cust.lastName].filter(Boolean).join(' ') ||
      extras.customerName ||
      'Customer'
  );
  const instructions = clean(t.instructions || extras.instructions || '');

  return {
    orderId: clean(extras.orderId),
    customerName: name,
    customerPhone: clean(cust.phone || extras.phone || ''),
    orderType: clean(t.fulfillment || extras.fulfillment || 'pickup') || 'pickup',
    kitchenNote: instructions && instructions.toLowerCase() !== 'none' ? instructions : undefined,
    items,
    subtotal,
    tax,
    tip,
    total,
    paymentMethod: extras.paymentMethod === 'cash' ? 'cash' : 'stripe',
    stripeRef: clean(extras.stripeRef || ''),
  };
}

/** Build receipt from a paid Stripe Checkout session (with line_items expanded). */
function receiptFromCheckoutSession(session) {
  const meta = (session && session.metadata) || {};
  const orderId = clean(meta.orderId) || 'TACO-WEB-' + Date.now();
  const tipCents = parseInt(meta.tipCents || '0', 10) || 0;
  const tip = tipCents / 100;

  const rawLines =
    (session.line_items && session.line_items.data) ||
    (session.line_items && Array.isArray(session.line_items) ? session.line_items : []) ||
    [];

  const foodItems = [];
  let tax = 0;
  for (const li of rawLines) {
    const prod = li.price && li.price.product;
    const prodName =
      prod && typeof prod === 'object' ? clean(prod.name) : '';
    const name = clean(li.description || prodName);
    const qty = Number(li.quantity) || 1;
    const amount = (Number(li.amount_total) || 0) / 100;
    const lower = name.toLowerCase();
    if (lower.includes('meals tax') || lower === 'tax') {
      tax += amount;
      continue;
    }
    if (lower.startsWith('tip')) continue;
    const unit = qty > 0 ? Math.round((amount / qty) * 100) / 100 : amount;
    foodItems.push({ name: name || 'Item', quantity: qty, price: unit, total: amount });
  }

  const subtotal = Math.round(foodItems.reduce((s, it) => s + it.total, 0) * 100) / 100;
  const total =
    session.amount_total != null
      ? session.amount_total / 100
      : Math.round((subtotal + tax + tip) * 100) / 100;

  const pi = session.payment_intent;
  const piId = typeof pi === 'string' ? pi : pi && pi.id ? pi.id : '';
  const stripeRef = piId ? String(piId).slice(-8) : '';

  const instructions = clean(meta.instructions);

  return {
    orderId,
    customerName: clean(meta.name) || clean(session.customer_details && session.customer_details.name),
    customerPhone: clean(meta.phone),
    orderType: clean(meta.fulfillment) || 'pickup',
    kitchenNote: instructions || undefined,
    items: foodItems,
    subtotal,
    tax: Math.round(tax * 100) / 100,
    tip,
    total,
    paymentMethod: 'stripe',
    stripeRef,
    stripeSessionId: session.id,
  };
}

module.exports = {
  queueKitchenPrint,
  receiptFromVoiceTicket,
  receiptFromCheckoutSession,
  getConfig,
};
