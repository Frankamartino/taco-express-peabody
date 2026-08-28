/**
 * Queue a Taco Express kitchen ticket (voice cash / pay-at-counter).
 * Same Star printer + kitchen laptop as Martino — header TACO EXPRESS.
 */
const {
  queueKitchenPrint,
  receiptFromVoiceTicket,
} = require('./kitchenPrint');
const { shopClosedCheck } = require('./tacoShopHours');

function clean(v) {
  return String(v || '')
    .replace(/^\uFEFF/, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* No tickets to a dark kitchen. Frank test-ordered at 8:29pm and a burrito
     ticket queued half an hour after close — staff would find it in the morning. */
  const gate = await shopClosedCheck();
  if (gate.closed) {
    return res.status(409).json({ ok: false, code: 'shop_closed', error: gate.message });
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

  const ticket = body.ticket && typeof body.ticket === 'object' ? body.ticket : body;
  const lines = Array.isArray(ticket.lines) ? ticket.lines : [];
  if (!lines.length) {
    return res.status(400).json({ ok: false, code: 'empty_ticket', error: 'No items on ticket.' });
  }

  const cust = ticket.customer && typeof ticket.customer === 'object' ? ticket.customer : {};
  if (!clean(cust.email) || !clean(cust.phone) || !clean(cust.lastName)) {
    return res.status(400).json({
      ok: false,
      code: 'missing_fields',
      error: 'lastName, email, and phone required before kitchen queue.',
    });
  }

  const orderId = clean(body.orderId) || 'TACO-CASH-' + Date.now();
  const receipt = receiptFromVoiceTicket(ticket, {
    orderId,
    paymentMethod: 'cash',
    fulfillment: clean(ticket.fulfillment || body.fulfillment || 'pickup'),
  });

  const result = await queueKitchenPrint(receipt);
  if (!result.queued && !result.skipped) {
    return res.status(503).json({
      ok: false,
      code: result.reason || 'queue_failed',
      error:
        result.reason === 'supabase_not_configured'
          ? 'Kitchen printer not configured on server.'
          : 'Could not queue kitchen ticket.',
    });
  }

  return res.status(200).json({
    ok: true,
    queued: !!result.queued || !!result.skipped,
    skipped: !!result.skipped,
    orderId,
    ticketNumber: result.ticketNumber,
    shop: 'taco-express-peabody',
  });
};
