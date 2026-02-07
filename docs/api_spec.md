# API Specification (Server Actions)

This document outlines the key Server Actions available in the application for external integrations or frontend usage.

## 1. Residents

### `importResidents(formData: FormData)`
Imports residents from a CSV file.
- **Path**: `app/actions/import-resident.ts`
- **Authentication**: Admin or Manager only.
- **Input**:
  - `file`: CSV file (Shift-JIS encoded)
  - `facility_id`: Target facility ID
- **Output**:
  - `success`: boolean
  - `data`: Import stats
  - `error`: Error message

### `getResidents(facilityId?: string)`
Fetches list of residents.
- **Path**: `app/actions/resident.ts`
- **Output**: Array of `Resident` objects.

## 2. Staffs

### `importStaffs(formData: FormData)`
Imports staffs from a CSV file.
- **Path**: `app/actions/import-staff.ts`
- **Authentication**: Admin only.
- **Input**:
  - `file`: CSV file
- **Output**: Import stats.

## 3. Medical Coordination

### `upsertMedicalRecord(data: MedicalRecord)` (IV)
Creates or updates a Medical IV record.
- **Path**: `app/actions/medical-coordination.ts`
- **Effect**: Updates `medical_coord_iv_records` table.

### `toggleMedicalVRecord(date, residentId, isExecuted)` (V)
Toggles the execution status for Medical V.
- **Path**: `app/actions/medical-v/upsert-medical-v.ts`
- **Note**: "Nurse Count" is derived from IV records and not manually stored.

## 4. Audit & Logs

### `getOperationLogs(params)`
Retrieves system operation logs.
- **Path**: `app/actions/admin/get-operation-logs.ts`
- **Input**: `limit`, `offset`, `filters`
- **Output**: List of logs including `READ` events.
