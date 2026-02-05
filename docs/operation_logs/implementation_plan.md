# Operation Logs Implementation Plan

## Goal Description
Implement a robust operation logging system to record "Who, When, What" for audit and security purposes. This is a critical component for Phase 1 (Robustness) and Phase 3 (Audit Compliance).

## User Review Required
> [!IMPORTANT]
> **Database Migration Required**: Existing `operation_logs` table needs modification.
> - `target_resident_id` will become NULLABLE.
> - `target_date` will become NULLABLE.
> - `facility_id` will be ADDED (NOT NULL). All existing logs (if any) need a default facility_id or strategy to handle migration. (Assuming currently empty or disposable data).

## Proposed Changes

### Database Layer
#### [MODIFY] `supabase/migrations/20250101000012_operation_logs.sql`
- Alter table `operation_logs`:
  - `target_resident_id`: `uuid NOT NULL` -> `uuid NULL`
  - `target_date`: `date NOT NULL` -> `date NULL`
  - Add `facility_id`: `uuid NOT NULL references facilities(id)`
  - Add `ip_address`: `inet` (optional)
  - Add `user_agent`: `text` (optional)

### Backend Layer (Server Actions)
#### [NEW] `app/actions/log/operation-logger.ts`
- Functions:
  - `logOperation(params: LogParams)`: Writes to DB.
  - `getOperationLogs(filters: LogFilters)`: Reads from DB with pagination and filters.

### Frontend Layer
#### [NEW] `app/(dashboard)/operation-logs/page.tsx`
- Main page for viewing logs.
- Uses a new `OperationLogTable` component.

#### [NEW] `components/features/operation-logs/operation-log-table.tsx`
- Client component.
- Display columns: Timestamp, Staff Name, Action Type, Target (Resident/System), Details.
- Filters: Date Range, Staff, Action Type.

#### [NEW] `components/features/operation-logs/log-filters.tsx`
- Filter controls.

## Verification Plan

### Automated Tests
- None planned for now (manual verification preferred by user style).

### Manual Verification
1. **Schema Check**: Apply migration and verify table structure.
2. **Logging**: Perform various actions (Login, Edit Resident, etc.) and verify simplified/generic logs are created.
3. **Viewing**: Open `/operation-logs` and check if logs appear.
4. **Filtering**: Test filtering by date and staff.
5. **Multi-tenant**: Ensure logs from Facility A are not visible to Facility B (if applicable, or Org Admin sees all).
