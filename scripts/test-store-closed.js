const assert = require('assert');
const { getStoreStatus, isStoreClosed, closedPayload } = require('../api/storeStatus');
const createCheckout = require('../api/create-checkout');
const chargeOrder = require('../api/charge-order');
const realtimeToken = require('../api/realtime-token');
const supervisor = require('../api/supervisor');
const storeStatusApi = require('../api/store-status');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader: function (k, v) { this.headers[k] = v; },
    status: function (code) { this.statusCode = code; return this; },
    json: function (data) { this.body = data; return this; },
    end: function () { return this; },
  };
}

async function run() {
  const status = getStoreStatus();
  assert.strictEqual(status.acceptingOrders, false, 'store should be closed');
  assert.ok(isStoreClosed(), 'isStoreClosed should be true');
  assert.strictEqual(closedPayload().code, 'store_closed');

  const checkoutRes = mockRes();
  await createCheckout({ method: 'POST', body: {} }, checkoutRes);
  assert.strictEqual(checkoutRes.statusCode, 503);
  assert.strictEqual(checkoutRes.body.code, 'store_closed');
  assert.ok(/closed early/i.test(checkoutRes.body.error));

  const chargeRes = mockRes();
  await chargeOrder({ method: 'POST', body: { ticket: { customer: { email: 'frankamartino@gmail.com' } } } }, chargeRes);
  assert.strictEqual(chargeRes.statusCode, 503);
  assert.strictEqual(chargeRes.body.code, 'store_closed');

  const tokenRes = mockRes();
  await realtimeToken({ method: 'POST', body: {} }, tokenRes);
  assert.strictEqual(tokenRes.statusCode, 503);
  assert.strictEqual(tokenRes.body.code, 'store_closed');

  const supervisorRes = mockRes();
  await supervisor({ method: 'POST', body: { question: 'chicken tacos' } }, supervisorRes);
  assert.strictEqual(supervisorRes.statusCode, 503);
  assert.strictEqual(supervisorRes.body.code, 'store_closed');

  const statusRes = mockRes();
  await storeStatusApi({ method: 'GET' }, statusRes);
  assert.strictEqual(statusRes.statusCode, 200);
  assert.strictEqual(statusRes.body.acceptingOrders, false);

  console.log('store-closed checks passed');
}

run().catch(function (err) {
  console.error(err);
  process.exit(1);
});
