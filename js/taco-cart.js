(function () {
  var STORAGE_KEY = 'tacoExpressCartV1';
  var TAX_RATE = 0.07;
  var catalogById = {};
  var catalogReady = false;

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function notifyCartUpdated() {
    document.dispatchEvent(new CustomEvent('taco-cart-updated'));
  }

  function getQty(itemId) {
    var row = loadCart().find(function (r) { return r.id === itemId; });
    return row ? row.qty : 0;
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCartBar();
    updateAllSteppers();
    notifyCartUpdated();
  }

  function setQty(itemId, qty) {
    if (!catalogById[itemId]) return;
    var prev = getQty(itemId);
    var cart = loadCart().filter(function (row) { return row.id !== itemId; });
    var next = Math.max(0, Math.min(20, Number(qty) || 0));
    if (next > 0) cart.push({ id: itemId, qty: next });
    saveCart(cart);
    if (next > prev) {
      var bar = document.getElementById('tacoCartBar');
      if (bar) {
        bar.classList.add('cart-pulse');
        window.setTimeout(function () { bar.classList.remove('cart-pulse'); }, 450);
      }
    }
  }

  function changeQty(itemId, delta) {
    setQty(itemId, getQty(itemId) + delta);
  }

  function parsePrice(text) {
    var match = String(text || '').match(/\$?([\d.]+)/);
    return match ? Math.round(parseFloat(match[1]) * 100) : 0;
  }

  function cardTitle(card) {
    var heading = card.querySelector('h3, h4');
    return heading ? heading.textContent.trim() : '';
  }

  function sectionIdFor(card) {
    var section = card.closest('section[id]');
    return section ? section.id : '';
  }

  function findCatalogItem(sectionId, title, priceCents) {
    var section = String(sectionId || '').toLowerCase();
    var wanted = String(title || '').trim().toLowerCase();
    return Object.keys(catalogById)
      .map(function (id) { return catalogById[id]; })
      .find(function (item) {
        return item.section === section &&
          item.title.toLowerCase() === wanted &&
          item.priceCents === priceCents;
      });
  }

  function cartTotals(cart) {
    var subtotalCents = 0;
    cart.forEach(function (row) {
      var item = catalogById[row.id];
      if (!item) return;
      subtotalCents += item.priceCents * row.qty;
    });
    var taxCents = Math.round(subtotalCents * TAX_RATE);
    return {
      subtotalCents: subtotalCents,
      taxCents: taxCents,
      totalCents: subtotalCents + taxCents,
      count: cart.reduce(function (sum, row) { return sum + row.qty; }, 0),
    };
  }

  function renderCartBar() {
    var bar = document.getElementById('tacoCartBar');
    if (!bar) return;
    var cart = loadCart();
    var totals = cartTotals(cart);
    var countEl = bar.querySelector('[data-cart-count]');
    var totalEl = bar.querySelector('[data-cart-total]');
    var checkoutBtn = bar.querySelector('[data-cart-checkout]');
    if (countEl) countEl.textContent = String(totals.count);
    if (totalEl) totalEl.textContent = '$' + (totals.totalCents / 100).toFixed(2);
    if (checkoutBtn) {
      var disabled = totals.count === 0;
      checkoutBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      checkoutBtn.textContent = disabled
        ? 'Checkout'
        : 'Checkout · ' + '$' + (totals.totalCents / 100).toFixed(2);
    }
    bar.hidden = totals.count === 0;
    document.body.classList.toggle('has-cart-bar', totals.count > 0);
  }

  function createStepper(itemId, compact) {
    var wrap = document.createElement('div');
    wrap.className = 'qty-stepper';
    wrap.setAttribute('data-item-id', itemId);
    if (compact) wrap.classList.add('qty-stepper-compact');

    var minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'qty-minus';
    minus.setAttribute('aria-label', 'Remove one');
    minus.textContent = '−';

    var count = document.createElement('span');
    count.className = 'qty-count';
    count.setAttribute('aria-live', 'polite');
    count.textContent = '0';

    var plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'qty-plus';
    plus.setAttribute('aria-label', 'Add one');
    plus.textContent = '+';

    minus.addEventListener('click', function () { changeQty(itemId, -1); });
    plus.addEventListener('click', function () { changeQty(itemId, 1); });

    wrap.appendChild(minus);
    wrap.appendChild(count);
    wrap.appendChild(plus);
    return wrap;
  }

  function updateStepperEl(wrap) {
    if (!wrap) return;
    var itemId = wrap.getAttribute('data-item-id');
    var qty = getQty(itemId);
    var count = wrap.querySelector('.qty-count');
    var minus = wrap.querySelector('.qty-minus');
    if (count) count.textContent = String(qty);
    if (minus) minus.disabled = qty <= 0;
  }

  function updateAllSteppers() {
    document.querySelectorAll('.qty-stepper[data-item-id]').forEach(updateStepperEl);
  }

  function wireOrderRows() {
    document.querySelectorAll('.order-row[data-item-id]').forEach(function (row) {
      if (row.querySelector('.qty-stepper')) return;
      var itemId = row.getAttribute('data-item-id');
      if (!catalogById[itemId]) return;
      var stepper = createStepper(itemId, true);
      row.appendChild(stepper);
      updateStepperEl(stepper);
    });
  }

  function wireCards() {
    wireOrderRows();
    document.querySelectorAll('.card, .drink-card').forEach(function (card) {
      if (card.querySelector('.qty-stepper')) return;
      if (card.querySelector('.order-row')) return;
      var title = cardTitle(card);
      var priceCents = parsePrice(card.querySelector('.price') && card.querySelector('.price').textContent);
      var item = findCatalogItem(sectionIdFor(card), title, priceCents);
      if (!item) return;

      card.setAttribute('data-menu-id', item.id);
      var stepper = createStepper(item.id, false);
      card.appendChild(stepper);
      updateStepperEl(stepper);
    });
  }

  function boot(items) {
    items.forEach(function (item) {
      catalogById[item.id] = item;
    });
    catalogReady = true;
    wireCards();
    renderCartBar();
    document.dispatchEvent(new CustomEvent('taco-cart-ready'));
  }

  if (window.TACO_MENU_ITEMS && window.TACO_MENU_ITEMS.length) {
    boot(window.TACO_MENU_ITEMS);
  } else {
    fetch('/api/menu-catalog')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (catalog) {
        if (catalog && catalog.items) boot(catalog.items);
      })
      .catch(function () {});
  }

  window.TacoCart = {
    load: loadCart,
    save: saveCart,
    getQty: getQty,
    setQty: setQty,
    changeQty: changeQty,
    createStepper: createStepper,
    totals: function () { return cartTotals(loadCart()); },
    catalogById: function () { return catalogById; },
    isReady: function () { return catalogReady; },
    clear: function () {
      saveCart([]);
    },
  };
})();
