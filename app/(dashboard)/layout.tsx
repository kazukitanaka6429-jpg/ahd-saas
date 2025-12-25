import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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

    // Fetch staff info for sidebar
    const { data: staff } = await supabase
        .from('staffs')
        .select('role') // only need role
        .eq('auth_user_id', user.id)
        .single()

    return (
        <div className="flex min-h-screen flex-row">
            <Sidebar role={staff?.role} />
            <main className="flex-1 overflow-y-auto bg-white p-8">
                {children}
            </main>
        </div>
    )
}
