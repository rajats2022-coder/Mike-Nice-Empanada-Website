# Mike Nice Empanadas → Existing S4 AI Agency Supabase Setup

This site uses the existing **S4 AI Agency** Supabase project as a multi-tenant database. Mike Nice Empanadas data is separated by `client_id` / `client_slug`.

## Environment variables

Add these to the live host, e.g. Vercel project settings:

```bash
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

Optional dashboard URL behavior uses the same host. Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend JavaScript.

## Migration

Run this SQL in the existing S4 AI Agency Supabase project:

```bash
npm install supabase --save-dev
npx supabase login
npx supabase link --project-ref YOUR_EXISTING_S4_AI_AGENCY_PROJECT_REF
npx supabase db push
```

or paste/run:

`supabase/migrations/20260508005400_multi_tenant_client_forms.sql`

The migration creates:

- `clients`
- `client_form_submissions`
- `dashboard_users`
- RLS helper functions
- tenant-scoped RLS policies
- the Mike tenant row: `mike-nice-empanadas`

## Add dashboard users

After Mike/S4 users are known, add them in SQL:

```sql
insert into public.dashboard_users (client_id, email, role)
select id, 'mike@example.com', 'client_manager'
from public.clients where slug = 'mike-nice-empanadas'
on conflict (client_id, email) do update set role = excluded.role;

insert into public.dashboard_users (client_id, email, role)
select null, 'rajat@example.com', 's4_admin'
where not exists (
  select 1 from public.dashboard_users
  where client_id is null and lower(email) = lower('rajat@example.com') and role = 's4_admin'
);
```

## Form routing

`booking.html` posts to `/api/submit-form` with:

- `client_slug: mike-nice-empanadas`
- `form_type: catering`
- customer contact fields
- event details

The API route uses the service role key server-side and inserts into `client_form_submissions`.

## Mike dashboard

Open:

`/mike-dashboard.html`

It uses the public anon key plus Supabase Auth magic-link login. RLS ensures Mike only sees rows for `mike-nice-empanadas`. S4 admin users can see all if added as `s4_admin`.

## Production notes

- Keep Supabase service role key server-side only.
- RLS is enabled on all client-facing tables.
- Add future clients by inserting a new `clients` row and assigning `dashboard_users`.
- The same API/dashboard pattern can be reused by changing `client_slug`.
