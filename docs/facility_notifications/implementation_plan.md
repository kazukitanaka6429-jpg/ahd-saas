# Facility to HQ Notifications Implementation Plan

## Goal Description
Implement automatic notifications when Facility Staff replies to or resolves a Finding. This ensures HQ is aware of feedback and resolutions.

## User Definition
"2. 施設側からの回答時" involves:
1.  **Commenting**: Non-admin staff adds a comment to a finding.
2.  **Resolving**: Non-admin staff toggles a finding to "Resolved".

## Proposed Changes

### Backend (`app/actions/system-notifications.ts`)
#### [NEW] `notifyOrganizationAdmins`
- Input: `organizationId`, `title`, `content`
- Logic:
    1.  Select all `staffs` where `organization_id = organizationId` AND `role = 'admin'`.
    2.  Extract `auth_user_id`s.
    3.  Insert into `notifications` table for each `user_id`:
        -   `facility_id`: NULL (so it doesn't associate with a specific facility view, but specific user target overrides RLS)
        -   `user_id`: Target Admin's ID
        -   `type`: 'info'

### Backend (`app/actions/findings.ts`)
#### [MODIFY] `addFindingComment`
- Logic Change:
    - If `staff.role !== 'admin'`:
        - Call `notifyOrganizationAdmins`.
        - Title: "施設から回答がありました"
        - Content: "[Facility Name] [Staff Name]: [Comment Truncated]"

#### [MODIFY] `toggleFindingResolved`
- Logic Change:
    - If `staff.role !== 'admin'` AND `newStatus === true` (Resolved):
        - Call `notifyOrganizationAdmins`.
        - Title: "指摘が解決済みになりました"
        - Content: "[Facility Name] [Staff Name]が指摘を解決済みにしました。"

## Verification Plan
1.  **Setup**: Staff user (Facility A) and Admin user (HQ).
2.  **Action 1**: Staff replies to a finding.
    - Check: Admin receives "施設から回答がありました".
3.  **Action 2**: Staff marks finding as resolved.
    - Check: Admin receives "指摘が解決済みになりました".
