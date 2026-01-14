# Implementation Plan - Technical Debt & Security Fixes

## Goal
Resolve high-priority technical debt and security risks identified in the technical audit.
1. **Security**: Remove `console.log` from server actions.
2. **Type Safety**: Refactor `get-hq-daily-data.ts` to remove `any`.
3. **DRY**: Unify authentication logic between `lib/auth-helpers.ts` and `app/actions/auth.ts`.

## User Review Required
- **Breaking Change**: `getCurrentStaff` in `app/actions/auth.ts` will be refactored to use `lib/auth-helpers.ts`. Behavior regarding redirects vs returning null needs to be consistent.
    - **Decision**: `lib/auth-helpers.ts`'s `getCurrentStaff` currently redirects. I will add an option `shouldRedirect: boolean = true` or create a `getSafeCurrentStaff` that returns null, to support the existing pattern in `actions/auth.ts` which returns null.
    - **Update**: I will consolidate logic into `lib/auth-helpers.ts`.

## Proposed Changes

### 1. Security: Remove console.log
Target: `app/actions/**/*.ts`
- Scan and remove all `console.log`, `console.error` (replace with `logger.error`).
- **Priority Target**: `app/actions/medical-cooperation.ts` (Payload logging).

### 2. Type Safety: HQ Daily Data
Target: `app/actions/hq/get-hq-daily-data.ts`
- Remove `supabase: any` parameter. Instantiate `supabase` inside or strict type it.
- Use `SupabaseClient<Database>` context.
- Remove `any` assertions in:
    - `dailyShifts` map
    - `qualifications` map
    - `facilityStaffs` map
    - `medicalRecords` processing
    - `records` filtering
    - `csvImports` filtering
- Define explicit interfaces if missing in `types/index.ts`.

### 3. DRY: Auth Logic
Target: `lib/auth-helpers.ts`, `app/actions/auth.ts`
#### [MODIFY] `lib/auth-helpers.ts`
- Update `getCurrentStaff` to handle the "return null instead of redirect" case (optional arg or new function `getCurrentStaffOrNull`).
- Ensure it covers the "Admin Global Context" logic present in `actions/auth.ts`.
#### [MODIFY] `app/actions/auth.ts`
- Replace internal logic of `getCurrentStaff` with call to `lib/auth-helpers.ts`.
- Replace `getStaffIdentities` with `getMyStaffIdentities` from lib.

## Verification Plan

### Automated Tests
- No existing unit tests for these actions.
- Verification will be done via static analysis (type checking) and manual verification.

### Manual Verification
1.  **Security**: Grep for `console.log` in `app/actions`.
2.  **Type Safety**: Run `npx tsc --noEmit` to check for type errors in `get-hq-daily-data.ts`.
3.  **DRY**:
    - Verify "Switch Facility" still works (uses `getStaffIdentities`).
    - Verify accessing pages (Daily Report, etc.) still works (uses `getCurrentStaff`).
