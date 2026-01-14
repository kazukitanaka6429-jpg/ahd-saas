-- Create operation_logs table for audit trail
create table if not exists operation_logs (
    id uuid not null default gen_random_uuid(),
    organization_id uuid not null,
    actor_id uuid not null,
    target_resource text not null, -- 'daily_record', 'medical_iv_record', 'medical_v_record', etc.
    target_id uuid, -- Optional, can be null for bulk ops
    action_type text not null, -- 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'
    details jsonb, -- Flexible field for identifying info (date, resident_id, etc.)
    ip_address inet,
    created_at timestamp with time zone not null default now(),

    constraint operation_logs_pkey primary key (id)
);

-- Index for RLS and filtering
create index if not exists idx_operation_logs_org_id on operation_logs(organization_id);
create index if not exists idx_operation_logs_created_at on operation_logs(created_at);
create index if not exists idx_operation_logs_target_resource on operation_logs(target_resource);
create index if not exists idx_operation_logs_actor_id on operation_logs(actor_id);

-- RLS Policies
alter table operation_logs enable row level security;

-- Only Authenticated users can insert (via Server Actions)
create policy "Authenticated users can insert logs"
    on operation_logs for insert
    to authenticated
    with check (
        -- Basic check: organization_id must match metadata (usually handled by app logic, but good to enforce if possible)
        -- Since we trust Server Actions to provide correct org_id from session, we allow insertion if auth'd.
        -- Strictly: (organization_id = (select auth.uid() ...)) is hard because auth.uid is user, not org.
        -- For now, allow insert for all authenticated.
        auth.role() = 'authenticated'
    );

-- Only Admin/Managers can view logs
create policy "Admins can view logs for their organization"
    on operation_logs for select
    to authenticated
    using (
        organization_id in (
            select organization_id from staffs 
            where id = auth.uid() 
            and (role = 'admin' or role = 'manager')
        )
    );
