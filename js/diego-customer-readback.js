/**
 * Diego must read the whole customer card back and hear a yes before tip or pay.
 * The turn that filled the card does not count — including a live transcript
 * that lands after arm(), or a second ASR of that same turn — and neither
 * does any other speech that is not a confirmation.
 */
(function (root) {
  // set_customer can beat the 650ms live-transcript flush. Completed ASR of
  // that same turn can lag a bit more. The spoken readback is longer than
  // this, so a yes inside the window is still the filling turn.
  var IN_FLIGHT_MS = 3000;

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
    var inFlightUntil = 0;

    function utteranceKey(text) {
      return clean(text)
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    // A readback yes is a short agreement. Orders, "no", and contact dumps
    // (even "yes, my email is …") are not confirmations.
    function isConfirmation(text) {
      var key = utteranceKey(text).replace(/^(uh|um|oh)\s+/, '');
      if (!key || key.length > 48 || /\d/.test(key)) return false;
      if (
        /\b(no|nope|nah|not|dont|wrong|incorrect|change|actually|email|phone|gmail|yahoo|hotmail|outlook|but)\b/.test(
          key
        )
      ) {
        return false;
      }
      if (key === 'uh huh' || key === 'mm hmm' || key === 'mmhm' || key === 'you got it') return true;
      var words = key.split(' ');
      var allowed = {
        yes: 1,
        yeah: 1,
        yep: 1,
        yup: 1,
        ya: 1,
        ok: 1,
        okay: 1,
        sure: 1,
        correct: 1,
        right: 1,
        perfect: 1,
        absolutely: 1,
        confirmed: 1,
        exactly: 1,
        that: 1,
        thats: 1,
        it: 1,
        is: 1,
        all: 1,
        me: 1,
        please: 1,
        you: 1,
        got: 1,
        sounds: 1,
        everything: 1,
        good: 1,
        true: 1,
        sir: 1,
      };
      for (var i = 0; i < words.length; i++) {
        if (!allowed[words[i]]) return false;
      }
      if (key === 'thats me' || key === 'that is me') return true;
      return /\b(yes|yeah|yep|yup|ya|ok|okay|sure|correct|right|perfect|absolutely|confirmed|exactly|good|true)\b/.test(
        key
      );
    }

    function sameUtterance(next, prev) {
      next = utteranceKey(next);
      prev = utteranceKey(prev);
      if (!next || !prev) return false;
      // "yes, my email is …" must not swallow a later "yes", and a stored
      // "yes" must not swallow "yes that is correct".
      if (isConfirmation(next) || isConfirmation(prev)) return false;
      if (next === prev) return true;
      // Growing live transcript, or a longer ASR of one contact dump.
      return prev.length >= 24 && next.indexOf(prev) !== -1;
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
        if (!needed || speechEpoch <= armedEpoch) return heardGuest;
        if (at < inFlightUntil) return heardGuest;
        if (isConfirmation(norm)) heardGuest = true;
        return heardGuest;
      },
      arm: function (opts) {
        opts = opts && typeof opts === 'object' ? opts : {};
        needed = true;
        heardGuest = false;
        armedEpoch = speechEpoch;
        var at = opts.now == null ? Date.now() : opts.now;
        inFlightUntil = opts.dropInFlight ? at + IN_FLIGHT_MS : 0;
      },
      clear: function () {
        needed = false;
        heardGuest = false;
        armedEpoch = speechEpoch;
        inFlightUntil = 0;
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
