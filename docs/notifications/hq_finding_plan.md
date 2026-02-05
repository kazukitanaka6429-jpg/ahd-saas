# HQ Finding Notifications Implementation Plan

## Goal Description
Implement automatic notifications when HQ staff creates a "Finding" (指摘) on a record. This corresponds to the "1. 本部からの指摘時" requirement.

## User Definition
"本部からの指摘時" (When HQ points something out) is defined as:
**"Use the HQ Check Matrix or similar interface to add a comment (`finding_comments`) to a Daily Record, Medical Record, or Short Stay Record."**

## Proposed Changes

### Backend (`app/actions/findings.ts`)
#### [MODIFY] `addFindingComment`
- Import `createSystemNotification` from `app/actions/system-notifications.ts`.
- Inside `addFindingComment`:
    1. Identify the `facility_id` of the target record (Daily/Medical/ShortStay).
    2. After successfully adding the comment, call `createSystemNotification` to send a notification to that facility.
    3. Notification Content:
        - Title: "本部から指摘がありました"
        - Content: Comment content (truncated?) + Target Resident Name (if available)

## Verification Plan
### Manual Verification
1. Log in as HQ Admin.
2. Open HQ Check Matrix (Daily Reports Check).
3. Add a comment to a resident's record.
4. Log in as a Staff of that facility (or use another browser/session).
5. Verify that a notification "本部から指摘がありました" is received.
