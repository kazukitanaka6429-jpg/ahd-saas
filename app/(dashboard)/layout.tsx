import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

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

    // Fetch staff info for sidebar
    // If we have an active staff ID in cookie, try to fetch that one
    let currentStaff = null

    if (activeStaffId) {
        const { data } = await supabase
            .from('staffs')
            .select(`
                role,
                facilities (
                    name
                )
            `)
            .eq('id', activeStaffId)
            .eq('auth_user_id', user.id) // Ensure ownership
            .single()
        currentStaff = data
    }

    // Fallback: if no cookie or cookie invalid (returned null), get the default one
    if (!currentStaff) {
        const { data } = await supabase
            .from('staffs')
            .select(`
                role,
                facilities (
                    name
                )
            `)
            .eq('auth_user_id', user.id)
            .single()
        currentStaff = data
    }

    // Check if multiple accounts exist
    const { count } = await supabase
        .from('staffs')
        .select('id', { count: 'exact', head: true })
        .eq('auth_user_id', user.id)

    const hasMultiple = (count || 0) > 1

    return (
        <div className="flex min-h-screen flex-row">
            <Sidebar
                role={currentStaff?.role}
                facilityName={(currentStaff?.facilities as any)?.name}
                hasMultipleAccounts={hasMultiple}
            />
            <main className="flex-1 overflow-y-auto bg-white p-8">
                {children}
            </main>
        </div>
    )
}
