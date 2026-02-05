# HQ Comment Notifications Walkthrough

## Completed Changes

### Backend Logic Update
- **File**: `app/actions/findings.ts`
- **Function**: `addFindingComment`
- **Changes**:
    1.  **Facility Resolution**: Added explicit logic to resolve `facility_id` for all record types (`daily`, `medical`, `short_stay`, `medical_v`, `resident`). This ensures that even for Medical V records (where triggers might not auto-populate it), the `facility_id` is correctly recorded.
    2.  **Notification Trigger**: Added a check for `staff.role === 'admin'`. If an Admin user adds a comment, a system notification is automatically created via `createSystemNotification`.
    3.  **Payload Enhancement**: The `facility_id` is now included in the `finding_comments` insert payload, preventing NULL values and ensuring correct RLS visibility.

## Verification
- **Logic Verified**:
    - Confirmed `facility_id` table lookups for all types.
    - Confirmed `createSystemNotification` usage with dynamic import.
    - Confirmed `admin` role check.

## Next Steps
- Staff users should verify they receive notifications when HQ (Admin) adds comments.
