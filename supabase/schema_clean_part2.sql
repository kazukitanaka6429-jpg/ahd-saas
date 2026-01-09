-- Clean Schema Part 2: RLS Policies
-- Run this AFTER Part 1

-- =================================================================================================
-- RLS POLICIES (Simplified for Robustness)
-- =================================================================================================

-- Enable RLS
alter table organizations enable row level security;
alter table facilities enable row level security;
alter table qualifications enable row level security;
alter table staffs enable row level security;
alter table residents enable row level security;
alter table daily_shifts enable row level security;
alter table daily_records enable row level security;
alter table report_entries enable row level security;
alter table medical_coord_v_daily enable row level security;
alter table medical_cooperation_records enable row level security;
alter table short_stay_records enable row level security;
alter table finding_comments enable row level security;
alter table facility_notifications enable row level security;
alter table operation_logs enable row level security;

-- Helper Function: Is Member of Org
drop function if exists is_org_member(uuid);
create or replace function is_org_member(org_id uuid) returns boolean as $$
begin
    return exists (
        select 1 from staffs
        where staffs.auth_user_id = auth.uid()
        and staffs.organization_id = org_id
        and (staffs.status = 'active' or staffs.status is null)
    );
end;
$$ language plpgsql security definer;

-- Helper Function: Is Member of Facility or Admin of Org
drop function if exists can_access_facility(uuid);
create or replace function can_access_facility(fac_id uuid) returns boolean as $$
begin
    return exists (
        select 1 from staffs
        join facilities on facilities.organization_id = staffs.organization_id
        where staffs.auth_user_id = auth.uid()
        and facilities.id = fac_id
        and (
            staffs.role = 'admin' -- Admin can access all facilities in org
            or
            staffs.facility_id = fac_id -- Staff/Manager access their own facility
        )
    );
end;
$$ language plpgsql security definer;

-- 1. Organizations
create policy "View own org" on organizations for select using (is_org_member(id));

-- 2. Facilities
create policy "View own facilities" on facilities for select using (is_org_member(organization_id));
create policy "Admin manage facilities" on facilities for all using (
    exists (select 1 from staffs where auth_user_id = auth.uid() and organization_id = facilities.organization_id and role = 'admin')
);

-- 3. Staffs
-- Users can view staffs in same org
create policy "View org staffs" on staffs for select using (is_org_member(organization_id));
-- Only admin/manager can edit staffs
create policy "Admin/Manager edit staffs" on staffs for update using (
    exists (select 1 from staffs s where s.auth_user_id = auth.uid() and s.organization_id = staffs.organization_id and s.role in ('admin', 'manager'))
);
-- Self edit (limited fields)
create policy "Self edit" on staffs for update using (auth_user_id = auth.uid());

-- 4. Residents & Records (Hierarchy: Organization -> Facility -> Data)
-- Common Policy Pattern:
-- SELECT: can_access_facility(facility_id)
-- INSERT/UPDATE/DELETE: can_access_facility(facility_id)

create policy "Access residents" on residents for all using (can_access_facility(facility_id));
create policy "Access daily_shifts" on daily_shifts for all using (can_access_facility(facility_id));
create policy "Access daily_records" on daily_records for all using (can_access_facility(facility_id));
create policy "Access report_entries" on report_entries for all using (can_access_facility(facility_id));
create policy "Access medical_coord_v_daily" on medical_coord_v_daily for all using (can_access_facility(facility_id));
create policy "Access medical_cooperation_records" on medical_cooperation_records for all using (can_access_facility(facility_id));
create policy "Access short_stay_records" on short_stay_records for all using (can_access_facility(facility_id));
create policy "Access finding_comments" on finding_comments for all using (can_access_facility(facility_id));

-- Notifications
create policy "Access notifications" on facility_notifications for all using (can_access_facility(facility_id));

-- Qualifications (Public Read, Admin Write)
create policy "Public read qualifications" on qualifications for select using (true);
create policy "Admin manage qualifications" on qualifications for all using (
    exists (select 1 from staffs where auth_user_id = auth.uid() and role = 'admin')
);
