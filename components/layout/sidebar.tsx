'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FacilitySwitcher } from '@/components/common/facility-switcher'
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
    ChevronsRight,
    GraduationCap,
    Settings,
    Database,
    ChevronDown,
    ArrowLeftRight,
    Menu
} from 'lucide-react'
import { CreateNotificationModal } from '@/components/common/CreateNotificationModal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

// メニュー構造の定義
type SidebarItem = {
    title: string;
    href?: string;
    icon: any;
    adminOnly?: boolean;
    children?: SidebarItem[]; // サブメニュー
}

const sidebarItems: SidebarItem[] = [
    {
        title: 'ダッシュボード',
        href: '/',
        icon: LayoutDashboard,
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
    // マスタ管理グループ
    {
        title: 'マスタ',
        icon: Database,
        href: undefined, // グループヘッダーなのでリンクなし
        children: [
            {
                title: '施設マスタ',
                href: '/admin/facilities',
                icon: Building2,
                adminOnly: true,
            },
            {
                title: '資格マスタ',
                href: '/admin/qualifications',
                icon: GraduationCap,
                adminOnly: true,
            },
            {
                title: '職員マスタ', // 名称変更: 職員管理 -> 職員マスタ
                href: '/staffs',
                icon: Users,
            },
            {
                title: '利用者マスタ', // 名称変更: 利用者管理 -> 利用者マスタ
                href: '/residents',
                icon: UserCircle,
            },
        ]
    }
]

// Role definitions
const ROLES = {
    HQ: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
} as const

export function Sidebar({ role, facilityName, hasMultipleAccounts }: { role?: string, facilityName?: string, hasMultipleAccounts?: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    // マスタメニューの開閉状態（デフォルトは開く）
    const [isMasterOpen, setIsMasterOpen] = useState(true)

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

    const handleSwitchFacility = () => {
        router.push('/select-facility')
    }



    // 権限チェック関数 (omitted unchanged parts...)

    if (!isMounted) {
        return <div className="h-screen w-64 border-r bg-gray-50/40" />
    }

    // Reuse hasAccess logic from original file... 
    const hasAccess = (item: SidebarItem) => {
        // Admin only check
        if (item.adminOnly) {
            return role === ROLES.HQ || role === ROLES.MANAGER
        }
        // Staff restrictions
        if (role === ROLES.STAFF && item.href) {
            return !['/staffs', '/residents', '/analysis', '/medical-cooperation', '/medical-v', '/hq/daily', '/admin/facilities', '/admin/qualifications'].includes(item.href)
        }
        return true
    }

    return (
        <div
            className={cn(
                "relative flex h-screen flex-col border-r bg-gray-50/40 py-8 transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20 px-2" : "w-64 px-4"
            )}
        >
            <div className={cn("mb-6 flex flex-col gap-2 transition-all duration-300", isCollapsed ? "items-center px-0" : "px-2")}>
                <div className="flex items-center justify-between w-full mb-2">
                    {/* Toggle Button - Now static position */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-100"
                        onClick={toggleSidebar}
                    >
                        <Menu className="h-5 w-5 text-gray-600" />
                    </Button>
                </div>

                <div className="flex items-center px-2">
                    <h1 className={cn("font-bold tracking-tight text-primary transition-all duration-300", isCollapsed ? "hidden" : "text-xl")}>
                        Care SaaS
                    </h1>
                    {!isCollapsed && (
                        <div className="ml-2 text-xs text-gray-400 border rounded px-1 whitespace-nowrap">
                            {role === 'admin' ? '本社' : role === 'manager' ? '管理者' : '一般'}
                        </div>
                    )}
                </div>

                {!isCollapsed && (
                    <div className="flex items-center justify-between text-sm text-gray-600 bg-white/50 p-2 rounded-md border border-dashed">
                        <div className="w-full">
                            <FacilitySwitcher />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-hidden overflow-y-auto">
                {sidebarItems.map((item, index) => {
                    // アクセス権限がない場合は表示しない
                    if (!hasAccess(item)) return null;

                    // 子要素がある場合（グループ）
                    if (item.children) {
                        // 子要素のうち、アクセス権があるものが1つでもあるか確認
                        const visibleChildren = item.children.filter(child => hasAccess(child));
                        if (visibleChildren.length === 0) return null;

                        // 折りたたみ時はフラットに表示
                        if (isCollapsed) {
                            return visibleChildren.map(child => (
                                <Link
                                    key={child.href}
                                    href={child.href!}
                                    title={child.title}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors justify-center px-0',
                                        pathname === child.href
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                                    )}
                                >
                                    <child.icon className="h-4 w-4 shrink-0" />
                                </Link>
                            ));
                        }

                        return (
                            <Collapsible
                                key={index}
                                open={isMasterOpen}
                                onOpenChange={setIsMasterOpen}
                                className="space-y-1"
                            >
                                <CollapsibleTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-between hover:bg-gray-100 px-3 py-2 h-auto font-normal",
                                            isCollapsed ? "hidden" : "flex"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            <span>{item.title}</span>
                                        </div>
                                        <ChevronDown className={cn("h-4 w-4 transition-transform", isMasterOpen ? "transform rotate-180" : "")} />
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-1 px-2">
                                    {visibleChildren.map(child => (
                                        <Link
                                            key={child.href}
                                            href={child.href!}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg py-2 pl-9 text-sm font-medium transition-colors',
                                                pathname === child.href
                                                    ? 'bg-primary/10 text-primary' // サブメニューのアクティブスタイル
                                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                            )}
                                        >
                                            <child.icon className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{child.title}</span>
                                        </Link>
                                    ))}
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    }

                    // 通常のアイテム
                    return (
                        <Link
                            key={item.href}
                            href={item.href!}
                            title={isCollapsed ? item.title : undefined}
                            className={cn(
                                'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                                pathname === item.href
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
                                isCollapsed ? 'justify-center px-0' : 'px-3'
                            )}
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                    )
                })}
            </div>

            <div className="px-3 py-2">
                {/* 本社へ連絡ボタン (Admin以外) */}
                {role !== ROLES.HQ && (
                    <div className={cn("mb-2", isCollapsed ? "hidden" : "block")}>
                        <div className="w-full">
                            <CreateNotificationModal />
                        </div>
                    </div>
                )}
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
