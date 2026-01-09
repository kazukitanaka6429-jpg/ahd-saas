-- Clean Schema Definition for Infrared Rocket Rebuild
-- Created based on REQUIREMENTS.md

-- Extensions
create extension if not exists "uuid-ossp";

-- 1. Organizations & Facilities
create table if not exists organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text not null unique,
    created_at timestamptz default now()
);

create table if not exists facilities (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    name text not null,
    code text not null,
    provider_number text, -- 事業所番号
    settings jsonb default '{}'::jsonb, -- 施設独自設定
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(organization_id, code)
);

-- 2. Master Data (Qualifications)
create table if not exists qualifications (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    is_medical_target boolean default false, -- 医療連携対象加算（IV）対象資格かどうか
    created_at timestamptz default now()
);

-- 3. Users (Staffs)
-- Auth linkage: id is NOT auth.uid(). We map via auth_user_id.
create type staff_role as enum ('admin', 'manager', 'staff');
create type staff_status as enum ('active', 'retired');

create table if not exists staffs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    facility_id uuid references facilities(id) on delete set null, -- Nullable for Admin/Manager
    auth_user_id uuid references auth.users(id) on delete set null,
    
    name text not null,
    email text,
    role staff_role not null default 'staff',
    status staff_status not null default 'active',
    
    qualification_id uuid references qualifications(id) on delete set null, -- 主たる資格
    qualifications_text text, -- 資格（自由記述/補助）
    job_types text[], -- 職種タグ
    
    invite_token text unique, -- 招待用トークン
    join_date date,
    leave_date date,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 4. Residents
create type resident_status as enum ('in_facility', 'hospitalized', 'home_stay', 'left');

create table if not exists residents (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    
    name text not null,
    status resident_status default 'in_facility',
    
    -- Insurance & Billing Info
    care_level text, -- 介護度/障害支援区分
    primary_insurance text,
    public_expense_1 text,
    public_expense_2 text,
    limit_application_class text, -- 限度額適用区分
    
    -- Medical Flags
    sputum_suction boolean default false, -- 喀痰吸引
    severe_disability_addition boolean default false, -- 重度障害者加算
    ventilator boolean default false, -- 人工呼吸器
    table_7 boolean default false, -- 別表7
    table_8 boolean default false, -- 別表8
    
    start_date date, -- 利用開始日
    end_date date, -- 退去日
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. Daily Workflow (Records & Shifts)
create table if not exists daily_shifts (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    date date not null,
    
    -- Staff Assignments (IDs)
    day_staff_ids uuid[],
    night_staff_ids uuid[],
    
    night_shift_plus boolean default false, -- 夜勤加配利用フラグ
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(facility_id, date)
);

create table if not exists daily_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    -- Top Level Flags (Query Performance)
    is_gh boolean default false, -- GH利用
    is_gh_night boolean default false, -- GH泊（夜間）
    hospitalization_status boolean default false, -- 入院中
    overnight_stay_status boolean default false, -- 外泊中
    
    meal_breakfast boolean default false,
    meal_lunch boolean default false,
    meal_dinner boolean default false,
    
    -- Detailed Data (JSONB)
    -- Structure: {
    --   daytime_activity: string | boolean,
    --   other_welfare_service: string,
    --   vitals: { temp, bp_systolic, bp_diastolic, pulse, spo2 },
    --   care_notes: string,
    --   medical_manual_level: number (1,2,3) -- Manual Override for Medical V
    -- }
    data jsonb default '{}'::jsonb,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(resident_id, date)
);

create table if not exists report_entries (
    -- Detailed vitals/care logs (Optionally separate from daily_records if rows are many)
    -- Integrating into daily_records.data is preferred for NoSQL-like flexibility, 
    -- but keeping separate table for structured data analysis if needed.
    -- For this rebuild, we will PRIORITIZE daily_records.data JSONB for flexibility,
    -- but define this compatible table if structured queries are heavy.
    -- To keep schema clean, we will try to stick to daily_records JSONB as primary, 
    -- unless strict type safety is required by Supabase Auto-Generation.
    -- Let's KEEP strict relational table for vital logs as per previous codebase.
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    -- Vitals
    temperature numeric(4,1),
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    pulse integer,
    
    -- Intake/Output
    meal_morning integer, -- %
    meal_lunch integer,   -- %
    meal_dinner integer,  -- %
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 6. Medical Cooperation IV
-- Daily summary for facility (Staff Count etc)
create table if not exists medical_coord_v_daily (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    date date not null,
    
    nurse_count integer default 0, -- 当日の配置看護師数
    calculated_units integer default 0, -- 計算単位数 (optional cache)
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(facility_id, date)
);

-- Individual assignment record
create table if not exists medical_cooperation_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    staff_id uuid references staffs(id) on delete set null, -- 担当看護師
    -- Note: is_executed flag is implied by existence of record ? 
    -- Previous schema had is_executed. 
    -- If staff_id is null, it might mean "Planned but not assigned" or "Error".
    -- Let's assume record existence = Executed/Planned.
    
    medical_coord_v_daily_id uuid references medical_coord_v_daily(id) on delete cascade,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(resident_id, date)
);

-- 7. Short Stay
create table if not exists short_stay_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade, -- Optional? Short stay users might be non-residents. Assuming registered residents for now.
    date date not null,
    
    -- Flags
    is_gh boolean default false,
    is_gh_night boolean default false,
    meal_breakfast boolean default false,
    meal_lunch boolean default false,
    meal_dinner boolean default false,
    meal_provided_lunch boolean default false, -- Addon?
    
    daytime_activity text,
    other_welfare_service text,
    
    entry_time time,
    exit_time time,
    period_note text,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(resident_id, date)
);

-- 8. Communication (Findings & Notifications)
create table if not exists finding_comments (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    
    -- Polymorphic Associations
    daily_record_id uuid references daily_records(id) on delete cascade,
    medical_record_id uuid references medical_cooperation_records(id) on delete cascade,
    short_stay_record_id uuid references short_stay_records(id) on delete cascade,
    
    json_path text not null, -- e.g. "vitals.temp" or "staff_assignment"
    comment text not null,
    author_name text not null,
    is_resolved boolean default false,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists facility_notifications (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    facility_id uuid references facilities(id) on delete cascade,
    
    type text not null, -- 'alert', 'info', 'csv_error'
    message text not null,
    metadata jsonb default '{}'::jsonb, -- e.g. { resident_id: ..., date: ... }
    
    is_read boolean default false,
    created_by uuid references staffs(id) on delete set null,
    
    created_at timestamptz default now()
);

-- 9. Operation Logs
create table if not exists operation_logs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    facility_id uuid references facilities(id) on delete cascade,
    staff_id uuid references staffs(id) on delete set null,
    
    action text not null, -- 'update_daily', 'export_csv', etc.
    target_table text,
    target_id uuid,
    details jsonb,
    
    created_at timestamptz default now()
);

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
