/**
 * Massimo voice — FIXED greeting config (Taco Express PB copy /voice).
 * Permanent session defaults. Do not improvise. Every new Realtime session loads this.
 *
 * Spec (Lily → Rex):
 * On session start, load this fixed greeting and read it with a steady, neutral pace
 * and a warm, welcoming tone. Keep the phrasing exact whenever the greeting is needed.
 */
module.exports = {
  HOST_NAME: 'Massimo',
  SHOP_SHORT: 'Taco Express PB',

  /** Exact opening — never paraphrase */
  GREETING_EXACT:
    'Welcome to Taco Express PB. My name is Massimo. What can I get you?',

  /** Delivery — locked with the line */
  GREETING_TONE: 'warm, welcoming',
  GREETING_PACE: 'steady, neutral',

  /** Match Martino Massimo Realtime audio */
  VOICE: 'cedar',
  SPEED: 0.92,
  MODEL_DEFAULT: 'gpt-realtime',
};
