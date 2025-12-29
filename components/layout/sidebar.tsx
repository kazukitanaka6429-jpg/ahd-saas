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
    Stethoscope,
    ClipboardCheck,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const sidebarItems = [
    {
        title: 'ダッシュボード',
        href: '/',
        icon: LayoutDashboard,
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
        title: '医療連携IV',
        href: '/medical-cooperation',
        icon: Stethoscope,
    },
    {
        title: '医療連携Ⅴ',
        href: '/medical-v',
        icon: Stethoscope,
    },
    {
        title: '本社日次確認',
        href: '/hq/daily',
        icon: ClipboardCheck,
    },
    {
        title: '分析',
        href: '/analysis',
        icon: BarChart3,
    },
    {
        title: '施設管理',
        href: '/facilities',
        icon: Building2,
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
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
        const stored = localStorage.getItem('sidebar-storage')
        if (stored) {
            setIsCollapsed(JSON.parse(stored))
        }
    }, [])

    const toggleSidebar = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem('sidebar-storage', JSON.stringify(newState))
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const filteredItems = sidebarItems.filter(item => {
        if (role === ROLES.STAFF) {
            return !['/facilities', '/staffs', '/residents', '/analysis', '/medical-cooperation', '/medical-v', '/hq/daily'].includes(item.href)
        }
        if (role === ROLES.MANAGER) {
            return item.href !== '/facilities'
        }
        return true
    })

    if (!isMounted) {
        return <div className="h-screen w-64 border-r bg-gray-50/40" /> // Prevent hydration mismatch
    }

    return (
        <div
            className={cn(
                "relative flex h-screen flex-col border-r bg-gray-50/40 py-8 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20 px-2" : "w-64 px-4"
            )}
        >
            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-8 z-50 h-6 w-6 rounded-full border bg-white shadow-md hover:bg-gray-100"
                onClick={toggleSidebar}
            >
                {isCollapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
            </Button>

            <div className={cn("mb-8 flex items-center", isCollapsed ? "justify-center px-0" : "px-2")}>
                <h1 className={cn("font-bold tracking-tight text-primary transition-all duration-300", isCollapsed ? "text-xs" : "text-xl")}>
                    {isCollapsed ? "CS" : "Care SaaS"}
                </h1>
                {!isCollapsed && (
                    <div className="ml-2 text-xs text-gray-400 border rounded px-1 whitespace-nowrap">
                        {role === 'admin' ? '本社' : role === 'manager' ? '管理者' : '一般'}
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.title : undefined}
                            className={cn(
                                'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                                isCollapsed ? 'justify-center px-0' : 'px-3'
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                    )
                })}
            </div>

            <div className="mt-auto border-t pt-4">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full gap-3 text-gray-500 hover:text-red-600",
                        isCollapsed ? "justify-center p-0" : "justify-start"
                    )}
                    onClick={handleLogout}
                    title={isCollapsed ? "ログアウト" : undefined}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>ログアウト</span>}
                </Button>
            </div>
        </div>
    )
}
