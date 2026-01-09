# Auth Error Fix Plan

## Goal
Fix the `[getCurrentStaff] DB Error` and ensure `getCurrentStaff` returns the correct staff record without database errors.

## Problem
The `getCurrentStaff` function in `lib/auth-helpers.ts` is encountering a database error. The logs show an empty error object `{}`, but it is likely an RLS (Row Level Security) issue, specifically infinite recursion in the `staffs` table policies.

## Proposed Changes

### 1. Improve Logging in `lib/auth-helpers.ts`
- Update `getCurrentStaff` to log the full error object using `JSON.stringify` and `console.dir`.
- Log the `user.id` to verify authentication context.
- This will help confirm if the error is indeed "infinite recursion" or something else.

### 2. Fix RLS Recursion (Supabase Migration)
- Create a new migration file `supabase/migrations/20260107090000_fix_rls_recursion_robust.sql`.
- **Strategy**:
    - Drop existing problematic policies on `staffs`.
    - Ensure the helper function `get_my_org_id` is defined as `SECURITY DEFINER` and explicitly grant usage.
    - **Crucial Step**: To avoid recursion loop even with `SECURITY DEFINER` (in case of ownership issues), we can optimize the policies.
    - However, `SECURITY DEFINER` is the standard way. I will ensure it is defined correctly.
    - I will also try to use a different approach for the "Self Read" policy to ensure it isolates from "Org Read" if possible, but Postgres evaluates all.
    - **Backups**: If `SECURITY DEFINER` fails, I will add a special bypass for the function logic if possible, but that's hard in SQL.
    - **Alternative**: I will GRANT `service_role` checks? No, this is for authenticated users.

    **Plan for Migration**:
    ```sql
    -- Drop policies to start clean
    DROP POLICY IF EXISTS "Staff Read" ON public.staffs;
    DROP POLICY IF EXISTS "Staff Self Read" ON public.staffs;
    DROP POLICY IF EXISTS "Staff Org Read" ON public.staffs;

    -- 1. Self Read (Simple, check ID)
    CREATE POLICY "Staff Self Read" ON public.staffs
        FOR SELECT
        USING (auth_user_id = auth.uid());

    -- 2. Helper Function (SECURITY DEFINER is key)
    CREATE OR REPLACE FUNCTION public.get_my_org_id()
    RETURNS UUID AS $$
    BEGIN
        -- This query runs with privileges of the function owner (postgres)
        -- Postgres user bypasses RLS, so this SELECT does NOT trigger policies.
        RETURN (
            SELECT organization_id 
            FROM public.staffs 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

    -- 3. Org Read (Uses helper)
    CREATE POLICY "Staff Org Read" ON public.staffs
        FOR SELECT
        USING (organization_id = get_my_org_id());
    ```
    This looks identical to the previous attempt. I will try to apply it again, maybe the previous one wasn't applied or failed silently.
    
    **Refined Fix**:
    I will also add a condition to `Staff Org Read` to *not* execute if `auth_user_id = auth.uid()`.
    ```sql
    USING (
      -- If it's me, Self Read covers it. 
      -- But we can't easily "skip" this check. 
      -- However, we can optimize? No.
      organization_id = get_my_org_id()
    )
    ```
    
    I will also verify if `staffs` has `auth_user_id` column indexed? It should be.

### 3. Verification
- Manual verification: The user should check if the error is gone.
- Check logs: If error persists, the new logs will show WHY.

## Verification Plan

### Manual Verification
1.  User opens the `Medical V` page.
2.  Observed behaviour: No console error. Data loads correctly.
3.  If error persists, check server console logs for `[getCurrentStaff] DB Error Full`.
