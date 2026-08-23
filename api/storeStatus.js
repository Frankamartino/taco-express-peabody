/**
 * Single source of truth for whether Taco Express Peabody is taking orders.
 * Flip store-status.json acceptingOrders back to true to reopen.
 */
let status;
try {
  status = require('../store-status.json');
} catch {
  status = null;
}

function getStoreStatus() {
  const raw = status && typeof status === 'object' ? status : {};
  const acceptingOrders = raw.acceptingOrders !== false;
  return {
    acceptingOrders,
    reason: raw.reason || '',
    message:
      raw.message ||
      (acceptingOrders
        ? 'Open for orders.'
        : "Closed early today. We'll be back at our regular hours."),
  };
}

function isStoreClosed() {
  return getStoreStatus().acceptingOrders === false;
}

function closedPayload() {
  const current = getStoreStatus();
  return {
    ok: false,
    code: 'store_closed',
    error: current.message,
    reason: current.reason || 'closed',
  };
}

module.exports = {
  getStoreStatus,
  isStoreClosed,
  closedPayload,
};
