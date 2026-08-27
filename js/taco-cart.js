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
    if (window.TacoSoldOut && window.TacoSoldOut.isSoldOut(itemId) && Number(qty) > getQty(itemId)) {
      flashCartTarget(itemId);
      return;
    }
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
      flashCartTarget(itemId);
    }
  }

  /** Bright green flash on the order-row (or stepper) that just got qty — not the whole card. */
  function flashCartTarget(itemId) {
    if (!itemId) return;
    var row = document.querySelector('.order-row[data-item-id="' + itemId + '"]');
    var target = row;
    if (!target) {
      var stepper = document.querySelector('.qty-stepper[data-item-id="' + itemId + '"]');
      target = stepper || null;
    }
    if (!target) return;
    target.classList.remove('just-added');
    void target.offsetWidth;
    target.classList.add('just-added', 'is-in-cart');
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (eScroll) {
      try {
        target.scrollIntoView(true);
      } catch (eScroll2) {}
    }
    window.setTimeout(function () {
      target.classList.remove('just-added');
    }, 1600);
  }

  function syncInCartHighlights() {
    document.querySelectorAll('.order-row[data-item-id]').forEach(function (row) {
      var id = row.getAttribute('data-item-id');
      row.classList.toggle('is-in-cart', getQty(id) > 0);
    });
    document.querySelectorAll('.qty-stepper[data-item-id]').forEach(function (stepper) {
      var id = stepper.getAttribute('data-item-id');
      var inCart = getQty(id) > 0;
      stepper.classList.toggle('is-in-cart', inCart);
      /* Card-level steppers (sides/drinks): glow the stepper strip only, not the whole card. */
      if (!stepper.closest('.order-row')) {
        stepper.classList.toggle('stepper-in-cart', inCart);
      }
    });
  }

  function changeQty(itemId, delta) {
    setQty(itemId, getQty(itemId) + delta);
  }

  function normalizeMenuText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[·•|]/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function detectProtein(norm) {
    if (/\bshrimp\b/.test(norm)) return 'shrimp';
    if (/\bchicken\b/.test(norm)) return 'chicken';
    if (/\bpork\b/.test(norm)) return 'pork';
    if (/\bbeef\b/.test(norm)) return 'beef';
    return '';
  }

  function resolveByMenuName(title, priceDollars) {
    var items = Object.keys(catalogById).map(function (id) {
      return catalogById[id];
    });
    if (!items.length && window.TACO_MENU_ITEMS) items = window.TACO_MENU_ITEMS.slice();
    if (!items.length) return null;

    var raw = String(title || '').trim();
    var norm = normalizeMenuText(raw);
    if (!norm) return null;

    var exact = items.find(function (item) {
      return normalizeMenuText(item.name) === norm;
    });
    if (exact) return exact;

    var priceCents =
      priceDollars != null && isFinite(Number(priceDollars))
        ? Math.round(Number(priceDollars) * 100)
        : null;

    var isPlate =
      /\b(plate|dinner)\b/.test(norm) ||
      /\b(two sides|rice and beans|rice & beans|with rice|add two sides)\b/.test(norm);
    var protein = detectProtein(norm);
    var prefix = '';
    if (/\bburrito/.test(norm)) prefix = 'burrito';
    else if (/\benchilada/.test(norm)) prefix = 'enchilada';
    else if (/\bquesadilla/.test(norm)) prefix = 'quesadilla';
    else if (/\btaco/.test(norm)) prefix = 'tacos';
    else if (/\b(rice|brown rice)\b/.test(norm) && !/\bextra\b/.test(norm) && !isPlate) {
      return items.find(function (i) {
        return i.id === 'side-rice';
      }) || null;
    } else if (/\bblack beans?\b/.test(norm) && !/\bextra\b/.test(norm) && !isPlate) {
      return items.find(function (i) {
        return i.id === 'side-black-beans';
      }) || null;
    } else if (/\brefried beans?\b/.test(norm) && !isPlate) {
      return items.find(function (i) {
        return i.id === 'side-refried-beans';
      }) || null;
    }

    /* Diego still sends combined dinner prices ($20.49 etc.) — map to *-plate ids. */
    var combinedDinner =
      priceCents === 2049 || priceCents === 2099 || priceCents === 2899;

    if (prefix && protein && (isPlate || combinedDinner)) {
      var plateId = prefix + '-' + protein + '-plate';
      var plateHit = items.find(function (i) {
        return i.id === plateId;
      });
      if (plateHit) return plateHit;
    }

    if (prefix && protein && !isPlate) {
      var mainId = prefix + '-' + protein;
      var mainHit = items.find(function (i) {
        return i.id === mainId;
      });
      if (mainHit) return mainHit;
    }

    if (priceCents != null) {
      var byPriceName = items.find(function (item) {
        return (
          item.priceCents === priceCents &&
          (normalizeMenuText(item.name).indexOf(norm) >= 0 ||
            norm.indexOf(normalizeMenuText(item.name)) >= 0)
        );
      });
      if (byPriceName) return byPriceName;
    }

    if (priceCents != null && protein) {
      var loose = items.find(function (item) {
        return item.priceCents === priceCents && normalizeMenuText(item.name).indexOf(protein) >= 0;
      });
      if (loose) return loose;
    }

    return null;
  }

  /**
   * Website UI: main row ($13.49) + optional "Add two sides" row (+$7).
   * Voice dinner / Plate titles must bump BOTH so the burrito (etc.) shows qty ≥ 1.
   */
  function applyPlateWithMain(plateItem, qty) {
    var n = isFinite(Number(qty)) && Number(qty) > 0 ? Math.floor(Number(qty)) : 1;
    var mainId = String(plateItem.id || '').replace(/-plate$/, '');
    if (mainId && mainId !== plateItem.id && catalogById[mainId]) {
      var mainQty = getQty(mainId);
      if (mainQty < n) setQty(mainId, n);
    }
    setQty(plateItem.id, getQty(plateItem.id) + n);
    return plateItem;
  }

  /** Diego / voice: add (or bump qty) by DoorDash-style title. Returns item or null. */
  function addFromVoice(title, qty, priceDollars) {
    var item = resolveByMenuName(title, priceDollars);
    if (!item) return null;
    if (window.TacoSoldOut && window.TacoSoldOut.isSoldOut(item.id)) {
      return { soldOut: true, item: item };
    }
    var n = isFinite(Number(qty)) && Number(qty) > 0 ? Math.floor(Number(qty)) : 1;
    if (/-plate$/.test(item.id)) {
      return applyPlateWithMain(item, n);
    }
    setQty(item.id, getQty(item.id) + n);
    return item;
  }

  function setFromVoice(title, qty, priceDollars) {
    var item = resolveByMenuName(title, priceDollars);
    if (!item) return null;
    var n = Math.max(0, Math.floor(Number(qty) || 0));
    if (/-plate$/.test(item.id)) {
      var mainId = String(item.id || '').replace(/-plate$/, '');
      if (n > 0 && mainId && catalogById[mainId] && getQty(mainId) < n) {
        setQty(mainId, n);
      }
      setQty(item.id, n);
      return item;
    }
    setQty(item.id, n);
    return item;
  }

  function removeFromVoice(title, priceDollars) {
    var item = resolveByMenuName(title, priceDollars);
    if (!item) return null;
    setQty(item.id, 0);
    return item;
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
    syncInCartHighlights();
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

  /* The checkout overlay is a same-origin iframe — keep both documents on one cart. */
  window.addEventListener('storage', function (ev) {
    if (ev.key && ev.key !== STORAGE_KEY) return;
    renderCartBar();
    updateAllSteppers();
    notifyCartUpdated();
  });

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
    resolveByMenuName: resolveByMenuName,
    addFromVoice: addFromVoice,
    setFromVoice: setFromVoice,
    removeFromVoice: removeFromVoice,
    flashCartTarget: flashCartTarget,
    clear: function () {
      saveCart([]);
    },
  };
})();
