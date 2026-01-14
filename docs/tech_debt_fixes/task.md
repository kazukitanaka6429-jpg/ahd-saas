# Technical Debt & Security Fixes

- [x] **Task 1: Security - Remove console.log**
    - [x] Scan `app/actions/**/*.ts` for `console.log`
    - [x] Remove logs or replace with `logger.error` where appropriate
    - [x] Verify `app/actions/medical-cooperation.ts` specifically

- [x] **Task 2: Type Safety - HQ Daily Data**
    - [x] Refactor `app/actions/hq/get-hq-daily-data.ts`
    - [x] Replace `supabase: any` with typed client
    - [x] Define/Import types for `DailyRecord`, `DailyShift`, etc.
    - [x] Remove `any` from map/filter/reduce operations

- [x] **Task 3: DRY - Auth Logic**
    - [x] Analyze `app/actions/auth.ts` and `lib/auth-helpers.ts`
    - [x] Consolidate `getCurrentStaff` logic into `lib/auth-helpers.ts`
    - [x] Update `app/actions/auth.ts` to re-export or use the consolidated logic
    - [x] Verify consumers of `getCurrentStaff`
