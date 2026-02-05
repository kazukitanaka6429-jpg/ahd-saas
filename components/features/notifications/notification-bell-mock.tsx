'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function NotificationBellMock({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const unreadCount = 3 // MOCK: Fake unread count

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "relative h-10 w-10 text-gray-500 hover:bg-gray-100 hover:text-gray-900", // Updated colors for Header (white bg)
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
            <PopoverContent className="w-80 p-0" align="start" side="right">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold text-sm">通知</h4>
                    <span className="text-xs text-gray-500">{unreadCount}件の未読</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {/* MOCK ITEMS */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="cursor-pointer border-b p-4 hover:bg-gray-50 last:border-0">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none text-blue-600">
                                        【重要】システムメンテナンスのお知らせ
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        本日22:00よりメンテナンスを行います。
                                    </p>
                                    <p className="text-[10px] text-gray-400">10分前</p>
                                </div>
                                <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            </div>
                        </div>
                    ))}
                    <div className="p-4 text-center text-sm text-gray-500">
                        すべての通知を見る
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
