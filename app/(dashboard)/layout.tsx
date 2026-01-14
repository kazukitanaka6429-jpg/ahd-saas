import { Sidebar } from '@/components/layout/sidebar'
import { FacilityProvider } from '@/components/providers/facility-context'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { StaffWithFacility } from '@/types'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const cookieStore = await cookies()
    const activeStaffId = cookieStore.get('active_staff_id')?.value

    // Fetch staff info for sidebar/context
    // Logic updated for SaaS:
    // 1. Try to find "Organization Admin" staff first (role=admin, facility_id=null)
    // 2. Fallback to facility-bound staff

    // First, get ALL staffs for this user to make the decision
    const { data: allStaffs } = await supabase
        .from('staffs')
        .select(`
            *,
            facilities (
                name
            )
        `)
        .eq('auth_user_id', user.id)

    if (!allStaffs || allStaffs.length === 0) {
        // Handle no staff case (e.g. redirect to contact support or claim invite)
        // For now let it render, components might handle null
    }

    // Determine "Initial Staff" context
    // Priority 1: The one defined in cookie (if valid)
    // Priority 2: Admin Staff (Global)
    // Priority 3: First available staff

    let initialStaff = null

    if (activeStaffId) {
        initialStaff = allStaffs?.find(s => s.id === activeStaffId)
    }

    if (!initialStaff) {
        // Try to find Global Admin
        initialStaff = allStaffs?.find(s => s.role === 'admin' && s.facility_id === null)
    }

    if (!initialStaff && allStaffs && allStaffs.length > 0) {
        initialStaff = allStaffs[0]
    }

    const selectedFacilityId = cookieStore.get('selected_facility_id')?.value

    return (
        <FacilityProvider initialStaff={initialStaff as StaffWithFacility} initialFacilityId={selectedFacilityId}>
            <div className="flex h-screen overflow-hidden flex-row">
                <Sidebar
                    role={initialStaff?.role}
                    // Facility Name handling is now dynamic within Sidebar via Switcher, but passing initial prop as fallback
                    facilityName={(initialStaff as StaffWithFacility)?.facilities?.name}
                    hasMultipleAccounts={false} // Deprecated/Handled by Switcher now
                />
                <main className="flex-1 overflow-y-auto bg-background p-8">
                    {children}
                </main>
            </div>
        </FacilityProvider>
    )
}
