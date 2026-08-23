/**
 * Taco Express Peabody — web checkout catalog (matches DoorDash / Diego menu).
 */
const TAX_RATE = 0.07;

const MENU_ITEMS = [
  { id: 'quesadilla-beef', section: 'quesadillas', title: 'Beef', name: 'Loaded Quesadillas Beef', priceCents: 1399 },
  { id: 'quesadilla-chicken', section: 'quesadillas', title: 'Chicken', name: 'Loaded Quesadillas Chicken', priceCents: 1399 },
  { id: 'quesadilla-pork', section: 'quesadillas', title: 'Pork', name: 'Loaded Quesadillas Pork', priceCents: 1399 },
  { id: 'quesadilla-shrimp', section: 'quesadillas', title: 'Shrimp', name: 'Loaded Quesadillas Shrimp', priceCents: 1499 },
  { id: 'tacos-beef', section: 'tacos', title: 'Beef', name: 'Three Tacos · Shredded Beef', priceCents: 1349 },
  { id: 'tacos-chicken', section: 'tacos', title: 'Chicken', name: 'Three Tacos · Shredded Chicken', priceCents: 1349 },
  { id: 'tacos-pork', section: 'tacos', title: 'Pork', name: 'Three Tacos · Shredded Pork', priceCents: 1349 },
  { id: 'tacos-shrimp', section: 'tacos', title: 'Shrimp', name: 'Three Tacos · Grilled Shrimp', priceCents: 1499 },
  { id: 'burrito-beef', section: 'burritos', title: 'Beef', name: 'Burrito · Shredded Beef', priceCents: 1349 },
  { id: 'burrito-chicken', section: 'burritos', title: 'Chicken', name: 'Burrito · Shredded Chicken', priceCents: 1349 },
  { id: 'burrito-pork', section: 'burritos', title: 'Pork', name: 'Burrito · Pork', priceCents: 1349 },
  { id: 'burrito-shrimp', section: 'burritos', title: 'Shrimp', name: 'Burrito · Grilled Shrimp', priceCents: 1499 },
  { id: 'enchilada-beef', section: 'enchiladas', title: 'Beef', name: 'Two Enchiladas · Shredded Beef', priceCents: 1399 },
  { id: 'enchilada-chicken', section: 'enchiladas', title: 'Chicken', name: 'Two Enchiladas · Shredded Chicken', priceCents: 1399 },
  { id: 'enchilada-pork', section: 'enchiladas', title: 'Pork', name: 'Two Enchiladas · Pork', priceCents: 1399 },
  { id: 'enchilada-shrimp', section: 'enchiladas', title: 'Shrimp', name: 'Two Enchiladas · Grilled Shrimp', priceCents: 1599 },
  { id: 'side-rice', section: 'sides', title: 'Seasoned Brown Rice', name: 'Seasoned Brown Rice', priceCents: 349 },
  { id: 'side-black-beans', section: 'sides', title: 'Black Beans', name: 'Black Beans', priceCents: 349 },
  { id: 'side-refried-beans', section: 'sides', title: 'Refried Beans', name: 'Refried Beans', priceCents: 349 },
  { id: 'side-salsa', section: 'sides', title: 'Salsa', name: 'Salsa', priceCents: 150 },
  { id: 'side-pico', section: 'sides', title: 'Pico de Gallo', name: 'Pico de Gallo', priceCents: 400 },
  { id: 'side-chips', section: 'sides', title: 'Tortilla Chips', name: 'Tortilla Chips', priceCents: 250 },
  { id: 'side-guac', section: 'sides', title: 'Guacamole', name: 'Guacamole', priceCents: 300 },
  { id: 'extra-beef', section: 'sides', title: 'Extra Beef', name: 'Extra Beef', priceCents: 400 },
  { id: 'extra-chicken', section: 'sides', title: 'Extra Chicken', name: 'Extra Chicken', priceCents: 400 },
  { id: 'extra-pork', section: 'sides', title: 'Extra Pork', name: 'Extra Pork', priceCents: 400 },
  { id: 'extra-shrimp', section: 'sides', title: 'Extra Shrimp', name: 'Extra Shrimp', priceCents: 500 },
  { id: 'extra-rice', section: 'sides', title: 'Extra Rice', name: 'Extra Rice', priceCents: 200 },
  { id: 'extra-black-beans', section: 'sides', title: 'Extra Black Beans', name: 'Extra Black Beans', priceCents: 200 },
  { id: 'extra-cheese', section: 'sides', title: 'Extra Cheese', name: 'Extra Cheese', priceCents: 150 },
  { id: 'extra-sour-cream', section: 'sides', title: 'Extra Sour Cream', name: 'Extra Sour Cream', priceCents: 100 },
  { id: 'fryer-fries', section: 'fryer', title: 'French Fries', name: 'French Fries', priceCents: 499 },
  { id: 'fryer-rings', section: 'fryer', title: 'Onion Rings', name: 'Onion Rings', priceCents: 599 },
  { id: 'fryer-fingers', section: 'fryer', title: 'Chicken Fingers (6)', name: 'Chicken Fingers (6)', priceCents: 1200 },
  { id: 'fryer-wings', section: 'fryer', title: 'Jumbo Wings (6)', name: 'Jumbo Wings (6)', priceCents: 1300 },
  { id: 'drink-mexican-coke', section: 'drinks', title: 'Mexican Coke', name: 'Mexican Coke', priceCents: 399 },
  { id: 'drink-coke', section: 'drinks', title: 'Coca-Cola', name: 'Coca-Cola', priceCents: 299 },
  { id: 'drink-diet-coke', section: 'drinks', title: 'Diet Coke', name: 'Diet Coke', priceCents: 299 },
  { id: 'drink-coke-zero', section: 'drinks', title: 'Coke Zero', name: 'Coke Zero', priceCents: 299 },
  { id: 'drink-sprite', section: 'drinks', title: 'Sprite', name: 'Sprite', priceCents: 299 },
  { id: 'drink-ginger-ale', section: 'drinks', title: 'Canada Dry Ginger Ale', name: 'Canada Dry Ginger Ale', priceCents: 299 },
  { id: 'drink-grape-fanta', section: 'drinks', title: 'Grape Fanta', name: 'Grape Fanta', priceCents: 299 },
  { id: 'drink-orange-fanta', section: 'drinks', title: 'Orange Fanta', name: 'Orange Fanta', priceCents: 299 },
  { id: 'drink-barqs', section: 'drinks', title: "Barq's Root Beer", name: "Barq's Root Beer", priceCents: 299 },
  { id: 'drink-dr-pepper', section: 'drinks', title: 'Dr Pepper', name: 'Dr Pepper', priceCents: 299 },
  { id: 'drink-aquafina', section: 'drinks', title: 'Aquafina', name: 'Aquafina', priceCents: 299 },
  { id: 'drink-pellegrino', section: 'drinks', title: 'San Pellegrino', name: 'San Pellegrino', priceCents: 349 },
];

