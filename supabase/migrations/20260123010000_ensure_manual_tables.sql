-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Re-assert table existence just in case
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

-- Force an update to schema cache by altering comments
COMMENT ON TABLE public.manual_work_records IS 'Manual work records for personnel audit';
COMMENT ON TABLE public.manual_deductions IS 'Manual deductions for personnel audit';

-- Ensure RLS is enabled
alter table public.manual_work_records enable row level security;
alter table public.manual_deductions enable row level security;

-- Ensure Policies (Drop first to avoid duplicates if partially applied)
drop policy if exists "Allow all access for facility members manual_work" on public.manual_work_records;
create policy "Allow all access for facility members manual_work"
    on public.manual_work_records
    for all
    using (
        facility_id in (
            select facility_id from public.staffs
            where auth_user_id = auth.uid()
        )
    );

drop policy if exists "Allow all access for facility members manual_deductions" on public.manual_deductions;
create policy "Allow all access for facility members manual_deductions"
    on public.manual_deductions
    for all
    using (
        facility_id in (
            select facility_id from public.staffs
            where auth_user_id = auth.uid()
        )
    );
