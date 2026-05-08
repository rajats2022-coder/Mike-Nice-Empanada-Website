const CLIENT_SLUG = 'mike-nice-empanadas';
const CLIENT_NAME = 'Mike Nice Empanadas';

function clean(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

async function supabaseRest(path, { method = 'GET', body, prefer } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server env is not configured');

  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  return data;
}

function sectionFromSubmission(row) {
  const type = clean(row.form_type || '').toLowerCase();
  const interest = clean(row.order_interest || '').toLowerCase();
  if (type.includes('merch') || interest.includes('merch') || interest.includes('shirt') || interest.includes('hat')) return 'merch';
  if (type.includes('frozen') || interest.includes('frozen') || interest.includes('pickup')) return 'frozen';
  return 'catering';
}

function dashboardStatus(status) {
  if (status === 'completed' || status === 'archived') return 'done';
  if (status === 'contacted') return 'contacted';
  return 'new';
}

function submissionToLead(row) {
  const section = sectionFromSubmission(row);
  const eventDate = row.event_date || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return {
    id: row.id,
    section,
    status: dashboardStatus(row.status),
    customer: row.customer_name || 'Unknown lead',
    phone: row.customer_phone || '',
    email: row.customer_email || '',
    source: row.form_type === 'manual' ? 'Dashboard' : 'Website form',
    value: 0,
    nextAction: eventDate,
    createdAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    details: [row.order_interest, row.message].filter(Boolean).join(' — ') || 'No details entered yet.',
    preferredContact: row.customer_phone ? 'Text' : 'Email',
    customerType: section === 'catering' ? 'Event planner' : section === 'merch' ? 'Fan / merch buyer' : 'New lead',
    marketingConsent: 'unknown',
    tags: [section],
    metadata: { eventDate: row.event_date || '', submissionId: row.id },
    notes: []
  };
}

function leadToSubmission(lead, clientId) {
  return {
    client_id: clientId,
    form_type: clean(lead.section || 'manual', 80),
    customer_name: clean(lead.customer || lead.customer_name || 'Unknown lead', 160),
    customer_email: clean(lead.email || lead.customer_email || '', 260).toLowerCase(),
    customer_phone: clean(lead.phone || lead.customer_phone || '', 80),
    message: clean(lead.details || lead.message || '', 5000),
    order_interest: clean([lead.section && `Section: ${lead.section}`, lead.source && `Source: ${lead.source}`, lead.value && `Estimated value: $${lead.value}`].filter(Boolean).join(' | '), 1000),
    event_date: clean(lead.nextAction || '', 40) || null,
    status: lead.status === 'done' ? 'completed' : lead.status === 'contacted' ? 'contacted' : 'new'
  };
}

async function getClient() {
  const [client] = await supabaseRest('/clients?on_conflict=slug', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: [{ slug: CLIENT_SLUG, name: CLIENT_NAME }]
  });
  return client;
}

export default async function handler(req, res) {
  try {
    const client = await getClient();

    if (req.method === 'GET') {
      const rows = await supabaseRest(`/client_form_submissions?client_id=eq.${client.id}&order=created_at.desc`);
      return res.status(200).json({ schemaVersion: 4, leads: rows.map(submissionToLead) });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const [row] = await supabaseRest('/client_form_submissions', {
        method: 'POST',
        prefer: 'return=representation',
        body: [leadToSubmission(body, client.id)]
      });
      return res.status(200).json(submissionToLead(row));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('leads api failed', error);
    return res.status(500).json({ error: 'Lead API is not connected yet. Add Supabase env vars and run the migration.' });
  }
}
