-- Helper function to check facility access (Re-defining here to ensure existence)
CREATE OR REPLACE FUNCTION public.can_access_facility(fid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_org UUID;
    user_role TEXT;
    user_fac UUID;
    target_org UUID;
BEGIN
    SELECT organization_id, role, facility_id INTO user_org, user_role, user_fac
    FROM staffs WHERE auth_user_id = auth.uid() LIMIT 1;
    
    -- If user not found, deny
    IF user_org IS NULL THEN RETURN false; END IF;
    
    -- Get target facility's organization
    SELECT organization_id INTO target_org FROM facilities WHERE id = fid;
    
    -- 1. Admin Logic: Must match Organization
    IF user_role = 'admin' THEN
        RETURN user_org = target_org;
    END IF;
    
    -- 2. Staff/Manager Logic: Must match Facility ID
    RETURN user_fac = fid;
END;
$$;

-- Add facility_id to units table
alter table public.units
add column if not exists facility_id uuid references public.facilities(id) on delete cascade;

-- Create index
create index if not exists units_facility_id_idx on public.units(facility_id);

-- Update RLS policies to be facility-based

-- Drop existing policies
drop policy if exists "Users can view units of their organization" on public.units;
drop policy if exists "Users can insert units to their organization" on public.units;
drop policy if exists "Users can update units of their organization" on public.units;
drop policy if exists "Users can delete units of their organization" on public.units;

-- Create new policies
-- View: Users who can access the facility (Admins of Org, or Staff of Facility)
create policy "Users can view units of their facility"
  on public.units for select
  using (
    facility_id is not null and
    public.can_access_facility(facility_id)
  );

-- Write: Users who can access the facility (Admins/Managers) - Reusing same check for now for simplicity, 
-- but usually we might restrict based on role. 
-- Given the requirement "Facility Master creates units", the user editing the facility is an Admin/Manager.
create policy "Users can insert units to their facility"
  on public.units for insert
  with check (
    facility_id is not null and
    public.can_access_facility(facility_id)
  );

create policy "Users can update units of their facility"
  on public.units for update
  using (
    facility_id is not null and
    public.can_access_facility(facility_id)
  );

create policy "Users can delete units of their facility"
  on public.units for delete
  using (
    facility_id is not null and
    public.can_access_facility(facility_id)
  );
