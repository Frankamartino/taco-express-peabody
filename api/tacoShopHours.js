/**
 * Taco Express Peabody — shop hours (US Eastern).
 * Mon–Tue CLOSED. Wed–Sat 11–8. Sun 11–6.
 */
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

  if (day === 'Monday' || day === 'Tuesday') {
    return {
      formatted,
      day,
      open: false,
      closedToday: true,
      line:
        `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. CLOSED TODAY — ${day} we are always closed. Mon–Tue closed every week. Next open: Wednesday 11 AM. ` +
        'If they want food today, say clearly we are CLOSED — do NOT imply pickup in 20 minutes, do NOT joke about a "midweek taco run". ' +
        'You may still walk the menu for their next visit. If Frank Martino (creator): acknowledge he built this site with Rex in Cursor — warm inside joke, one beat.',
    };
  }

  const openStart = 11 * 60;
  let openEnd;
  let hoursLabel;
  if (day === 'Sunday') {
    openEnd = 18 * 60;
    hoursLabel = '11 AM–6 PM';
  } else {
    openEnd = 20 * 60;
    hoursLabel = '11 AM–8 PM';
  }
  const open = mins >= openStart && mins < openEnd;
  return {
    formatted,
    day,
    open,
    closedToday: !open,
    hoursLabel,
    line: open
      ? `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. OPEN now — today (${day}) ${hoursLabel}.`
      : `OPEN/CLOSED RIGHT NOW (AUTHORITATIVE): ${formatted} Eastern. CLOSED right now — today (${day}) hours are ${hoursLabel}. Say we are closed; do not promise pickup today unless before open or after close explain when we open next.`,
  };
}

module.exports = { getTacoShopStatus };
