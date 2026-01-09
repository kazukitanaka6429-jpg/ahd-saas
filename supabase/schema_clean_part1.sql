-- Clean Schema Part 1: Table Definitions
-- Run this first!

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
    provider_number text, 
    settings jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(organization_id, code)
);

-- 2. Master Data (Qualifications)
create table if not exists qualifications (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    is_medical_target boolean default false,
    created_at timestamptz default now()
);

-- 3. Users (Staffs)
do $$ begin
    create type staff_role as enum ('admin', 'manager', 'staff');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type staff_status as enum ('active', 'retired');
exception
    when duplicate_object then null;
end $$;

create table if not exists staffs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references organizations(id) on delete cascade,
    facility_id uuid references facilities(id) on delete set null,
    auth_user_id uuid references auth.users(id) on delete set null,
    
    name text not null,
    email text,
    role staff_role not null default 'staff',
    status staff_status not null default 'active',
    
    qualification_id uuid references qualifications(id) on delete set null,
    qualifications_text text,
    job_types text[],
    
    invite_token text unique,
    join_date date,
    leave_date date,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 4. Residents
do $$ begin
    create type resident_status as enum ('in_facility', 'hospitalized', 'home_stay', 'left');
exception
    when duplicate_object then null;
end $$;

create table if not exists residents (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    
    name text not null,
    status resident_status default 'in_facility',
    
    care_level text,
    primary_insurance text,
    public_expense_1 text,
    public_expense_2 text,
    limit_application_class text,
    
    sputum_suction boolean default false,
    severe_disability_addition boolean default false,
    ventilator boolean default false,
    table_7 boolean default false,
    table_8 boolean default false,
    
    start_date date,
    end_date date,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. Daily Workflow (Records & Shifts)
create table if not exists daily_shifts (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    date date not null,
    
    day_staff_ids uuid[],
    night_staff_ids uuid[],
    night_shift_plus boolean default false,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(facility_id, date)
);

create table if not exists daily_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    is_gh boolean default false,
    is_gh_night boolean default false,
    hospitalization_status boolean default false,
    overnight_stay_status boolean default false,
    
    meal_breakfast boolean default false,
    meal_lunch boolean default false,
    meal_dinner boolean default false,
    
    data jsonb default '{}'::jsonb,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(resident_id, date)
);

create table if not exists report_entries (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    temperature numeric(4,1),
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    pulse integer,
    
    meal_morning integer,
    meal_lunch integer,
    meal_dinner integer,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 6. Medical Cooperation IV
create table if not exists medical_coord_v_daily (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    date date not null,
    
    nurse_count integer default 0,
    calculated_units integer default 0,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(facility_id, date)
);

create table if not exists medical_cooperation_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    staff_id uuid references staffs(id) on delete set null,
    medical_coord_v_daily_id uuid references medical_coord_v_daily(id) on delete cascade,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(resident_id, date)
);

-- 7. Short Stay
create table if not exists short_stay_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    resident_id uuid references residents(id) on delete cascade,
    date date not null,
    
    is_gh boolean default false,
    is_gh_night boolean default false,
    meal_breakfast boolean default false,
    meal_lunch boolean default false,
    meal_dinner boolean default false,
    meal_provided_lunch boolean default false,
    
    daytime_activity text,
    other_welfare_service text,
    
    entry_time time,
    exit_time time,
    period_note text,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(resident_id, date)
);

-- 8. Communication
create table if not exists finding_comments (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid references facilities(id) on delete cascade,
    
    daily_record_id uuid references daily_records(id) on delete cascade,
    medical_record_id uuid references medical_cooperation_records(id) on delete cascade,
    short_stay_record_id uuid references short_stay_records(id) on delete cascade,
    
    json_path text not null,
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
    
    type text not null,
    message text not null,
    metadata jsonb default '{}'::jsonb,
    
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
    
    action text not null,
    target_table text,
    target_id uuid,
    details jsonb,
    
    created_at timestamptz default now()
);
