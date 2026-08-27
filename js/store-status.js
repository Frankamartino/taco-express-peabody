(function () {
  var CLOSED_MESSAGE = "Closed early today. We'll be back at our regular hours.";
  var current = {
    acceptingOrders: false,
    reason: 'closed_early',
    message: CLOSED_MESSAGE,
  };

  function isClosed(status) {
    return !status || status.acceptingOrders === false;
  }

  function applyStatus(status) {
    if (!status || typeof status !== 'object') return;
    current = {
      acceptingOrders: status.acceptingOrders !== false,
      reason: status.reason || '',
      message: status.message || (status.acceptingOrders === false ? CLOSED_MESSAGE : 'Open for orders.'),
    };
    window.TACO_STORE_STATUS = current;
    var closed = isClosed(current);
    document.documentElement.classList.toggle('store-closed', closed);
    document.body.classList.toggle('store-closed', closed);

    document.querySelectorAll('.top-bar').forEach(function (bar) {
      bar.classList.toggle('is-closed', closed);
      if (closed) {
        bar.textContent = '';
        bar.appendChild(document.createTextNode(current.message + ' · '));
        var phone = document.createElement('a');
        phone.href = 'tel:+19789821800';
        phone.textContent = '(978) 982-1800';
        bar.appendChild(phone);
      } else if (!bar.getAttribute('data-open-html')) {
        bar.innerHTML = '58 Pulaski St · Peabody MA 01960 · <a href="tel:+19789821800">(978) 982-1800</a>';
      }
    });

    var hoursNote = document.getElementById('closedTodayNote');
    if (hoursNote) hoursNote.hidden = !closed;

    document.querySelectorAll('.order-doordash, .order-grubhub').forEach(function (el) {
      if (el.hasAttribute('href')) {
        el.setAttribute('data-href', el.getAttribute('href'));
      }
      if (closed) {
        el.setAttribute('aria-disabled', 'true');
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.4';
        el.removeAttribute('href');
      } else {
        el.removeAttribute('aria-disabled');
        el.style.pointerEvents = '';
        el.style.opacity = '';
        var href = el.getAttribute('data-href');
        if (href) el.setAttribute('href', href);
      }
    });

    document.dispatchEvent(new CustomEvent('taco-store-status', { detail: current }));
  }

  applyStatus(current);

  function loadStatus(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      return r.ok ? r.json() : null;
    });
  }

  loadStatus('/store-status.json')
    .catch(function () { return null; })
    .then(function (status) {
      if (status) return status;
      return loadStatus('/api/store-status').catch(function () { return null; });
    })
    .then(function (status) {
      if (status && typeof status.acceptingOrders === 'boolean') applyStatus(status);
    })
    .catch(function () {});

  window.TacoStore = {
    get: function () { return current; },
    isClosed: function () { return isClosed(current); },
  };
})();
