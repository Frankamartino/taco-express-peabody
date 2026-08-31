/**
 * Hours: Wed–Fri 11 AM–8 PM Eastern. Sat–Tue closed.
 * Dates below are in September 2026 (EDT, UTC−4).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getTacoShopStatus, nextOpenPhrase, shopClosedCheck, alwaysClosedDay } =
  require('./tacoShopHours');

function eastern(isoLocal) {
  return new Date(isoLocal + '-04:00');
}

describe('alwaysClosedDay', () => {
  it('closes Saturday through Tuesday', () => {
    assert.equal(alwaysClosedDay('Saturday'), true);
    assert.equal(alwaysClosedDay('Sunday'), true);
    assert.equal(alwaysClosedDay('Monday'), true);
    assert.equal(alwaysClosedDay('Tuesday'), true);
  });
  it('opens Wednesday through Friday', () => {
    assert.equal(alwaysClosedDay('Wednesday'), false);
    assert.equal(alwaysClosedDay('Thursday'), false);
    assert.equal(alwaysClosedDay('Friday'), false);
  });
});

describe('getTacoShopStatus — closed days', () => {
  for (const [label, iso] of [
    ['Saturday noon', '2026-09-05T12:00:00'],
    ['Sunday noon', '2026-09-06T12:00:00'],
    ['Monday noon', '2026-09-07T12:00:00'],
    ['Tuesday noon', '2026-09-08T12:00:00'],
  ]) {
    it(`is closed ${label}`, () => {
      const st = getTacoShopStatus(eastern(iso));
      assert.equal(st.open, false);
      assert.equal(st.closedToday, true);
      assert.match(st.line, /CLOSED TODAY/);
      assert.doesNotMatch(st.line, /OPEN now/);
    });
  }
});

describe('getTacoShopStatus — open days', () => {
  it('is closed Wednesday before 11 AM', () => {
    const st = getTacoShopStatus(eastern('2026-09-02T10:59:00'));
    assert.equal(st.open, false);
    assert.equal(st.hoursLabel, '11 AM–8 PM');
  });
  it('is open Wednesday at 11 AM', () => {
    const st = getTacoShopStatus(eastern('2026-09-02T11:00:00'));
    assert.equal(st.open, true);
    assert.match(st.line, /OPEN now/);
  });
  it('is open Thursday afternoon', () => {
    const st = getTacoShopStatus(eastern('2026-09-03T15:30:00'));
    assert.equal(st.day, 'Thursday');
    assert.equal(st.open, true);
  });
  it('is open Friday at 7:59 PM', () => {
    const st = getTacoShopStatus(eastern('2026-09-04T19:59:00'));
    assert.equal(st.day, 'Friday');
    assert.equal(st.open, true);
  });
  it('is closed Friday at 8 PM', () => {
    const st = getTacoShopStatus(eastern('2026-09-04T20:00:00'));
    assert.equal(st.open, false);
    assert.match(st.line, /CLOSED right now/);
  });
});

describe('nextOpenPhrase', () => {
  it('Saturday / Sunday / Monday → Wednesday', () => {
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-05T12:00:00'))),
      'Wednesday at 11 AM'
    );
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-06T12:00:00'))),
      'Wednesday at 11 AM'
    );
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-07T12:00:00'))),
      'Wednesday at 11 AM'
    );
  });
  it('Tuesday → tomorrow (Wednesday)', () => {
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-08T12:00:00'))),
      'tomorrow at 11 AM'
    );
  });
  it('Wednesday morning → today; after close → tomorrow', () => {
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-02T09:00:00'))),
      'today at 11 AM'
    );
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-02T20:00:00'))),
      'tomorrow at 11 AM'
    );
  });
  it('Friday after close → Wednesday', () => {
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-04T20:05:00'))),
      'Wednesday at 11 AM'
    );
  });
  it('Friday morning → today', () => {
    assert.equal(
      nextOpenPhrase(getTacoShopStatus(eastern('2026-09-04T09:00:00'))),
      'today at 11 AM'
    );
  });
});

describe('shopClosedCheck', () => {
  it('blocks Saturday orders', async () => {
    const gate = await shopClosedCheck(eastern('2026-09-05T13:00:00'));
    assert.equal(gate.closed, true);
    assert.equal(gate.code, 'shop_closed');
    assert.match(gate.message, /Saturday through Tuesday/);
    assert.doesNotMatch(gate.message, /Sunday 11/);
  });
  it('allows Friday lunch', async () => {
    const gate = await shopClosedCheck(eastern('2026-09-04T12:00:00'));
    assert.equal(gate.closed, false);
  });
});
