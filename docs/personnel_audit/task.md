# Personnel Audit (人員配置表) Logic Implementation Task List

## Phase 0: UI Prototype (User Request) - COMPLETE
- [x] **Build UI Prototype** <!-- id: p0 -->
    - [x] Create `app/(dashboard)/audit/personnel/page.tsx` with dummy data
    - [x] Implement `TimelineChart` component (Visual check)
    - [x] Implement `ManualWorkDialog` (Behavior check: Auto-fill logic)
    - [x] Implement `ManualDeductionDialog`
    - [x] Implement `CsvImportDialog`

## Phase 1: Data Infrastructure & Schema Design (IN PROGRESS)
- [x] **Define Database Schema** <!-- id: 0 -->
    - [x] Design Tables (in Implementation Plan)
    - [x] M-1: Create `attendance_records` table
    - [x] M-2: Create `spot_job_records` table
    - [x] M-3: Create `visiting_nursing_records` table
    - [x] M-4: Create `manual_work_records` table
    - [x] M-5: Create `manual_deductions` table
    - [x] Apply RLS Policies

## Phase 2: Data Ingest (CSV Imports)
- [x] **Implement CSV Parsers** <!-- id: 2 -->
    - [x] Attendance Records CSV Parser
    - [x] Spot Job Records CSV Parser
    - [x] Visiting Nursing Records CSV Parser
- [x] **Create Upload Actions** <!-- id: 3 -->
    - [x] Server Action: `importAttendanceRecords`
    - [x] Server Action: `importSpotJobRecords`
    - [x] Server Action: `importVisitingNursingRecords`

## Phase 3: Core Logic Implementation (The "Engine")
- [x] **Time Calculation Service** <!-- id: 5 -->
    - [x] Implement `fetchDailyStaffData(date, facilityId)`
    - [x] Implement `fetchDeductionData(date, facilityId)`
    - [x] Implement `calculateNetWorkTime` (The Subtraction Logic)
- [x] **Audit Validator** <!-- id: 6 -->
    - [x] Implement `validatePersonnelAllocation` (Checks 0-5, 5-22, 22-24)

## Phase 4: User Interface (Real Implementation)
- [x] **Add Sidebar Menu** <!-- id: 7.5 -->
    - [x] Add "Personnel Allocation Check" link to Sidebar
- [x] **Connect UI to DB** <!-- id: 7 -->
    - [x] Connect `PersonnelAuditPage` to `calculateDailyPersonnel` data
    - [x] Implement `ManualWorkDialog` save action
    - [x] Implement `ManualDeductionDialog` save action
