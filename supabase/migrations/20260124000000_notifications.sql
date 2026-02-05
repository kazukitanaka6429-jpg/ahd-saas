-- Create notifications table
create table if not exists public.notifications (
    id uuid not null default gen_random_uuid(),
    facility_id uuid references public.facilities(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,   -- Optional: for direct messaging to a specific user
    title text not null,
    content text,
    type text check (type in ('info', 'warning', 'urgent')) default 'info',
    created_at timestamp with time zone not null default now(),
    
    constraint notifications_pkey primary key (id)
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policy: Users can view notifications for their facility OR notifications sent specifically to them
create policy "Users can view facility notifications"
    on public.notifications for select
    using (
        (facility_id in (
            select facility_id from public.staffs where auth_user_id = auth.uid()
        ))
        or
        (user_id = auth.uid())
        or
        (facility_id is null and user_id is null) -- Global system notifications (optional)
    );

-- Policy: Admins (HQ) can view/create all notifications
-- (Assuming RLS helper or role check, simplifying for now)
create policy "Admins can do everything with notifications"
    on public.notifications for all
    using (
        exists (
            select 1 from public.staffs
            where auth_user_id = auth.uid() and role = 'admin'
        )
    );

-- Create notification_reads table to track read status
create table if not exists public.notification_reads (
    id uuid not null default gen_random_uuid(),
    notification_id uuid not null references public.notifications(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    read_at timestamp with time zone not null default now(),

    constraint notification_reads_pkey primary key (id),
    constraint notification_reads_unique unique (notification_id, user_id)
);

-- Enable RLS
alter table public.notification_reads enable row level security;

-- Policy: Users can insert their own read status
create policy "Users can mark notifications as read"
    on public.notification_reads for insert
    with check (user_id = auth.uid());

-- Policy: Users can view their own read status
create policy "Users can view their own read status"
    on public.notification_reads for select
    using (user_id = auth.uid());

-- Enable Realtime for notifications table
alter publication supabase_realtime add table public.notifications;
