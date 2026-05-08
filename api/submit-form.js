const CLIENT_SLUG = 'mike-nice-empanadas';
const CLIENT_NAME = 'Mike Nice Empanadas';

function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function supabaseRest(path, { method = 'GET', body, prefer } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env is not configured');

  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const honeypot = clean(body.website || body.company_website || '', 200);
    if (honeypot) return res.status(200).json({ ok: true });

    const customerName = clean(body.customer_name || body.name, 160);
    const customerEmail = clean(body.customer_email || body.email, 260).toLowerCase();
    const customerPhone = clean(body.customer_phone || body.phone, 80);
    const message = clean(body.message, 5000);
    const formType = clean(body.form_type || 'contact', 80) || 'contact';
    const eventDate = clean(body.event_date, 40) || null;
    const guests = clean(body.guests, 40);
    const eventType = clean(body.event_type, 160);
    const orderInterest = clean(body.order_interest || [eventType && `Event type: ${eventType}`, guests && `Guests: ${guests}`].filter(Boolean).join(' | '), 1000);

    if (!customerName) return res.status(400).json({ error: 'Name is required.' });
    if (!customerPhone) return res.status(400).json({ error: 'Phone number is required.' });
    if (!customerEmail || !isEmail(customerEmail)) return res.status(400).json({ error: 'Valid email is required.' });

    const [client] = await supabaseRest('/clients?on_conflict=slug', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{ slug: CLIENT_SLUG, name: CLIENT_NAME }]
    });

    const [submission] = await supabaseRest('/client_form_submissions', {
      method: 'POST',
      prefer: 'return=representation',
      body: [{
        client_id: client.id,
        form_type: formType,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        message,
        order_interest: orderInterest,
        event_date: eventDate || null,
        status: 'new'
      }]
    });

    return res.status(200).json({ ok: true, id: submission.id, client_slug: CLIENT_SLUG });
  } catch (error) {
    console.error('submit-form failed', error);
    return res.status(500).json({ error: 'We could not send this request right now. Please call (984) 272-2728 or try again shortly.' });
  }
}
