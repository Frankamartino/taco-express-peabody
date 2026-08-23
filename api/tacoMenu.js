/**
 * Taco Express Peabody — one DoorDash menu for Diego voice + supervisor.
 * This GitHub repo only (taco-express-peabody). Do not load another restaurant's menu.
 */
const FULL_MENU = `
Taco Express Peabody — 58 Pulaski Street, Peabody MA 01960 · (978) 982-1800
Hours: Mon–Tue CLOSED. Wed–Sat 11AM–8PM. Sun 11AM–6PM.
Prices match DoorDash Menu Manager.

RULES (always):
- FULL MENU below is the ONLY authority for food items/prices. Exact name + price. Never invent menu items.
- Guest memory: use KNOWN GUEST MEMORY in your instructions when the name matches — that is real for this session.
- One protein per item / plate — never mix proteins on the same order item.
- Mild or spicy when they choose.
- Proteins: braised shredded beef (never ground — slow-cooked with carrots, celery & taco seasoning like a beef stew, cooled, shredded, simmered again), braised shredded chicken, braised shredded pork, shrimp seasoned & grilled to perfection.
- NOT ON MENU: ribeye burrito, one-taco $5 special, taco bowls, burrito bowls, party platters, steak taco, filet, veggie/tofu.

TACO MAPPING (CRITICAL):
- "beef/chicken/pork/shrimp taco(s)" = three-taco plate.
  Titles: Three Tacos · Shredded Beef $13.49 | Three Tacos · Shredded Chicken $13.49 | Three Tacos · Shredded Pork $13.49 | Three Tacos · Grilled Shrimp $21.99

COOKING METHOD (say when they ask how it's made — short; do not dump on every order):
Beef, chicken & pork are braised / shredded — never ground. Beef: slow-cooked with carrots, celery & taco seasoning (like a good beef stew), cooled, shredded, simmered again. Shrimp: seasoned & grilled to perfection.

ENCHILADA PITCH (first-time guests / when they ask how enchiladas are made — warm, simple, one short beat):
"Our enchiladas are packed with braised shredded beef, slow-cooked like a rich beef stew, then wrapped in soft tortillas, smothered in sauce, melted cheese on top — ready to finish with sour cream or pico. Pure comfort right out of the oven."
Adapt for chicken / pork / shrimp protein. Cheese: Mexican blend inside & on top for now — creamy and full-flavored. Do NOT offer cheese choices online or by voice (keeps ordering simple). Frank is looking for queso Oaxaca for an even creamier inside melt — if asked about cheese: Mexican blend, melts rich; no menu of cheese options.

Ring DoorDash titles (exact) — show order: tacos, burritos, enchiladas, quesadillas. Proteins always Beef, Chicken, Pork, Shrimp:
TACOS (three alone): Three Tacos · Shredded Beef $13.49 | Three Tacos · Shredded Chicken $13.49 | Three Tacos · Shredded Pork $13.49 | Three Tacos · Grilled Shrimp $21.99
TACO DINNER (Add two sides = rice & beans, +$7): Taco Plate · Beef $20.49 | Taco Plate · Chicken $20.49 | Taco Plate · Pork $20.49 | Taco Plate · Shrimp $28.99 — use when they say dinner, plate, or with rice and beans.
BURRITOS: Burrito · Shredded Beef $13.49 | Burrito · Shredded Chicken $13.49 | Burrito · Pork $13.49 | Burrito · Grilled Shrimp $21.99
ENCHILADAS (two): Two Enchiladas · Shredded Beef $13.99 | Two Enchiladas · Shredded Chicken $13.99 | Two Enchiladas · Pork $13.99 | Two Enchiladas · Grilled Shrimp $21.99
QUESADILLAS: Loaded Quesadillas Beef $13.99 | Loaded Quesadillas Chicken $13.99 | Loaded Quesadillas Pork $13.99 | Loaded Quesadillas Shrimp $21.99

SIDES: Seasoned Brown Rice $3.49 · Black Beans $3.49 · Refried Beans $3.49 · Salsa $1.50 · Pico de Gallo $4 · Tortilla Chips $2.50 · Guacamole $3

EXTRAS: Extra Shredded Beef $4 · Extra Shredded Chicken $4 · Extra Pork $4 · Extra Grilled Shrimp $5 · Extra Rice $2 · Extra Black Beans $2 · Extra Cheese $1.50 · Extra Sour Cream $1

FRYER FAVORITES: French Fries $4.99 · Onion Rings $5.99 · Chicken Fingers (6) $12 · Jumbo Wings (6) $13 (buffalo, BBQ, or plain)

BEVERAGES: Mexican Coke $3.99 · cans $2.99 (Coca-Cola, Diet Coke, Coke Zero, Sprite, Canada Dry Ginger Ale, Grape Fanta, Orange Fanta, Barq's Root Beer, Dr Pepper) · Aquafina $2.99 · San Pellegrino $3.49
`.trim();

module.exports = { FULL_MENU };
