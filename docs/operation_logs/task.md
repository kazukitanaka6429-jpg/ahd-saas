# Operation Logs Implementation Task List

## Overview
Implement a comprehensive operation log system to track user actions ("Who, When, What").
This is part of the "Business Strategy Plan - Phase 1: Robustness & Logs".

## User Preferences
> **Note**: User is intuitive but values logical consistency. Point out any ambiguity or contradictions in instructions.

## Tasks

### 1. Database Schema Update
- [ ] Modify `operation_logs` table to support generic operations (not just resident-specific)
    - [ ] Make `target_resident_id` nullable
    - [ ] Make `target_date` nullable
    - [ ] Add `facility_id` (not null) for multi-tenant filtering
    - [ ] Add `ip_address` and `user_agent` (optional but good for audit)

### 2. Server Actions & Utilities
- [ ] Create/Update `logOperation` server action
    - [ ] Ensure it can handle both resident-related and generic system actions
    - [ ] Helper function to easily log from other actions
- [ ] Create `getOperationLogs` server action with filtering capabilities
    - [ ] Filter by facility
    - [ ] Filter by date range
    - [ ] Filter by staff
    - [ ] Filter by action type

### 3. Frontend Implementation
- [ ] Create Operation Log Page (`/operation-logs`)
    - [ ] Permission check (Admins only?)
    - [ ] Data table design
- [ ] Implement Filtering UI
    - [ ] Date picker
    - [ ] Staff selector
    - [ ] Action type selector
- [ ] Implement CSV Export
    - [ ] Generate CSV from filtered logs

### 4. Integration
- [ ] Integrate logging into critical actions (e.g., login, save record, master update)
