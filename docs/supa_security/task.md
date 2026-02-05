# Supabase Security & Robustness Fixes

- [x] Fix RLS on `finding_comments`
    - [x] Identify schema and relationships for `finding_comments`
    - [x] Create migration to add `facility_id` and restrict RLS
- [x] Fix `search_path` on functions
    - [x] Identify definitions of `trigger_set_updated_at`, `update_doc_history_updated_at`, `update_daily_records_updated_at`, `get_my_organization_id`
    - [x] Create migration to `ALTER FUNCTION ... SET search_path`
