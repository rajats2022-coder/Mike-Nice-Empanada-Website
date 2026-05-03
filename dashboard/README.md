# Mike Nice Command Center

Private operating dashboard prototype for Mike Nice Empanadas.

## Scope

This is intentionally separate from the public website. It lives under `dashboard/` and is not linked from the public navigation.

The dashboard includes:

- Overview page with three operating panels: Catering, Frozen Empanadas, Merch
- Catering lead notification inbox and follow-up queue
- Frozen empanada order pipeline
- Merch request pipeline
- Action-based lead organization: New, Contacted, Quoted, Booked, Done
- Business setup page for Mike-specific settings
- Browser `localStorage` persistence for the prototype

## Current Prototype Behavior

This is a front-end dashboard prototype. It stores lead/order data in the browser only. For production, wire these surfaces to real form submissions, email notifications, and a database or CRM backend.

Recommended production integrations:

- Website catering form -> dashboard Catering Leads
- Frozen empanada form/order flow -> dashboard Frozen Empanadas
- Merch order flow -> dashboard Merch
- Email parser or Zapier/Make webhook -> dashboard Lead Inbox
- Optional SMS/email reminders for overdue follow-ups

## Local Use

From the Mike Nice project folder:

```bash
node serve.mjs
```

Open:

```text
http://127.0.0.1:3000/dashboard/
```

Do not link this URL publicly until authentication is added.
