/**
 * Diego must read back the whole customer card before tip or pay.
 * The gate ignores the utterance that filled the card (and a duplicate
 * live-transcript flush of that same utterance) so he waits for a real yes.
 */
(function (root) {
  function clean(value) {
    return String(value || '').trim();
  }

  function contactInfoComplete(customer) {
    customer = customer || {};
    return !!(
      clean(customer.firstName) &&
      clean(customer.lastName) &&
      clean(customer.email) &&
      clean(customer.phone)
    );
  }

  function missingContactFields(customer) {
    customer = customer || {};
    var gaps = [];
    if (!clean(customer.firstName)) gaps.push('firstName');
    if (!clean(customer.lastName)) gaps.push('lastName');
    if (!clean(customer.email)) gaps.push('email');
    if (!clean(customer.phone)) gaps.push('phone');
    return gaps;
  }

  function readbackLine(customer, instructions) {
    customer = customer || {};
    var name = [clean(customer.firstName), clean(customer.lastName)].filter(Boolean).join(' ');
    var parts = [];
    if (name) parts.push(name);
    if (clean(customer.email)) parts.push('email ' + clean(customer.email));
    if (clean(customer.phone)) parts.push('phone ' + clean(customer.phone));
    var notes = clean(instructions);
    if (notes && notes.toLowerCase() !== 'none') parts.push('notes ' + notes);
    return parts.join(', ');
  }

  function readbackHint(customer, instructions) {
    return (
      'READ BACK ALL customer information in one breath, then STOP and wait. Say: "I have ' +
      readbackLine(customer, instructions) +
      '. Is that all correct?" Do not ask for tip, card, or cash until they say yes. If they correct a field, save it and read the full name, email, and phone again.'
    );
  }

  function createGate() {
    var speechEpoch = 0;
    var lastTurnAt = 0;
    var lastTurnText = '';
    var needed = false;
    var heardGuest = false;
    var armedEpoch = 0;

    function utteranceKey(text) {
      return clean(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    function sameUtterance(a, b) {
      a = utteranceKey(a);
      b = utteranceKey(b);
      if (!a || !b) return false;
      return a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
    }

    return {
      noteUtterance: function (text, now) {
        var norm = clean(text);
        if (!norm) return heardGuest;
        var at = now == null ? Date.now() : now;
        if (at - lastTurnAt < 10000 && sameUtterance(norm, lastTurnText)) {
          if (norm.length > lastTurnText.length) lastTurnText = norm;
          return heardGuest;
        }
        lastTurnAt = at;
        lastTurnText = norm;
        speechEpoch += 1;
        if (needed && speechEpoch > armedEpoch) heardGuest = true;
        return heardGuest;
      },
      arm: function () {
        needed = true;
        heardGuest = false;
        armedEpoch = speechEpoch;
      },
      clear: function () {
        needed = false;
        heardGuest = false;
        armedEpoch = speechEpoch;
      },
      isArmed: function () {
        return needed;
      },
      blocksPay: function () {
        return needed && !heardGuest;
      },
    };
  }

  var api = {
    contactInfoComplete: contactInfoComplete,
    missingContactFields: missingContactFields,
    readbackLine: readbackLine,
    readbackHint: readbackHint,
    createGate: createGate,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DiegoCustomerReadback = api;
})(typeof window !== 'undefined' ? window : globalThis);
