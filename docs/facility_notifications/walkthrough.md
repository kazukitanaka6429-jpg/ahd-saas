# Facility to HQ Notifications Walkthrough

## Completed Changes

### Backend Logic Update
- **File**: `app/actions/system-notifications.ts`
    - **New Function**: `notifyOrganizationAdmins`
    - **Logic**: Fetches all admins of the given organization and creates notifications for them individually (bypassing facility scoped views).

- **File**: `app/actions/findings.ts`
    - **Function**: `addFindingComment`
        - **Logic**: If a non-admin staff adds a comment, `notifyOrganizationAdmins` is called with the message "施設から回答がありました".
    - **Function**: `toggleFindingResolved`
        - **Logic**: If a non-admin staff resolves a finding, `notifyOrganizationAdmins` is called with the message "指摘が解決済みになりました".

## Verification Criteria
Staff users should verify the following:
1.  **Replying to a Finding**:
    -   Log in as a Facility Staff.
    -   Reply to a "Finding" (指摘).
    -   Confirm that organization Admins receive a notification.
2.  **Resolving a Finding**:
    -   Log in as a Facility Staff.
    -   Mark a "Finding" as resolved.
    -   Confirm that organization Admins receive a notification.

## Note
Notifications use the `notifications` table but target specific `user_id`s for admins, ensuring they see these alerts regardless of their currently selected facility filter.
