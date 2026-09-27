/**
 * Assert Taco Express Peabody hours: Wed–Sat 11–8 Eastern, Sun–Tue closed.
 * Run: node scripts/test-taco-shop-hours.js
 */
const assert = require('assert');
const {
  getTacoShopStatus,
  nextOpenPhrase,
  shopClosedCheck,
  isClosedDay,
} = require('../api/tacoShopHours');

function easternDate(y, monthIndex, day, hour, minute) {
  const utcGuess = Date.UTC(y, monthIndex, day, hour + 4, minute, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date(utcGuess));
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  const driftMin = (get('hour') - hour) * 60 + (get('minute') - minute);
  return new Date(utcGuess - driftMin * 60 * 1000);
}

async function main() {
  assert.strictEqual(isClosedDay('Monday'), true);
  assert.strictEqual(isClosedDay('Tuesday'), true);
  assert.strictEqual(isClosedDay('Sunday'), true);
  assert.strictEqual(isClosedDay('Saturday'), false);
  assert.strictEqual(isClosedDay('Wednesday'), false);
  assert.strictEqual(isClosedDay('Thursday'), false);
  assert.strictEqual(isClosedDay('Friday'), false);

  const sundayNoon = easternDate(2026, 7, 30, 12, 0);
  const sun = getTacoShopStatus(sundayNoon);
  assert.strictEqual(sun.day, 'Sunday');
  assert.strictEqual(sun.open, false);
  assert.strictEqual(nextOpenPhrase(sun), 'Wednesday at 11 AM');
  const sunGate = await shopClosedCheck(sundayNoon);
  assert.strictEqual(sunGate.closed, true);
  assert.match(sunGate.message, /Wednesday through Saturday/);

  const sat = getTacoShopStatus(easternDate(2026, 7, 29, 15, 0));
  assert.strictEqual(sat.day, 'Saturday');
  assert.strictEqual(sat.open, true);
  assert.strictEqual(sat.hoursLabel, '11 AM–8 PM');
  const satGate = await shopClosedCheck(easternDate(2026, 7, 29, 15, 0));
  assert.strictEqual(satGate.closed, false);

  /* Customers must be able to pay / print tickets these four days, 11 AM–8 PM. */
  for (const [label, when] of [
    ['Wednesday', easternDate(2026, 8, 2, 12, 0)],
    ['Thursday', easternDate(2026, 8, 3, 12, 0)],
    ['Friday', easternDate(2026, 8, 4, 12, 0)],
    ['Saturday', easternDate(2026, 8, 5, 12, 0)],
    ['Saturday 7:59 PM', easternDate(2026, 8, 5, 19, 59)],
  ]) {
    const gate = await shopClosedCheck(when);
    assert.strictEqual(gate.closed, false, label + ' must allow purchase');
    assert.strictEqual(gate.code, '');
  }

  const satNight = getTacoShopStatus(easternDate(2026, 7, 29, 20, 30));
  assert.strictEqual(satNight.day, 'Saturday');
  assert.strictEqual(satNight.open, false);
  assert.strictEqual(nextOpenPhrase(satNight), 'Wednesday at 11 AM');

  const wedNoon = getTacoShopStatus(easternDate(2026, 8, 2, 12, 0));
  assert.strictEqual(wedNoon.day, 'Wednesday');
  assert.strictEqual(wedNoon.open, true);
  const wedGate = await shopClosedCheck(easternDate(2026, 8, 2, 12, 0));
  assert.strictEqual(wedGate.closed, false);

  const wedMorning = getTacoShopStatus(easternDate(2026, 8, 2, 10, 30));
  assert.strictEqual(wedMorning.open, false);
  assert.strictEqual(nextOpenPhrase(wedMorning), 'today at 11 AM');

  const wedClose = getTacoShopStatus(easternDate(2026, 8, 2, 20, 0));
  assert.strictEqual(wedClose.open, false);
  assert.strictEqual(nextOpenPhrase(wedClose), 'tomorrow at 11 AM');

  const friNight = getTacoShopStatus(easternDate(2026, 8, 4, 20, 30));
  assert.strictEqual(friNight.day, 'Friday');
  assert.strictEqual(friNight.open, false);
  assert.strictEqual(nextOpenPhrase(friNight), 'tomorrow at 11 AM');

  const tue = getTacoShopStatus(easternDate(2026, 8, 1, 12, 0));
  assert.strictEqual(tue.day, 'Tuesday');
  assert.strictEqual(tue.open, false);
  assert.strictEqual(nextOpenPhrase(tue), 'tomorrow at 11 AM');

  const { readTurnOffToday } = require('../api/turnOffToday');
  assert.strictEqual(readTurnOffToday(easternDate(2026, 7, 30, 20, 30)), null);
  assert.strictEqual(readTurnOffToday(easternDate(2026, 8, 2, 12, 0)), null);

  const { staffSetAvailability, fetchLiveState } = require('../api/soldOutStore');
  const all = await staffSetAvailability({
    owner_name: 'Frank Martino',
    pin: '2468',
    sold_out: true,
    all: true,
  });
  assert.strictEqual(all.ok, true);
  assert.ok(all.state.ids.length >= 63);
  const live = await fetchLiveState();
  assert.ok(live.ids.length >= 63);

  console.log('tacoShopHours Wed–Sat open: all assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
