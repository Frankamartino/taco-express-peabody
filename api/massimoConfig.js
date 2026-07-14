/**
 * Massimo voice — FIXED greeting + checkout config (Taco Express /voice).
 * Spoken brand is "Taco Express" (location pages may still show Peabody / Watertown / etc.).
 */
module.exports = {
  HOST_NAME: 'Massimo',
  SHOP_SHORT: 'Taco Express',

  GREETING_EXACT:
    'Welcome to Taco Express. My name is Massimo. May I have your full name?',

  AFTER_NAME_HINT:
    'Thanks [name] — have you dined with us before? Then soft door to food.',

  GREETING_TONE:
    'happy, pleasant, smiling, warm, lightly goofy human humor — never angry, never flat, never robotic, never mean',
  GREETING_PACE: 'steady, natural — not rushed, not slow yellow-bus',

  VOICE: 'cedar',
  SPEED: 0.92,
  MODEL_DEFAULT: 'gpt-realtime',

  /** Peabody meals tax for this voice checkout ticket */
  TAX_RATE: 0.07,

  /** On-screen ticket matches thermal printer paper width */
  TICKET_WIDTH_MM: 80,
};
