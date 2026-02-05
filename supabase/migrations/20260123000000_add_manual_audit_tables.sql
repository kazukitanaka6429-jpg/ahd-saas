-- Create manual_work_records table
create table if not exists public.manual_work_records (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null references public.facilities(id) on delete cascade,
    staff_id uuid not null references public.staffs(id) on delete cascade,
    target_date text not null,
    start_time text not null,
    end_time text not null,
    note text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create manual_deductions table
create table if not exists public.manual_deductions (
    id uuid primary key default gen_random_uuid(),
    facility_id uuid not null references public.facilities(id) on delete cascade,
    staff_id uuid not null references public.staffs(id) on delete cascade,
    target_date text not null,
    start_time text,
    end_time text,
    reason text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.manual_work_records enable row level security;
alter table public.manual_deductions enable row level security;

-- Policies for manual_work_records
create policy "Allow all access for facility members manual_work"
    on public.manual_work_records
    for all
    using (
        facility_id in (
            select facility_id from public.staffs
            where auth_user_id = auth.uid()
        )
    );

-- Policies for manual_deductions
create policy "Allow all access for facility members manual_deductions"
    on public.manual_deductions
    for all
    using (
        facility_id in (
            select facility_id from public.staffs
            where auth_user_id = auth.uid()
        )
    );

-- Add indexes
create index if not exists idx_manual_work_target_date on public.manual_work_records(target_date);
create index if not exists idx_manual_work_facility on public.manual_work_records(facility_id);
create index if not exists idx_manual_deduction_target_date on public.manual_deductions(target_date);
create index if not exists idx_manual_deduction_facility on public.manual_deductions(facility_id);
