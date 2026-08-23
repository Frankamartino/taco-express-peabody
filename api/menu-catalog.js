const { MENU_ITEMS } = require('./menuCatalog');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    shop: 'taco-express-peabody',
    taxRate: 0.07,
    items: MENU_ITEMS.map((item) => ({
      id: item.id,
      section: item.section,
      title: item.title,
      name: item.name,
      price: item.priceCents / 100,
      priceCents: item.priceCents,
    })),
  });
};
