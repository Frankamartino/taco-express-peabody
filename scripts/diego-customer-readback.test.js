const assert = require('assert');
const rb = require('../js/diego-customer-readback.js');

const frank = {
  firstName: 'Frank',
  lastName: 'Martino',
  email: 'frankamartino@gmail.com',
  phone: '978-337-3777',
};

assert.strictEqual(rb.contactInfoComplete(frank), true);
assert.strictEqual(rb.contactInfoComplete({ firstName: 'Frank', lastName: 'Martino' }), false);
assert.deepStrictEqual(rb.missingContactFields({ firstName: 'Frank' }), [
  'lastName',
  'email',
  'phone',
]);

assert.strictEqual(
  rb.readbackLine(frank, 'none'),
  'Frank Martino, email frankamartino@gmail.com, phone 978-337-3777'
);
assert.strictEqual(
  rb.readbackLine(frank, 'mild'),
  'Frank Martino, email frankamartino@gmail.com, phone 978-337-3777, notes mild'
);
assert.ok(rb.readbackHint(frank, '').indexOf('Is that all correct?') > 0);
assert.ok(rb.readbackHint(frank, '').indexOf('frankamartino@gmail.com') > 0);

const gate = rb.createGate();
assert.strictEqual(gate.blocksPay(), false);
gate.noteUtterance('Frank Martino, frankamartino@gmail.com, 978-337-3777', 1000);
gate.arm();
assert.strictEqual(gate.blocksPay(), true);
gate.noteUtterance('Frank Martino frankamartino@gmail.com 978-337-3777', 2000);
assert.strictEqual(gate.blocksPay(), true, 'same utterance must not unlock pay');
gate.noteUtterance('Frank Martino, frankamartino@gmail.com, 978-337-3777, that is my info', 8000);
assert.strictEqual(gate.blocksPay(), true, 'slow duplicate transcript must not unlock pay');
gate.noteUtterance('yes that is correct', 12000);
assert.strictEqual(gate.blocksPay(), false);

gate.arm();
assert.strictEqual(gate.blocksPay(), true, 'a correction arms a fresh readback');
gate.noteUtterance('yes', 22000);
assert.strictEqual(gate.blocksPay(), false);
gate.clear();
assert.strictEqual(gate.blocksPay(), false);
assert.strictEqual(gate.isArmed(), false);

console.log('diego-customer-readback: ok');
