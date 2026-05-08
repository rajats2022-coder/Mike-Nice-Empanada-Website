// Stripe → Printify fulfillment bridge.
// Configure on Vercel with STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID.
// Webhook event needed: checkout.session.completed

export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function verifyStripeSignature(rawBody, sig, secret) {
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  const crypto = await import('crypto');
  const parts = Object.fromEntries(String(sig || '').split(',').map(part => part.split('=')));
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) throw new Error('Bad Stripe signature header');
  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(digest, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid Stripe signature');
  return JSON.parse(rawBody.toString('utf8'));
}

async function printify(method, route, body) {
  const res = await fetch(`https://api.printify.com/v1${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MikeNiceMerch/1.0'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 1000));
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const raw = await readRaw(req);

  let event;
  try {
    event = await verifyStripeSignature(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook not active: ${err.message}`);
  }

  if (event.type !== 'checkout.session.completed') return res.status(200).json({ received: true });
  if (!process.env.PRINTIFY_API_TOKEN || !process.env.PRINTIFY_SHOP_ID) {
    return res.status(500).json({ error: 'Missing Printify env vars' });
  }

  const session = event.data.object;
  const cart = JSON.parse(session.metadata?.cart || '[]');
  const shipping = session.shipping_details || {};
  const address = shipping.address || {};
  const customer = session.customer_details || {};

  const order = {
    external_id: session.id,
    label: `Mike Nice merch ${session.id}`,
    line_items: cart.map(item => ({
      product_id: item.productId,
      variant_id: Number(item.variantId),
      quantity: Number(item.qty || 1)
    })),
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: {
      first_name: (shipping.name || customer.name || 'Customer').split(' ')[0],
      last_name: (shipping.name || customer.name || 'Customer').split(' ').slice(1).join(' ') || '.',
      email: customer.email,
      phone: customer.phone || '',
      country: address.country || 'US',
      region: address.state || '',
      address1: address.line1 || '',
      address2: address.line2 || '',
      city: address.city || '',
      zip: address.postal_code || ''
    }
  };

  const created = await printify('POST', `/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`, order);
  return res.status(200).json({ received: true, printifyOrder: created.id || created });
}
