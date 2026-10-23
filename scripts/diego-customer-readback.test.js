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
assert.strictEqual(rb.readbackLine(frank, ''), rb.readbackLine(frank, 'none'));
assert.strictEqual(rb.readbackLine(frank, 'None'), rb.readbackLine(frank, ''));
assert.notStrictEqual(rb.readbackLine(frank, ''), rb.readbackLine(frank, 'no onions'));
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

const orderGate = rb.createGate();
orderGate.arm({ now: 1000 });
orderGate.noteUtterance('three beef tacos and a coke', 5000);
assert.strictEqual(orderGate.blocksPay(), true, 'a food order is not a yes');
orderGate.noteUtterance('no', 6000);
assert.strictEqual(orderGate.blocksPay(), true, 'no does not confirm the card');
orderGate.noteUtterance('nope that is wrong', 7000);
assert.strictEqual(orderGate.blocksPay(), true);
orderGate.noteUtterance('yes that is correct', 8000);
assert.strictEqual(orderGate.blocksPay(), false);

const fillGate = rb.createGate();
fillGate.noteUtterance('hi there', 1000);
fillGate.arm({ dropInFlight: true, now: 5000 });
fillGate.noteUtterance('Frank Martino, frankamartino@gmail.com, 978-337-3777', 5600);
assert.strictEqual(fillGate.blocksPay(), true, 'contact line flushed after arm is not a yes');
fillGate.noteUtterance('yes, my email is frankamartino@gmail.com', 6200);
assert.strictEqual(fillGate.blocksPay(), true, 'filling yes is not the readback yes');
fillGate.noteUtterance('It is Frank Martino at frankamartino gmail', 9000);
assert.strictEqual(fillGate.blocksPay(), true, 'mismatched second ASR must not unlock pay');
fillGate.noteUtterance('yes', 12000);
assert.strictEqual(fillGate.blocksPay(), false);

const yesEmail = rb.createGate();
yesEmail.noteUtterance('yes, my email is frankamartino@gmail.com', 1000);
yesEmail.arm({ now: 2000 });
yesEmail.noteUtterance('yes', 5000);
assert.strictEqual(yesEmail.blocksPay(), false, 'bare yes is not a duplicate of yes-email');

const yesThenFull = rb.createGate();
yesThenFull.noteUtterance('yes', 1000);
yesThenFull.arm({ now: 2000 });
yesThenFull.noteUtterance('yes that is correct', 4000);
assert.strictEqual(yesThenFull.blocksPay(), false, 'yes that is correct is not a duplicate of yes');

const fillingYes = rb.createGate();
fillingYes.arm({ dropInFlight: true, now: 10000 });
fillingYes.noteUtterance('yes', 11000);
assert.strictEqual(fillingYes.blocksPay(), true, 'in-flight yes does not unlock pay');
fillingYes.noteUtterance('yes', 16000);
assert.strictEqual(fillingYes.blocksPay(), false, 'later yes still unlocks after the filling yes');

console.log('diego-customer-readback: ok');
