import { Sidebar } from '@/components/layout/sidebar'
import { FacilityProvider } from '@/components/providers/facility-context'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { StaffWithFacility } from '@/types'
import { AutoLogoutProvider } from '@/components/providers/auto-logout-provider'

import { Header } from '@/components/layout/header'

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
            <AutoLogoutProvider>
                <div className="flex h-screen w-full flex-col overflow-hidden bg-background print:h-auto print:overflow-visible">
                    <div className="print:hidden">
                        <Header
                            role={initialStaff?.role}
                            facilityName={(initialStaff as StaffWithFacility)?.facilities?.name}
                        />
                    </div>
                    <div className="flex flex-1 overflow-hidden flex-row print:flex-col print:overflow-visible print:h-auto">
                        <div className="hidden md:block h-full print:hidden">
                            <Sidebar
                                role={initialStaff?.role}
                                facilityName={(initialStaff as StaffWithFacility)?.facilities?.name}
                                hasMultipleAccounts={false}
                            />
                        </div>
                        <main className="flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible print:h-auto print:p-0">
                            {children}
                        </main>
                    </div>
                </div>
            </AutoLogoutProvider>
        </FacilityProvider>
    )
}
