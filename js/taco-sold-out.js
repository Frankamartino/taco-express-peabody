/**
 * Taco Express — live sold out / unavailable / out for today.
 * Polls /api/sold-out and marks order-rows + steppers; blocks cart adds.
 */
(function () {
  var state = { ids: [] };
  var pollTimer = null;

  function idSet() {
    return new Set((state.ids || []).map(String));
  }

  function isSoldOut(itemId) {
    if (!itemId) return false;
    return idSet().has(String(itemId));
  }

  function applyUi() {
    var sold = idSet();
    document.querySelectorAll('.order-row[data-item-id]').forEach(function (row) {
      var id = row.getAttribute('data-item-id');
      var out = sold.has(id);
      row.classList.toggle('is-sold-out', out);
      var badge = row.querySelector('.sold-out-badge');
      if (out) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'sold-out-badge';
          badge.textContent = 'Sold out · unavailable today';
          var copy = row.querySelector('.order-row-copy') || row;
          copy.appendChild(badge);
        }
      } else if (badge) {
        badge.remove();
      }
      var plus = row.querySelector('.qty-plus');
      if (plus) plus.disabled = out;
    });

    document.querySelectorAll('.qty-stepper[data-item-id]').forEach(function (stepper) {
      var id = stepper.getAttribute('data-item-id');
      var out = sold.has(id);
      stepper.classList.toggle('is-sold-out', out);
      var plus = stepper.querySelector('.qty-plus');
      var countEl = stepper.querySelector('.qty-count');
      var count = countEl ? Number(countEl.textContent || 0) : 0;
      if (plus) plus.disabled = out || count >= 20;
      if (!stepper.closest('.order-row')) {
        var card = stepper.closest('.card, .drink-card');
        if (card) {
          card.classList.toggle('is-sold-out', out);
          var existing = null;
          var kids = card.children;
          for (var i = 0; i < kids.length; i++) {
            if (kids[i].classList && kids[i].classList.contains('sold-out-badge')) {
              existing = kids[i];
              break;
            }
          }
          if (out && !existing) {
            var b = document.createElement('span');
            b.className = 'sold-out-badge';
            b.textContent = 'Sold out · unavailable today';
            card.insertBefore(b, stepper);
          } else if (!out && existing) {
            existing.remove();
          }
        }
      }
    });

    document.dispatchEvent(new CustomEvent('taco-sold-out-updated', { detail: { ids: state.ids.slice() } }));
  }

  function applyRemote(payload) {
    state = {
      ids: Array.isArray(payload && payload.ids) ? payload.ids.map(String) : [],
      items: Array.isArray(payload && payload.items) ? payload.items : [],
      updatedAt: payload && payload.updatedAt,
      updatedBy: payload && payload.updatedBy,
    };
    applyUi();
  }

  function refresh() {
    return fetch('/api/sold-out', { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data) applyRemote(data);
      })
      .catch(function () {});
  }

  function startPolling(ms) {
    refresh();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(refresh, ms || 45000);
  }

  window.TacoSoldOut = {
    isSoldOut: isSoldOut,
    getIds: function () {
      return (state.ids || []).slice();
    },
    applyRemote: applyRemote,
    refresh: refresh,
    startPolling: startPolling,
    label: function (itemId) {
      return isSoldOut(itemId) ? 'Sold out · unavailable today' : '';
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      startPolling(45000);
    });
  } else {
    startPolling(45000);
  }
})();
