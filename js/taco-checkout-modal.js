(function () {
  function money(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function getEls() {
    return {
      overlay: document.getElementById('tacoCheckoutModal'),
      lines: document.getElementById('checkoutLines'),
      subtotal: document.getElementById('checkoutSubtotal'),
      tax: document.getElementById('checkoutTax'),
      total: document.getElementById('checkoutTotal'),
      name: document.getElementById('checkoutName'),
      email: document.getElementById('checkoutEmail'),
      phone: document.getElementById('checkoutPhone'),
      instructions: document.getElementById('checkoutInstructions'),
      msg: document.getElementById('checkoutMsg'),
      payBtn: document.getElementById('checkoutPayBtn'),
    };
  }

  function renderModal() {
    if (!window.TacoCart) return;
    var els = getEls();
    if (!els.overlay || !els.lines) return;

    var cart = window.TacoCart.load();
    var catalog = window.TacoCart.catalogById();
    els.lines.innerHTML = '';

    if (!cart.length) {
      els.lines.innerHTML =
        '<p class="checkout-empty">Your cart is empty. Tap <strong>Add</strong> on any item first.</p>';
      if (els.payBtn) els.payBtn.disabled = true;
      return;
    }

    var rendered = 0;
    cart.forEach(function (row) {
      var item = catalog[row.id];
      if (!item) return;
      rendered += 1;
      var line = document.createElement('div');
      line.className = 'checkout-line';
      line.innerHTML =
        '<span class="checkout-line-name">' + item.name + '</span>' +
        '<span class="checkout-line-qty">x' + row.qty + '</span>' +
        '<span class="checkout-line-price">' + money(item.priceCents * row.qty) + '</span>';
      els.lines.appendChild(line);
    });

    if (!rendered) {
      els.lines.innerHTML = '<p class="checkout-empty">Loading your order…</p>';
      if (els.payBtn) els.payBtn.disabled = true;
      return;
    }

    var totals = window.TacoCart.totals();
    if (els.subtotal) els.subtotal.textContent = money(totals.subtotalCents);
    if (els.tax) els.tax.textContent = money(totals.taxCents);
    if (els.total) els.total.textContent = money(totals.totalCents);
    if (els.payBtn) els.payBtn.disabled = totals.totalCents < 50;
  }

  function openCheckoutModal() {
    var els = getEls();
    if (!els.overlay) return;
    renderModal();
    if (els.msg) {
      els.msg.textContent = '';
      els.msg.className = '';
    }
    els.overlay.hidden = false;
    document.body.classList.add('checkout-open');
    if (els.name && !els.name.value) els.name.focus();
  }

  function closeCheckoutModal() {
    var els = getEls();
    if (!els.overlay) return;
    els.overlay.hidden = true;
    document.body.classList.remove('checkout-open');
  }

  function pay() {
    var els = getEls();
    if (!els.payBtn || !window.TacoCart) return;

    var name = els.name ? els.name.value.trim() : '';
    var email = els.email ? els.email.value.trim() : '';
    var phone = els.phone ? els.phone.value.trim() : '';

    if (!name) {
      if (els.msg) {
        els.msg.textContent = 'Please enter your name.';
        els.msg.className = 'checkout-msg err';
      }
      return;
    }
    if (!email || email.indexOf('@') < 1) {
      if (els.msg) {
        els.msg.textContent = 'Please enter a valid email.';
        els.msg.className = 'checkout-msg err';
      }
      return;
    }
    if (!phone) {
      if (els.msg) {
        els.msg.textContent = 'Please enter your phone number.';
        els.msg.className = 'checkout-msg err';
      }
      return;
    }

    els.msg.textContent = '';
    els.msg.className = '';
    els.payBtn.disabled = true;
    els.payBtn.textContent = 'Opening Stripe…';

    fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: window.TacoCart.load(),
        name: name,
        email: email,
        phone: phone,
        instructions: els.instructions ? els.instructions.value.trim() : '',
        fulfillment: 'pickup',
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok || !res.data.checkoutUrl) {
          throw new Error((res.data && res.data.error) || 'Could not start checkout.');
        }
        window.location.href = res.data.checkoutUrl;
      })
      .catch(function (err) {
        if (els.msg) {
          els.msg.textContent = err.message || 'Checkout failed.';
          els.msg.className = 'checkout-msg err';
        }
        els.payBtn.disabled = false;
        els.payBtn.textContent = 'Pay with card';
      });
  }

  function wire() {
    var els = getEls();
    if (!els.overlay) return;

    document.querySelectorAll('[data-open-checkout]').forEach(function (node) {
      node.addEventListener('click', function (e) {
        e.preventDefault();
        openCheckoutModal();
      });
    });

    document.querySelectorAll('[data-close-checkout]').forEach(function (node) {
      node.addEventListener('click', function (e) {
        e.preventDefault();
        closeCheckoutModal();
      });
    });

    if (els.payBtn) els.payBtn.addEventListener('click', pay);

    els.overlay.addEventListener('click', function (e) {
      if (e.target === els.overlay) closeCheckoutModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.overlay && !els.overlay.hidden) closeCheckoutModal();
    });

    document.addEventListener('taco-cart-ready', renderModal);
    document.addEventListener('taco-cart-updated', renderModal);

    if (new URLSearchParams(window.location.search).get('checkout') === '1') {
      openCheckoutModal();
    }
  }

  window.TacoCheckout = {
    open: openCheckoutModal,
    close: closeCheckoutModal,
    render: renderModal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
