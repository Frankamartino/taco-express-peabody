const { getConfig } = require('./kitchenPrint');

function headers(cfg) {
  return {
    apikey: cfg.key,
    Authorization: 'Bearer ' + cfg.key,
    'Content-Type': 'application/json',
  };
}

function isTacoOrder(job) {
  const receipt = job && job.receipt_data;
  return !!(
    receipt &&
    typeof receipt === 'object' &&
    (receipt.storeName === 'TACO EXPRESS' ||
      String(receipt.orderId || job.order_id || '').startsWith('TACO-'))
  );
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const cfg = getConfig();
  if (!cfg) {
    return res.status(503).json({ ok: false, error: 'Kitchen queue is not configured.' });
  }

  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  // print_jobs is shared with Martino. Limit only after keeping Taco tickets,
  // or a Martino rush drops unacknowledged orders from the next poll.
  const tacoOnly =
    'or=(order_id.like.TACO-*,receipt_data->>orderId.like.TACO-*,receipt_data->>storeName.eq.' +
    encodeURIComponent('"TACO EXPRESS"') +
    ')';
  const query =
    cfg.url +
    '/rest/v1/print_jobs?select=id,order_id,status,created_at,receipt_data' +
    '&created_at=gte.' +
    encodeURIComponent(since) +
    '&' +
    tacoOnly +
    '&order=created_at.desc&limit=40';

  try {
    const response = await fetch(query, { method: 'GET', headers: headers(cfg) });
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'Could not read the kitchen queue.' });
    }

    const jobs = await response.json().catch(() => []);
    const alerts = (Array.isArray(jobs) ? jobs : [])
      .filter(isTacoOrder)
      .map((job) => {
        const receipt = job.receipt_data || {};
        return {
          id: String(job.id || job.order_id || receipt.orderId || ''),
          orderId: String(receipt.orderId || job.order_id || ''),
          ticketNumber:
            receipt.ticketNumber == null || !Number.isFinite(Number(receipt.ticketNumber))
              ? null
              : Number(receipt.ticketNumber),
          createdAt: job.created_at || receipt.orderedAt || receipt.date || '',
          status: String(job.status || 'pending'),
        };
      })
      .filter((alert) => alert.id);

    return res.status(200).json({ ok: true, alerts });
  } catch (error) {
    console.error('[Taco kitchen alerts]', error);
    return res.status(502).json({ ok: false, error: 'Could not read the kitchen queue.' });
  }
};
