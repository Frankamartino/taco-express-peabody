/**
 * One-day shutoff for Taco Express Peabody.
 * File applies only while closedDate matches today's Eastern date.
 */
const fs = require('fs');
const path = require('path');

function easternDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function readTurnOffToday(now = new Date()) {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'turn-off-today.json'), 'utf8')
    );
    if (!raw || raw.closedDate !== easternDateKey(now)) return null;
    if (!raw.closed && !raw.soldOutAll) return null;
    return raw;
  } catch (e) {
    return null;
  }
}

module.exports = { easternDateKey, readTurnOffToday };
