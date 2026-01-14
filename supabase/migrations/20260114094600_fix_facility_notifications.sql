-- Ensure facility_notifications table exists
-- Run this if you get error: "Could not find the table 'public.facility_notifications' in the schema cache"

-- Create table if not exists
create table if not exists facility_notifications (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references facilities(id) not null,
  created_by uuid references staffs(id),
  
  content text not null,
  priority text default 'normal' check (priority in ('high', 'normal', 'low')),
  status text default 'open' check (status in ('open', 'resolved')),
  
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  resolved_by uuid references staffs(id)
);

-- Enable RLS
alter table facility_notifications enable row level security;

-- Drop existing policies
drop policy if exists "Enable read access for authenticated users" on facility_notifications;
drop policy if exists "Enable insert access for authenticated users" on facility_notifications;
drop policy if exists "Enable update access for authenticated users" on facility_notifications;
drop policy if exists "Enable all for authorized staff" on facility_notifications;

-- Create permissive policies using can_access_facility for proper Admin/Staff access
create policy "Enable all for authorized staff"
on facility_notifications for all
to authenticated
using (public.can_access_facility(facility_id))
with check (public.can_access_facility(facility_id));

-- Refresh schema cache
notify pgrst, 'reload schema';
