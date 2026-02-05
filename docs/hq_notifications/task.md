# HQ Comment Notifications Task List

- [x] Create implementation plan <!-- id: 0 -->
- [x] Implement notification logic in `app/actions/findings.ts` <!-- id: 1 -->
    - [ ] Import `createSystemNotification` from `app/actions/system-notifications.ts`
    - [ ] Check if current user is admin
    - [ ] Identify target `facility_id` from record
    - [ ] Call `createSystemNotification` after comment insertion
- [x] Verify implementation <!-- id: 2 -->
    - [x] Add comment as Admin
    - [x] Verify notification receipt as Staff
    - [x] Verify no notification if non-admin adds comment (optional safeguard)
