'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Staff } from '@/types'

// Get current authenticated staff
// Logic:
// 1. Check Auth User
// 2. Check 'active_staff_id' cookie -> Return if valid
// 3. Find associated staffs -> Return specific one if single, or Admin Context if applicable
// 4. Return null if no context determined (Caller handles redirect)
export async function getCurrentStaff(): Promise<Staff | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const cookieStore = await cookies()
    const activeStaffId = cookieStore.get('active_staff_id')?.value

    // Try Cookie First
    if (activeStaffId) {
        const { data: staff } = await supabase
            .from('staffs')
            .select('*')
            .eq('id', activeStaffId)
            .eq('auth_user_id', user.id)
            .single()

        if (staff) return staff as unknown as Staff
        // If cookie invalid, fall through
    }

    // Discovery Mode
    const { data: staffs } = await supabase
        .from('staffs')
        .select('*')
        .eq('auth_user_id', user.id)

    if (!staffs || staffs.length === 0) return null

    // If only one affiliation, use it
    if (staffs.length === 1) {
        const staff = staffs[0] as unknown as Staff
        // Auto-set cookie for performance next time
        // Note: Can't set cookie in Server Component render pass easily without Server Action context, 
        // but this function is often called in Server Components. 
        // We rely on 'switchFacility' for explicit switches, but imply implicit context here.
        return staff
    }

    // Prioritize HQ Admin (Global Context) if exists
    // Admin user has facility_id = null usually, or specific facility.
    // If they have a "Global Admin" record (facility_id is null), use that.
    const adminStaff = staffs.find(s => s.role === 'admin' && s.facility_id === null)
    if (adminStaff) return adminStaff as unknown as Staff

    // Ambiguous state (Multi-facility Manager/Staff without cookie)
    // Return null to trigger selector
    return null
}

export async function switchFacility(staffId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Verify ownership
    const { data: staff } = await supabase
        .from('staffs')
        .select('id')
        .eq('id', staffId)
        .eq('auth_user_id', user.id)
        .single()

    if (!staff) {
        throw new Error('Unauthorized')
    }

    const cookieStore = await cookies()
    cookieStore.set('active_staff_id', staffId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    redirect('/')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await cookies()
    cookieStore.delete('active_staff_id')

    redirect('/login')
}

export async function getStaffIdentities() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Join facilities to show name
    const { data: staffs } = await supabase
        .from('staffs')
        .select(`
            id, role, facility_id, organization_id, name,
            facilities ( name )
        `)
        .eq('auth_user_id', user.id)

    return staffs || []
}
