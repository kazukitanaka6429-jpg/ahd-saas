# Notifications Feature Task List

## Overview
Implement notification system to enhance communication between staff and HQ.
Features include realtime popups, a centralized notification center, and database logging of notifications.
This covers "Phase 2: Notification Functionality".

## Tasks

### 1. Database Schema
- [x] Create `notifications` table (`supabase/migrations/...`)
    - [x] `id`, `facility_id`, `title`, `content`, `type`, `created_at`
    - [x] `read_status` (per user tracking might be complex, maybe start simple)
        - *Decision*: Are notifications per user or per facility? -> Usually per facility for broadcast, per user for specific.
        - *Plan*: Create `notifications` and `notification_reads` (for read status).

### 2. Backend & Server Actions
- [x] Create `createNotification` action
    - [x] Insert into DB
    - [x] Trigger Supabase Realtime broadcast (optional, or rely on DB change subscription)
- [x] Create `markAsRead` action
- [x] Create `getNotifications` action (as `getMyNotifications` in `system-notifications.ts`)

### 3. Frontend Components
- [x] `NotificationBell` (Header Icon with badge)
    - [x] Shows count of unread notifications
- [x] `NotificationPopover` (Dropdown list)
    - [x] Realtime subscription to `notifications` table
    - [x] List recent notifications
    - [x] Mark as read functionality
- [x] `NotificationToast` (Realtime Popup)
    - [x] Show toast when new notification arrives (Integrated in Bell)

### 4. Integration
- [x] Add `NotificationBell` to `Header` or `Sidebar` (Added to Header)
- [x] Hook up Realtime listeners

### 5. UI/UX Refinement
- [x] Fine-tune Logo and Bell Icon sizes (Header) (Completed during mock phase)
- [x] Verify realtime behavior (Verified with user 2026-01-24)
