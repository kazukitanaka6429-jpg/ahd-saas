-- Clean Schema Fix: Ensure columns exist
-- Because 'CREATE TABLE IF NOT EXISTS' skips existing tables, we need to ensure columns exist.

-- 1. Ensure 'facility_id' exists on all tables used with can_access_facility policy
do $$
begin
    -- Residents
    if not exists (select 1 from information_schema.columns where table_name = 'residents' and column_name = 'facility_id') then
        alter table residents add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Daily Shifts
    if not exists (select 1 from information_schema.columns where table_name = 'daily_shifts' and column_name = 'facility_id') then
        alter table daily_shifts add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Daily Records
    if not exists (select 1 from information_schema.columns where table_name = 'daily_records' and column_name = 'facility_id') then
        alter table daily_records add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Report Entries
    if not exists (select 1 from information_schema.columns where table_name = 'report_entries' and column_name = 'facility_id') then
        alter table report_entries add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Medical Coord V Daily
    if not exists (select 1 from information_schema.columns where table_name = 'medical_coord_v_daily' and column_name = 'facility_id') then
        alter table medical_coord_v_daily add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Medical Cooperation Records
    if not exists (select 1 from information_schema.columns where table_name = 'medical_cooperation_records' and column_name = 'facility_id') then
        alter table medical_cooperation_records add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Short Stay Records
    if not exists (select 1 from information_schema.columns where table_name = 'short_stay_records' and column_name = 'facility_id') then
        alter table short_stay_records add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Finding Comments
    if not exists (select 1 from information_schema.columns where table_name = 'finding_comments' and column_name = 'facility_id') then
        alter table finding_comments add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Facility Notifications
    if not exists (select 1 from information_schema.columns where table_name = 'facility_notifications' and column_name = 'facility_id') then
        alter table facility_notifications add column facility_id uuid references facilities(id) on delete cascade;
    end if;

    -- Staffs (Crucial for function)
    if not exists (select 1 from information_schema.columns where table_name = 'staffs' and column_name = 'facility_id') then
        alter table staffs add column facility_id uuid references facilities(id) on delete set null;
    end if;
    
    -- Staffs Organization ID (Crucial for function)
    if not exists (select 1 from information_schema.columns where table_name = 'staffs' and column_name = 'organization_id') then
        alter table staffs add column organization_id uuid references organizations(id) on delete cascade;
    end if;

end $$;
