'use client'

import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, ChevronDown } from "lucide-react"
import { SidebarItem, sidebarItems } from "@/config/menu"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FacilitySwitcher } from "@/components/common/facility-switcher"

// Role definitions
const ROLES = {
    HQ: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
} as const

export function MobileSidebar({ role, facilityName }: { role?: string, facilityName?: string }) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [isMasterOpen, setIsMasterOpen] = useState(true)

    // Close sheet when route changes
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const hasAccess = (item: SidebarItem) => {
        if (item.adminOnly) {
            return role === ROLES.HQ
        }
        if (role === ROLES.STAFF && item.href) {
            return !['/staffs', '/residents', '/analysis', '/hq/daily', '/admin/facilities', '/admin/qualifications'].includes(item.href)
        }
        return true
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
                <div className="flex flex-col h-full py-4">
                    {/* Header / Brand */}
                    <div className="px-4 mb-6">
                        <h2 className="text-lg font-bold">メニュー</h2>

                        {/* Role Badge */}
                        <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-sidebar-foreground/60 border border-sidebar-border rounded px-2 py-0.5 whitespace-nowrap bg-sidebar/50">
                                {role === 'admin' ? '本社' : role === 'manager' ? '管理者' : '一般'}
                            </div>
                            <span className="text-xs truncate max-w-[120px]">{facilityName}</span>
                        </div>
                    </div>

                    <div className="px-4 mb-4">
                        <FacilitySwitcher />
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-1">
                        {sidebarItems.map((item, index) => {
                            if (!hasAccess(item)) return null;

                            if (item.children) {
                                const visibleChildren = item.children.filter(child => hasAccess(child));
                                if (visibleChildren.length === 0) return null;

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
                                                className="w-full justify-between hover:bg-sidebar-accent hover:text-sidebar-foreground px-3 py-2 h-auto font-normal text-sidebar-foreground/70"
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
                                                            ? 'bg-sidebar-primary/10 text-sidebar-primary'
                                                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href!}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        pathname === item.href
                                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{item.title}</span>
                                </Link>
                            )
                        })}
                    </div>

                    <div className="mt-auto px-4 pt-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-red-500"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span>ログアウト</span>
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
