/**
 * Taco Express Peabody — shop hours (US Eastern).
 * Open Wednesday–Friday 11 AM–8 PM. Closed Saturday, Sunday, Monday, Tuesday.
 */
const ALWAYS_CLOSED = {
  Saturday: true,
  Sunday: true,
  Monday: true,
  Tuesday: true,
};

function alwaysClosedDay(day) {
  return !!ALWAYS_CLOSED[day];
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

  if (alwaysClosedDay(day)) {
    return {
      formatted,
      day,
      mins,
      open: false,
      closedToday: true,
      hoursLabel: 'Closed',
      line:
        `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. CLOSED TODAY — ${day} we are always closed. ` +
        'Open Wednesday–Friday 11 AM–8 PM. Saturday through Tuesday closed every week. Next open: Wednesday 11 AM. ' +
        'If they want food today, say clearly we are CLOSED — do NOT imply pickup in 20 minutes, do NOT joke about a "weekend taco run". ' +
        'You may still walk the menu for their next visit. If Frank Martino (creator): acknowledge he built this site with Rex in Cursor — warm inside joke, one beat.',
    };
  }

  const openStart = 11 * 60;
  const openEnd = 20 * 60;
  const hoursLabel = '11 AM–8 PM';
  const open = mins >= openStart && mins < openEnd;
  return {
    formatted,
    day,
    mins,
    open,
    closedToday: !open,
    hoursLabel,
    line: open
      ? `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. OPEN now — today (${day}) ${hoursLabel}.`
      : `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. CLOSED right now — today (${day}) hours are ${hoursLabel}. Say we are closed; do not promise pickup today unless before open or after close explain when we open next.`,
  };
}

/** Short spoken phrase for when the shop opens next. */
function nextOpenPhrase(status) {
  const day = status.day;
  const beforeOpen = (status.mins || 0) < 11 * 60;
  if (day === 'Monday' || day === 'Saturday' || day === 'Sunday') return 'Wednesday at 11 AM';
  if (day === 'Tuesday') return 'tomorrow at 11 AM';
  if (day === 'Friday' && !beforeOpen) return 'Wednesday at 11 AM';
  if (beforeOpen) return 'today at 11 AM';
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
      message: alwaysClosedDay(hours.day)
        ? 'Taco Express is closed today — we are closed Saturday through Tuesday. We open Wednesday at 11 AM.'
        : 'Taco Express is closed right now — today\u2019s hours are ' +
          (hours.hoursLabel || '11 AM\u20138 PM') +
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

module.exports = { getTacoShopStatus, shopClosedCheck, nextOpenPhrase, alwaysClosedDay };
