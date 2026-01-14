import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { User, SupabaseClient } from '@supabase/supabase-js'

interface AuthGuardResult {
    user: User
    supabase: SupabaseClient
    organization_id?: string
}

/**
 * Protects Server Actions by ensuring the user is authenticated.
 * @param permission Optional permission string to check (future implementation)
 * @returns Object containing user, supabase client, and optionally organization_id
 * @throws Error if unauthenticated
 */
export async function protect(permission?: string): Promise<AuthGuardResult> {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        logger.warn('Unauthorized access attempt in protect()', { error: error?.message })
        throw new Error('Unauthorized: ログインが必要です')
    }

    // Optional: Fetch staff data to get organization_id
    // This adds a DB query overhead, so we only do it if necessary.
    // For now, we will fetch the organization_id from the 'staffs' table.
    // Optimization: Depending on schema, org_id might be in user metadata.

    let organization_id: string | undefined

    const { data: staff, error: staffError } = await supabase
        .from('staffs')
        .select('organization_id')
        .eq('id', user.id) // Assuming auth.uid maps to staffs.id or staffs has user_id
        // NOTE: In this system, it seems staffs linked by some means.
        // If staffs table uses same ID as auth.users, directly query by ID.
        // If not, we need a way to link. Assuming staffs.id IS auth.uid based on typical Supabase setup here.
        .single()

    if (staffError && staffError.code !== 'PGRST116') {
        // PGRST116 is 'not found', which might happen if auth user exists but no staff record (e.g. initial setup)
        logger.error('Failed to fetch staff info in protect()', staffError)
    }

    if (staff) {
        organization_id = staff.organization_id
    }

    return {
        user,
        supabase,
        organization_id
    }
}

/**
 * Require specific role(s) to proceed.
 * @param allowedRoles Array of allowed roles
 * @returns Staff object if authorized
 * @throws Error if unauthorized
 */
export async function requireRole(allowedRoles: string[]) {
    // We can reuse the protect() call to get basic auth, but we need the Role.
    // Let's rely on a helper to get full staff info.
    const { getCurrentStaff } = await import('@/lib/auth-helpers')
    const staff = await getCurrentStaff()

    if (!staff) {
        throw new Error('Unauthorized: 職員情報が見つかりません')
    }

    if (!allowedRoles.includes(staff.role)) {
        logger.warn(`Unauthorized role access: User ${staff.id} (Role: ${staff.role}) attempted to access restricted action.`)
        throw new Error('権限がありません')
    }

    return staff
}
