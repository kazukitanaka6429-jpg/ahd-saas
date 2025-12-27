create table if not exists medical_cooperation_records (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references facilities(id) on delete cascade not null,
  resident_id uuid references residents(id) on delete cascade not null,
  staff_id uuid references staffs(id) on delete set null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(resident_id, date)
);

-- RLS Policies
alter table medical_cooperation_records enable row level security;

create policy "Enable read access for authenticated users with same facility_id"
    on medical_cooperation_records for select
    using (
        auth.uid() in (
            select auth_user_id from staffs where facility_id = medical_cooperation_records.facility_id
        )
    );

create policy "Enable insert for authenticated users with same facility_id"
    on medical_cooperation_records for insert
    with check (
        auth.uid() in (
            select auth_user_id from staffs where facility_id = medical_cooperation_records.facility_id
        )
    );

create policy "Enable update for authenticated users with same facility_id"
    on medical_cooperation_records for update
    using (
        auth.uid() in (
            select auth_user_id from staffs where facility_id = medical_cooperation_records.facility_id
        )
    );

create policy "Enable delete for authenticated users with same facility_id"
    on medical_cooperation_records for delete
    using (
        auth.uid() in (
            select auth_user_id from staffs where facility_id = medical_cooperation_records.facility_id
        )
    );
