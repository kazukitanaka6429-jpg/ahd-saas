# Facility to HQ Notifications Task List

- [x] Create implementation plan <!-- id: 0 -->
- [x] Implement `notifyOrganizationAdmins` in `app/actions/system-notifications.ts` <!-- id: 1 -->
    - [x] Fetch all staff with `role = 'admin'` in the same organization
    - [x] Create individual notifications for each admin user
- [x] Implement notification logic in `app/actions/findings.ts` <!-- id: 2 -->
    - [x] `addFindingComment`: If user is NOT admin, notify admins ("Answer from [Facility]")
    - [x] `toggleFindingResolved`: If user is NOT admin and finding is resolved, notify admins ("Resolved by [Facility]")
- [x] Verify implementation <!-- id: 3 -->
    - [x] Reply as Staff -> Admin receives notification
    - [x] Resolve as Staff -> Admin receives notification
