(function () {
  var STORAGE_KEY = 'tacoExpressCartV1';
  var TAX_RATE = 0.07;
  var catalogById = {};

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    renderCartBar();
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

  function addToCart(itemId) {
    var item = catalogById[itemId];
    if (!item) return;
    var cart = loadCart();
    var existing = cart.find(function (row) { return row.id === itemId; });
    if (existing) existing.qty += 1;
    else cart.push({ id: itemId, qty: 1 });
    saveCart(cart);
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
      if (totals.count === 0) {
        checkoutBtn.setAttribute('aria-disabled', 'true');
        checkoutBtn.style.pointerEvents = 'none';
        checkoutBtn.style.opacity = '0.5';
      } else {
        checkoutBtn.removeAttribute('aria-disabled');
        checkoutBtn.style.pointerEvents = '';
        checkoutBtn.style.opacity = '';
      }
    }
    bar.hidden = totals.count === 0;
  }

  function wireCards() {
    document.querySelectorAll('.card, .drink-card').forEach(function (card) {
      if (card.querySelector('.add-btn')) return;
      var title = cardTitle(card);
      var priceCents = parsePrice(card.querySelector('.price') && card.querySelector('.price').textContent);
      var item = findCatalogItem(sectionIdFor(card), title, priceCents);
      if (!item) return;

      card.setAttribute('data-menu-id', item.id);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'add-btn';
      btn.textContent = 'Add';
      btn.addEventListener('click', function () {
        addToCart(item.id);
        btn.textContent = 'Added';
        window.setTimeout(function () { btn.textContent = 'Add'; }, 700);
      });
      card.appendChild(btn);
    });
  }

  function boot(catalog) {
    catalog.items.forEach(function (item) {
      catalogById[item.id] = item;
    });
    wireCards();
    renderCartBar();
    document.dispatchEvent(new CustomEvent('taco-cart-ready'));
  }

  fetch('/api/menu-catalog')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (catalog) {
      if (catalog && catalog.items) boot(catalog);
    })
    .catch(function () {});

  window.TacoCart = {
    load: loadCart,
    save: saveCart,
    totals: function () { return cartTotals(loadCart()); },
    catalogById: function () { return catalogById; },
    clear: function () {
      saveCart([]);
    },
  };
})();
