-- Helper function to get current user's organization_id
-- Included here to ensure it exists for the policies below
create or replace function public.my_org_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select organization_id from staffs
  where auth_user_id = auth.uid()
  limit 1;
$$;

-- Create units table
create table if not exists public.units (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable RLS
alter table public.units enable row level security;

-- Create Policy
create policy "Users can view units of their organization"
  on public.units for select
  using ( organization_id = public.my_org_id() );

create policy "Users can insert units to their organization"
  on public.units for insert
  with check ( organization_id = public.my_org_id() );

create policy "Users can update units of their organization"
  on public.units for update
  using ( organization_id = public.my_org_id() );

create policy "Users can delete units of their organization"
  on public.units for delete
  using ( organization_id = public.my_org_id() );

-- Add Indices
create index if not exists units_organization_id_idx on public.units(organization_id);
create index if not exists units_display_order_idx on public.units(display_order);

-- Add unit_id to residents
alter table public.residents 
add column if not exists unit_id uuid references public.units(id) on delete set null;

create index if not exists residents_unit_id_idx on public.residents(unit_id);