const BY_ID = Object.fromEntries(MENU_ITEMS.map((item) => [item.id, item]));

function normalizeTitle(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findMenuItem(sectionId, title) {
  const section = normalizeTitle(sectionId);
  const wanted = normalizeTitle(title);
  return MENU_ITEMS.find(
    (item) => normalizeTitle(item.section) === section && normalizeTitle(item.title) === wanted
  );
}

function computeTotals(lines, tipCents) {
  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const tip = Math.max(0, Math.round(Number(tipCents) || 0));
  const totalCents = subtotalCents + taxCents + tip;
  return { subtotalCents, taxCents, tipCents: tip, totalCents };
}

/** Tip from percent of food subtotal, or a fixed dollar/cents amount. */
function resolveTipCents(subtotalCents, tip) {
  if (!tip || typeof tip !== 'object') return 0;
  if (tip.mode === 'percent') {
    const pct = Number(tip.percent);
    if (![5, 10, 15, 20, 25].includes(pct)) return 0;
    return Math.round(subtotalCents * (pct / 100));
  }
  if (tip.mode === 'other') {
    const dollars = Number(tip.amount);
    if (!isFinite(dollars) || dollars < 0) return 0;
    return Math.min(Math.round(dollars * 100), 50000);
  }
  return 0;
}

function buildLinesFromCart(cartLines) {
  const lines = [];
  for (const row of cartLines) {
    const id = String(row.id || '').trim();
    const qty = Math.max(1, Math.min(20, Number(row.qty) || 1));
    const item = BY_ID[id];
    if (!item) {
      throw new Error('Unknown menu item: ' + id);
    }
    lines.push({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      qty,
    });
  }
  if (!lines.length) {
    throw new Error('Cart is empty.');
  }
  return lines;
}

module.exports = {
  TAX_RATE,
  MENU_ITEMS,
  BY_ID,
  findMenuItem,
  computeTotals,
  resolveTipCents,
  buildLinesFromCart,
};
