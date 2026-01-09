-- Fix RLS Recursion and Permissions
-- The previous 'Staff Read' policy caused recursion because it called a function that queried the table itself.
-- Even with SECURITY DEFINER, we should be careful.

DO $$
BEGIN
    -- Drop potentially problematic policies
    DROP POLICY IF EXISTS "Staff Read" ON public.staffs;
    DROP POLICY IF EXISTS "Staff Self Read" ON public.staffs;
    DROP POLICY IF EXISTS "Staff Org Read" ON public.staffs;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 1. Create a "Self Read" policy that is strictly non-recursive
-- This ensures that 'getCurrentStaff' (which queries by auth_user_id) always succeeds without calling functions.
CREATE POLICY "Staff Self Read" ON public.staffs
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- 2. Re-define the helper function to be robust
-- Ensure search_path is trusted to avoid hijacking
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM public.staffs 
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Create "Org Read" policy for seeing colleagues
-- This might still recurse if not handled well, but since "Self Read" exists, 
-- queries for own record *should* pass via Self Read?
-- Actually, Postgres checks all policies. 
-- To prevent recursion here, the function is SECURITY DEFINER.
-- NOTE: If this still errors, we might need to rely only on Self Read for the context of 'getCurrentStaff'.
-- But we need Org Read for the UI to list staff.
CREATE POLICY "Staff Org Read" ON public.staffs
    FOR SELECT
    USING (organization_id = get_my_org_id());

NOTIFY pgrst, 'reload schema';
