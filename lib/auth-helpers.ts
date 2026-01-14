import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Staff } from '@/types'
import { cookies } from 'next/headers'

// Role definitions
export const ROLES = {
    HQ: 'admin',      // 本社: 全権限
    MANAGER: 'manager', // 管理者: 自施設全権限
    STAFF: 'staff'    // 一般: 自施設の一部権限（マスタ以外）
} as const

type Role = typeof ROLES[keyof typeof ROLES]

export async function getCurrentStaff(shouldRedirect: boolean = true) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        if (shouldRedirect) redirect('/login')
        return null
    }

    const cookieStore = await cookies()
    const activeStaffId = cookieStore.get('active_staff_id')?.value

    // If cookie exists, try to fetch that specific staff record
    if (activeStaffId) {
        const { data: staff } = await supabase
            .from('staffs')
            .select('*')
            .eq('id', activeStaffId)
            .eq('auth_user_id', user.id)
            .single()

        if (staff) {
            return staff as Staff
        }
        // If cookie was invalid/stale (e.g. staff deleted), fall through to discovery logic
    }

    // Find all staff records linked to this auth user
    const { data: staffs, error } = await supabase
        .from('staffs')
        .select('*')
        .eq('auth_user_id', user.id)

    if (error) {
        console.error('[getCurrentStaff] DB Error:', error)
        return null
    }

    if (!staffs || staffs.length === 0) {
        return null
    }

    if (staffs.length === 1) {
        // Auto-set cookie context implicitly by returning it
        return staffs[0] as Staff
    }

    // Multiple records found.
    // Optimization for SaaS: If one of them is the Organization Admin (facility_id is null, role is admin),
    // prioritize returning that one implicitly unless a cookie overrides it.
    const adminStaff = staffs.find(s => s.role === 'admin' && s.facility_id === null)
    if (adminStaff) {
        return adminStaff as Staff
    }

    // If no clear admin, and multiple specific facilities, redirect to select
    if (shouldRedirect) redirect('/select-facility')
    return null
}

export async function requireAuth() {
    const staff = await getCurrentStaff()
    if (!staff) {
        // If null is returned (and not redirected inside), it means no staff record found.
        // We might want to show a "Contact Admin" page or "Join" page.
        // For now, redirect to login or show error?
        // Existing logic returned null, callers usually handle it or crash.
        // Let's stick to existing behavior for "no staff": return null.
        return null
    }
    return staff
}

// Helper to get ALL staff identities for the current user (for switching UI)
export async function getMyStaffIdentities() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: staffs } = await supabase
        .from('staffs')
        .select(`
            *,
            facilities (
                name
            )
        `)
        .eq('auth_user_id', user.id)

    return staffs || []
}

// Helper to check permissions
export function canAccessMaster(role: string) {
    return role === ROLES.HQ || role === ROLES.MANAGER
}

export function isHQ(role: string) {
    return role === ROLES.HQ
}
