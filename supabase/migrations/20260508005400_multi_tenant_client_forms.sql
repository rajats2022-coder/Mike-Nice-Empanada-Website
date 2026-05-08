-- Multi-tenant client form system for the existing "S4 AI Agency" Supabase project.
-- Do not create a new project. Run this migration in the existing project.

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.client_form_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  form_type text not null default 'contact',
  customer_name text not null,
  customer_email text,
  customer_phone text,
  message text,
  order_interest text,
  event_date date,
  status text not null default 'new' check (status in ('new', 'contacted', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.dashboard_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  email text not null,
  role text not null default 'client_viewer' check (role in ('client_viewer', 'client_manager', 's4_admin')),
  created_at timestamptz not null default now(),
  unique (client_id, email)
);

create index if not exists idx_clients_slug on public.clients(slug);
create index if not exists idx_client_form_submissions_client_status_created on public.client_form_submissions(client_id, status, created_at desc);
create index if not exists idx_dashboard_users_email on public.dashboard_users(lower(email));
create index if not exists idx_dashboard_users_client on public.dashboard_users(client_id);

insert into public.clients (name, slug)
values ('Mike Nice Empanadas', 'mike-nice-empanadas')
on conflict (slug) do update set name = excluded.name;

-- Add dashboard users after Supabase Auth users/email are known, for example:
-- insert into public.dashboard_users (client_id, email, role)
-- select id, 'mike@example.com', 'client_manager'
-- from public.clients where slug = 'mike-nice-empanadas'
-- on conflict (client_id, email) do update set role = excluded.role;
--
-- S4 admins can see all clients/submissions:
-- insert into public.dashboard_users (client_id, email, role)
-- values (null, 'rajat@example.com', 's4_admin')
-- on conflict (client_id, email) do update set role = excluded.role;

alter table public.clients enable row level security;
alter table public.client_form_submissions enable row level security;
alter table public.dashboard_users enable row level security;

create or replace function public.app_current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.app_is_s4_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dashboard_users du
    where lower(du.email) = public.app_current_user_email()
      and du.role = 's4_admin'
  );
$$;

create or replace function public.app_has_client_access(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dashboard_users du
    where lower(du.email) = public.app_current_user_email()
      and du.client_id = target_client_id
      and du.role in ('client_viewer', 'client_manager', 's4_admin')
  );
$$;

drop policy if exists "clients_select_by_tenant_or_admin" on public.clients;
create policy "clients_select_by_tenant_or_admin"
  on public.clients
  for select
  to authenticated
  using (public.app_is_s4_admin() or public.app_has_client_access(id));

drop policy if exists "dashboard_users_select_self_or_admin" on public.dashboard_users;
create policy "dashboard_users_select_self_or_admin"
  on public.dashboard_users
  for select
  to authenticated
  using (public.app_is_s4_admin() or lower(email) = public.app_current_user_email());

drop policy if exists "dashboard_users_admin_insert" on public.dashboard_users;
create policy "dashboard_users_admin_insert"
  on public.dashboard_users
  for insert
  to authenticated
  with check (public.app_is_s4_admin());

drop policy if exists "dashboard_users_admin_update" on public.dashboard_users;
create policy "dashboard_users_admin_update"
  on public.dashboard_users
  for update
  to authenticated
  using (public.app_is_s4_admin())
  with check (public.app_is_s4_admin());

drop policy if exists "submissions_select_by_tenant_or_admin" on public.client_form_submissions;
create policy "submissions_select_by_tenant_or_admin"
  on public.client_form_submissions
  for select
  to authenticated
  using (public.app_is_s4_admin() or public.app_has_client_access(client_id));

drop policy if exists "submissions_update_by_tenant_manager_or_admin" on public.client_form_submissions;
create policy "submissions_update_by_tenant_manager_or_admin"
  on public.client_form_submissions
  for update
  to authenticated
  using (
    public.app_is_s4_admin()
    or exists (
      select 1 from public.dashboard_users du
      where lower(du.email) = public.app_current_user_email()
        and du.client_id = client_form_submissions.client_id
        and du.role in ('client_manager', 's4_admin')
    )
  )
  with check (
    public.app_is_s4_admin()
    or exists (
      select 1 from public.dashboard_users du
      where lower(du.email) = public.app_current_user_email()
        and du.client_id = client_form_submissions.client_id
        and du.role in ('client_manager', 's4_admin')
    )
  );

-- No public/anon insert policy on client_form_submissions.
-- Website forms should submit through secure server-side API routes using SUPABASE_SERVICE_ROLE_KEY.
