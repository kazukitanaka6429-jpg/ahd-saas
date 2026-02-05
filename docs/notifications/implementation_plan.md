# Notifications Feature Implementation Plan

## Goal Description
Build a notification system to alert staff of important events (e.g., HQ feedback, system alerts) in real-time.

## User Review Required
> [!NOTE]
> **Notification Type**:
> - **Broadcast**: Sent to a whole facility (e.g., "Inspection tomorrow").
> - **Unicast**: Sent to specific user (optional for now, but DB will support it).
>
> **Read Status Strategy**:
> Tracking "Read" status for *Broadcast* notifications is tricky (need to track who read what).
> **Initial Approach**: We will create a `notification_reads` table to track who has read which notification.

## Proposed Changes

### Database Layer
#### [NEW] `supabase/migrations/20260124000000_notifications.sql`
- Table: `notifications`
  - `id` (uuid)
  - `facility_id` (uuid, nullable) -> If null, global system announcement? or organization wide?
  - `user_id` (uuid, nullable) -> If set, specific to user.
  - `title` (text)
  - `content` (text)
  - `type` (text: 'info', 'warning', 'urgent')
  - `created_at`
- Table: `notification_reads`
  - `notification_id`
  - `user_id`
  - `read_at`

### Backend Layer
#### [NEW] `app/actions/notifications.ts`
- `fetchMyNotifications()`: Get unread + recent read notifications.
- `markAsRead(notificationId)`: Insert into `notification_reads`.

### Frontend Layer
#### [NEW] `components/features/notifications/notification-bell.tsx`
- Icon in the header.
- Subscribes to `supabase.channel('public:notifications')`.
- On `INSERT` event:
  - Check if notification belongs to my facility/user.
  - If yes, increment badge count and `toast()`.

#### [NEW] `components/features/notifications/notification-list.tsx`
- Dropdown content showing list.

### Integration
#### [MODIFY] `components/layout/sidebar.tsx` (or Header)
- Add `<NotificationBell />`.

## Verification Plan

### Manual Verification
1.  **DB Insert**: Manually insert a record into `notifications` table via SQL Editor.
2.  **Realtime**: Verified that the bell icon badge increments instantly without refresh.
3.  **Toaster**: Verify a popup toast appears.
4.  **Read**: Open the list, click a notification, verify badge count decreases.
