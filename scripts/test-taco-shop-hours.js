/**
 * Assert Taco Express Peabody hours: Wed–Fri 11–8 Eastern, Sat–Tue closed.
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
  const driftMin =
    (get('hour') - hour) * 60 + (get('minute') - minute);
  return new Date(utcGuess - driftMin * 60 * 1000);
}

async function main() {
  assert.strictEqual(isClosedDay('Monday'), true);
  assert.strictEqual(isClosedDay('Tuesday'), true);
  assert.strictEqual(isClosedDay('Saturday'), true);
  assert.strictEqual(isClosedDay('Sunday'), true);
  assert.strictEqual(isClosedDay('Wednesday'), false);
  assert.strictEqual(isClosedDay('Thursday'), false);
  assert.strictEqual(isClosedDay('Friday'), false);

  // Sunday 2026-08-30 12:00 Eastern — closed, next Wednesday.
  const sundayNoon = easternDate(2026, 7, 30, 12, 0);
  const sun = getTacoShopStatus(sundayNoon);
  assert.strictEqual(sun.day, 'Sunday');
  assert.strictEqual(sun.open, false);
  assert.strictEqual(sun.closedToday, true);
  assert.strictEqual(nextOpenPhrase(sun), 'Wednesday at 11 AM');
  const sunGate = await shopClosedCheck(sundayNoon);
  assert.strictEqual(sunGate.closed, true);
  assert.match(sunGate.message, /Wednesday through Friday only/);

  // Saturday 2026-08-29 15:00 Eastern — closed (was previously open).
  const sat = getTacoShopStatus(easternDate(2026, 7, 29, 15, 0));
  assert.strictEqual(sat.day, 'Saturday');
  assert.strictEqual(sat.open, false);
  assert.strictEqual(nextOpenPhrase(sat), 'Wednesday at 11 AM');

  // Wednesday 2026-09-02 12:00 Eastern — open 11–8.
  const wedNoon = getTacoShopStatus(easternDate(2026, 8, 2, 12, 0));
  assert.strictEqual(wedNoon.day, 'Wednesday');
  assert.strictEqual(wedNoon.open, true);
  assert.strictEqual(wedNoon.hoursLabel, '11 AM–8 PM');
  const wedGate = await shopClosedCheck(easternDate(2026, 8, 2, 12, 0));
  assert.strictEqual(wedGate.closed, false);

  // Wednesday 10:30 — before open.
  const wedMorning = getTacoShopStatus(easternDate(2026, 8, 2, 10, 30));
  assert.strictEqual(wedMorning.open, false);
  assert.strictEqual(nextOpenPhrase(wedMorning), 'today at 11 AM');

  // Wednesday 20:00 — closed, next tomorrow.
  const wedClose = getTacoShopStatus(easternDate(2026, 8, 2, 20, 0));
  assert.strictEqual(wedClose.day, 'Wednesday');
  assert.strictEqual(wedClose.open, false);
  assert.strictEqual(nextOpenPhrase(wedClose), 'tomorrow at 11 AM');

  // Friday 20:30 — after close, skip weekend.
  const friNight = getTacoShopStatus(easternDate(2026, 8, 4, 20, 30));
  assert.strictEqual(friNight.day, 'Friday');
  assert.strictEqual(friNight.open, false);
  assert.strictEqual(nextOpenPhrase(friNight), 'Wednesday at 11 AM');

  // Tuesday — closed, next tomorrow (Wednesday).
  const tue = getTacoShopStatus(easternDate(2026, 8, 1, 12, 0));
  assert.strictEqual(tue.day, 'Tuesday');
  assert.strictEqual(tue.open, false);
  assert.strictEqual(nextOpenPhrase(tue), 'tomorrow at 11 AM');

  const { readTurnOffToday } = require('../api/turnOffToday');
  const { staffSetAvailability, fetchLiveState } = require('../api/soldOutStore');
  const off = readTurnOffToday(easternDate(2026, 7, 30, 20, 30));
  assert.ok(off && off.closed && off.soldOutAll);
  assert.strictEqual(off.closedDate, '2026-08-30');
  const expired = readTurnOffToday(easternDate(2026, 8, 2, 12, 0));
  assert.strictEqual(expired, null);

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

  console.log('tacoShopHours Wed–Fri only: all assertions passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
