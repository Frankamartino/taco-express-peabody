/**
 * Taco Express Peabody — shop hours (US Eastern).
 * Open Tue–Sat 11 AM–8 PM, Sun 11 AM–6 PM. Closed Monday.
 * Same hours as Martino Pasta Bar.
 */
const OPEN_START_MINS = 11 * 60;

function closeMinsFor(day) {
  return day === 'Sunday' ? 18 * 60 : 20 * 60; // 6 PM Sun, 8 PM Tue–Sat
}

function hoursLabelFor(day) {
  return day === 'Sunday' ? '11 AM–6 PM' : '11 AM–8 PM';
}

function getTacoShopStatus(now = new Date()) {
  const tz = 'America/New_York';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const part = (t) => parts.find((p) => p.type === t)?.value || '';
  const day = part('weekday');
  const CLOSE_MINS = closeMinsFor(day);
  const HOURS_LABEL = hoursLabelFor(day);
  const hour = parseInt(part('hour') || '0', 10);
  const minute = parseInt(part('minute') || '0', 10);
  const mins = hour * 60 + minute;
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

  if (isAlwaysClosedDay(day)) {
    return {
      formatted,
      day,
      mins,
      open: false,
      closedToday: true,
      line:
        `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. CLOSED TODAY — ${day} we are always closed. ` +
        'Open Tuesday–Saturday 11 AM–8 PM, Sunday 11 AM–6 PM. Closed Monday. Next open: ' +
        nextOpenFromClosedDay(day) +
        '. ' +
        'If they want food today, say clearly we are CLOSED — do NOT imply pickup in 20 minutes. ' +
        'You may still walk the menu for their next visit. If Frank Martino (creator): acknowledge he built this site with Rex in Cursor — warm inside joke, one beat.',
    };
  }

  const open = mins >= OPEN_START_MINS && mins < CLOSE_MINS;
  return {
    formatted,
    day,
    mins,
    open,
    closedToday: !open,
    hoursLabel: HOURS_LABEL,
    line: open
      ? `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. OPEN now — today (${day}) ${HOURS_LABEL}.`
      : `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. CLOSED right now — today (${day}) hours are ${HOURS_LABEL}. Say we are closed; do not promise pickup today unless before open or after close explain when we open next.`,
  };
}

function isAlwaysClosedDay(day) {
  return day === 'Monday';
}

function nextOpenFromClosedDay(day) {
  return 'tomorrow at 11 AM';
}

/** Short spoken phrase for when the shop opens next. */
function nextOpenPhrase(status) {
  const day = status.day;
  const beforeOpen = (status.mins || 0) < OPEN_START_MINS;

  if (isAlwaysClosedDay(day)) return nextOpenFromClosedDay(day);
  if (beforeOpen) return 'today at 11 AM';
  // After close on an open day (Wed–Sun)
  if (day === 'Sunday') return 'Tuesday at 11 AM';
  return 'tomorrow at 11 AM';
}

/**
 * One gate for anything that puts food on the kitchen's plate: cash tickets,
 * Stripe checkout, saved-card charges. Hours first, then the staff early-close
 * override. Returns { closed, message } with a customer-friendly message.
 */
async function shopClosedCheck(now) {
  const hours = getTacoShopStatus(now);
  if (!hours.open) {
    const when = nextOpenPhrase(hours);
    return {
      closed: true,
      code: 'shop_closed',
      message: isAlwaysClosedDay(hours.day)
        ? 'Taco Express is closed today — we are open Tuesday through Saturday, 11 AM–8 PM, and Sunday 11 AM–6 PM. We open ' +
          when +
          '.'
        : 'Taco Express is closed right now — today\u2019s hours are ' +
          (hours.hoursLabel || hoursLabelFor(hours.day)) +
          '. We open ' +
          when +
          '.',
    };
  }
  try {
    const { fetchShopOverride, publicPayload } = require('./shopStatusStore');
    const ov = publicPayload(await fetchShopOverride());
    if (ov && ov.closed) {
      return {
        closed: true,
        code: 'shop_closed',
        message:
          'Taco Express closed early today' +
          (ov.reason ? ' \u2014 ' + ov.reason : '') +
          ". We'll be back at our regular hours.",
      };
    }
  } catch (e) {}
  return { closed: false, code: '', message: '' };
}

module.exports = { getTacoShopStatus, shopClosedCheck, nextOpenPhrase };
