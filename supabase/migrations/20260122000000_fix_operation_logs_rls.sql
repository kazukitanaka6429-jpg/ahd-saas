-- Fix operation_logs RLS policy
-- The issue: auth.uid() is Supabase Auth user ID, but we were comparing it with staffs.id
-- Need to compare with staffs.auth_user_id instead

-- Drop existing policies
drop policy if exists "Authenticated users can insert logs" on operation_logs;
drop policy if exists "Admins can view logs for their organization" on operation_logs;

-- Recreate INSERT policy (allow all authenticated users to insert)
create policy "Authenticated users can insert logs"
    on operation_logs for insert
    to authenticated
    with check (
        auth.role() = 'authenticated'
    );

-- Recreate SELECT policy (only admin can view, using auth_user_id)
create policy "Admins can view logs for their organization"
    on operation_logs for select
    to authenticated
    using (
        organization_id in (
            select organization_id from staffs 
            where auth_user_id = auth.uid()
            and role = 'admin'
        )
    );
