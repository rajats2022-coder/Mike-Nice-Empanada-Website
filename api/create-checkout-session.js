import fs from 'fs';
import path from 'path';

const PRODUCTS_PATH = path.join(process.cwd(), 'assets/merch/products.json');

function loadProducts() {
  const raw = fs.readFileSync(PRODUCTS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const map = new Map();
  for (const product of data.products) {
    for (const size of product.sizes) {
      map.set(`${product.printifyProductId}:${size.variantId}`, { ...product, selectedSize: size.label, variantId: size.variantId });
    }
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(200).json({
      ok: false,
      message: 'Website checkout is ready in code, but Stripe keys are not configured on this host yet.'
    });
  }

  const { items = [] } = req.body || {};
  const productMap = loadProducts();
  const safeItems = [];

  for (const item of items) {
    const key = `${item.printifyProductId}:${item.variantId}`;
    const product = productMap.get(key);
    const qty = Math.max(1, Math.min(10, Number(item.qty || 1)));
    if (!product) continue;
    safeItems.push({ product, qty });
  }

  if (!safeItems.length) return res.status(400).json({ error: 'No valid merch items' });

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${origin}/merch.html?checkout=success`);
  params.set('cancel_url', `${origin}/merch.html?checkout=cancelled`);
  params.set('shipping_address_collection[allowed_countries][0]', 'US');
  params.set('phone_number_collection[enabled]', 'true');
  params.set('metadata[fulfillment]', 'printify');
  params.set('metadata[cart]', JSON.stringify(safeItems.map(({ product, qty }) => ({
    productId: product.printifyProductId,
    variantId: product.variantId,
    name: product.name,
    size: product.selectedSize,
    qty
  }))));

  safeItems.forEach(({ product, qty }, i) => {
    params.set(`line_items[${i}][quantity]`, String(qty));
    params.set(`line_items[${i}][price_data][currency]`, 'usd');
    params.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(product.price * 100)));
    params.set(`line_items[${i}][price_data][product_data][name]`, `${product.name} — ${product.selectedSize}`);
    params.set(`line_items[${i}][price_data][product_data][images][0]`, `${origin}/${product.image}`);
  });

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const data = await stripeRes.json();
  if (!stripeRes.ok) return res.status(500).json({ error: data.error?.message || 'Stripe checkout failed' });
  return res.status(200).json({ ok: true, url: data.url, id: data.id });
}
