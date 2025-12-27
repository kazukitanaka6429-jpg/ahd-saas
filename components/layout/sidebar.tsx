'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Building2,
    Users,
    UserCircle,
    FileSpreadsheet,
    BarChart3,
    LogOut,
    Stethoscope
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const sidebarItems = [
    {
        title: 'ダッシュボード',
        href: '/',
        icon: LayoutDashboard,
    },
    {
        title: '施設管理',
        href: '/facilities',
        icon: Building2,
    },
    {
        title: '職員管理',
        href: '/staffs',
        icon: Users,
    },
    {
        title: '利用者管理',
        href: '/residents',
        icon: UserCircle,
    },
    {
        title: '業務日誌',
        href: '/daily-reports',
        icon: FileSpreadsheet,
    },
    {
        title: '分析',
        href: '/analysis',
        icon: BarChart3,
    },
    {
        title: '医療連携IV',
        href: '/medical-cooperation',
        icon: Stethoscope,
    },
]

// Role definitions (duplicated from auth-helpers to avoid server import in client)
const ROLES = {
    HQ: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
} as const

export function Sidebar({ role }: { role?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const filteredItems = sidebarItems.filter(item => {
        // Staff cannot access management pages
        if (role === ROLES.STAFF) {
            return !['/facilities', '/staffs', '/residents', '/analysis', '/medical-cooperation'].includes(item.href)
        }
        // Manager cannot access facilities master (assuming only HQ manages facilities creation?)
        // OR adhering to user request "Manager can use all functions of their facility"
        // If Manager can edit their facility settings, maybe they need access but constrained.
        // For now, let's say Manager can see everything except maybe '/facilities' list if it shows ALL facilities.
        // User said: "Manager: All users/staffs of THEIR facility".
        // Usually Facility Master is for HQ. Let's hide Facilities for Manager too, or make it Read-Only.
        // User said "General: functions other than Master". So Facilities/Staffs/Residents are hidden.

        // Strict interpretation of User Request:
        // HQ: All
        // Manager: All functions for their facility (Residents, Staffs). What about Facility Master? Usually no.
        // Let's hide '/facilities' for Manager too, unless they edit their own facility info.

        if (role === ROLES.MANAGER) {
            // Manager can see Residents and Staffs. Maybe not 'Facilities' collection?
            // Let's keep it simple: Manager can see Residents, Staffs.
            // Hide 'Facilities' (global list) for Manager?
            return item.href !== '/facilities'
        }

        return true
    })

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-gray-50/40 px-4 py-8">
            <div className="mb-8 flex items-center px-2">
                <h1 className="text-xl font-bold tracking-tight text-primary">
                    Care SaaS
                </h1>
                <div className="ml-2 text-xs text-gray-400 border rounded px-1">
                    {role === 'admin' ? '本社' : role === 'manager' ? '管理者' : '一般'}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-2">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.title}
                        </Link>
                    )
                })}
            </div>
            <div className="mt-auto border-t pt-4">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-gray-500 hover:text-red-600"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    ログアウト
                </Button>
            </div>
        </div>
    )
}
