'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMyNotifications, markAsRead, SystemNotification } from '@/app/actions/system-notifications'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export function NotificationBell({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const [notifications, setNotifications] = useState<SystemNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const supabase = createClient()

    // 1. Initial Fetch
    const fetchNotifications = useCallback(async () => {
        const data = await getMyNotifications()
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
    }, [])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    // 2. Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('realtime-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    const newNotif = payload.new as any

                    // Note: RLS on Realtime is tricky.
                    // By default, Supabase Realtime broadcasts to everyone if RLS is not configured strictly for replication OR if we listen to 'public'.
                    // To filter for THIS user, we usually need to check the payload content.
                    // But payload might not show all fields if RLS hides them?
                    // "If you have RLS enabled and want to listen to changes, you must enable replication for the table"
                    // AND "Clients will only receive events for rows they are allowed to see" (if configured).
                    // Detailed check: We assume RLS Policies allow SELECT.
                    // Simple check on client side:
                    // If the notification returns, we assume it's for us (thanks to Postgres RLS filtering the outgoing stream usually, OR we filter manually).
                    // Actually, standard Realtime with "broadcast" changes usually bypasses RLS unless you use "Postgres Changes" with specific filter or if you trust the client to filter.
                    // SAFETY: Ideally we re-fetch or verify.
                    // For now, let's just trigger a re-fetch to be safe and ensure data integrity (including joins).

                    console.log('New notification received:', newNotif)

                    // Optimistic update or Re-fetch?
                    // Let's Re-fetch to get correct fields / check RLS visibility from server action perspective.
                    // Disadvantage: API call. Advantage: Security and Consistency.
                    fetchNotifications().then(() => {
                        toast.info(newNotif.title || '新しい通知があります')
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchNotifications, supabase])

    // 3. Mark as Read
    const handleRead = async (n: SystemNotification) => {
        if (n.is_read) return

        // Optimistic update
        setNotifications(prev => prev.map(item =>
            item.id === n.id ? { ...item, is_read: true } : item
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await markAsRead(n.id)
    }

    // 4. Mark all visible as read? (Optional)

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "relative h-10 w-10 text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                        isCollapsed && "mx-auto"
                    )}
                >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end" sideOffset={5}>
                <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/50">
                    <h4 className="font-semibold text-sm">通知</h4>
                    <span className="text-xs text-gray-500">{unreadCount}件の未読</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                            通知はありません
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "cursor-pointer border-b p-4 hover:bg-gray-50 last:border-0 transition-colors",
                                    !n.is_read ? "bg-blue-50/30" : "opacity-70"
                                )}
                                onClick={() => handleRead(n)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 space-y-1">
                                        <p className={cn("text-sm leading-none", !n.is_read ? "font-bold text-blue-700" : "font-medium text-gray-700")}>
                                            {n.title}
                                        </p>
                                        <p className="text-xs text-gray-600 line-clamp-2">
                                            {n.content}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ja })}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500 mt-1" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
