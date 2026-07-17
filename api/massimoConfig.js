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

  /**
   * Built-in guest memory for demos / video (Mem0 may be off).
   * Match on first+last name (case-insensitive). Keep short.
   */
  KNOWN_GUESTS: [
    {
      firstName: 'Frank',
      lastName: 'Martino',
      email: 'frankamartino@gmail.com',
      phone: '978-337-3777',
      notes: [
        'Regular / owner-friend energy — warm and familiar, not stiff.',
        'Past order: Three Tacos · Shredded Chicken, Mexican Coke, mild — hands-free card pay.',
        'Past order: Burrito · Ribeye (mild), Mexican Coke glass — pickup, cash.',
        'Past order: Burrito · Shredded Beef — likes extras (guac, pico, chips, salsa, consommé).',
        'Usually mild spice. Often pickup. Sometimes cash, sometimes card on file.',
        'No food allergies on file (says none).',
      ],
    },
  ],
};
