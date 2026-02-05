# Supabase Security Fixes

## Goal Description
Fix critical security warnings identified by Supabase Linter, specifically permissive RLS on `finding_comments` and mutable `search_path` on security-critical functions.

## Proposed Changes
### Database
#### [NEW] [20260124133000_fix_security_warnings.sql]
- Adds `facility_id` to `finding_comments` to enable robust RLS.
- Backfills `facility_id` from parent records.
- Adds trigger to auto-populate `facility_id` on insert.
- Enforces RLS policies based on `facility_id`.
- Updates functions to set `search_path = ''` to prevent search path hijacking.

## Verification Plan
### Manual Verification
- Apply migration via Supabase Dashboard.
- Verify `finding_comments` access is restricted to facility users.
- Verify functions execute correctly without errors.
