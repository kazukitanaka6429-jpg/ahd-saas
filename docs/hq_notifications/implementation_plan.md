# HQ Comment Notifications Implementation Plan

## Goal Description
Implement automatic notifications when HQ staff (Admin role) creates a "Finding" (指摘) on a record. This ensures facility staff are immediately aware of new instructions or corrections.

## User Review Required
No major breaking changes. Notification logic is purely additive.

## Proposed Changes

### Backend (`app/actions/findings.ts`)
#### [MODIFY] `addFindingComment`
- **Logic Change**:
    1.  Check `staff.role`. If `admin` (or `ROLES.HQ`):
    2.  Retrieve the `facility_id` associated with the target record.
        *   For `daily`: Fetch `daily_records.facility_id`.
        *   For `medical`: Fetch `medical_cooperation_records.facility_id`.
        *   For `short_stay`: Fetch `short_stay_records.facility_id`.
        *   For `resident`: Fetch `residents.facility_id`.
    3.  Call `createSystemNotification`:
        *   Title: "本部から指摘がありました"
        *   Content: `content` (truncated to ~50 chars)
        *   Target: `facility_id`
        *   Type: `warning` (or `info`)

## Verification Plan
### Manual Verification
1.  **Setup**:
    *   Log in as an Admin user (HQ).
    *   Log in as a Staff user (Target Facility) in a separate browser/session.
2.  **Action**:
    *   Admin: Go to `/hq/daily` (HQ Matrix).
    *   Admin: Right-click a resident and add a comment via `FindingSheet`.
3.  **Result**:
    *   Staff: Observe "本部から指摘がありました" notification in the bell icon.
    *   Staff: Click notification, check it marks as read.
