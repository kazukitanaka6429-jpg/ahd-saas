'use client'

import { useEffect, useState } from 'react'
import { getFacilityNotifications, FacilityNotification, NotificationFilters } from '@/app/actions/notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DashboardFilter, FilterValues } from './DashboardFilter'
import { getStaffListForFilter, SimpleStaff } from '@/app/actions/staffs'

type ExtendedNotification = FacilityNotification & { resolved_staff?: { name: string } | null, created_staff?: { name: string } | null }

export function FacilityNotificationWidget() {
    const [notifications, setNotifications] = useState<ExtendedNotification[]>([])
    const [loading, setLoading] = useState(true)
    const [staffList, setStaffList] = useState<SimpleStaff[]>([])
    const [filters, setFilters] = useState<FilterValues>({
        year: '',
        month: '',
        created_by: 'all',
        resolved_by: 'all'
    })

    const fetchNotifications = async (currentFilters: FilterValues = filters) => {
        setLoading(true)
        const apiFilters: NotificationFilters = {
            year: currentFilters.year || undefined,
            month: currentFilters.month || undefined,
            created_by: currentFilters.created_by,
            resolved_by: currentFilters.resolved_by
        }
        const data = await getFacilityNotifications(apiFilters)
        setNotifications(data)
        setLoading(false)
    }

    const loadStaffList = async () => {
        const list = await getStaffListForFilter()
        setStaffList(list)
    }

    useEffect(() => {
        fetchNotifications()
        loadStaffList()
    }, [])

    const handleFilterChange = (newFilters: FilterValues) => {
        setFilters(newFilters)
        fetchNotifications(newFilters)
    }

    return (
        <Card>
            <CardHeader className="py-3 px-4 flex flex-col space-y-4">
                <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        送信済み連絡一覧
                        <span className="text-xs font-normal text-gray-500 ml-2">本社の確認状況</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => fetchNotifications(filters)} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        更新
                    </Button>
                </div>
                <DashboardFilter
                    onFilterChange={handleFilterChange}
                    staffList={staffList}
                    showResolvedBy={true}
                    defaultFilters={filters}
                />
            </CardHeader>
            <CardContent className="p-0">
                {notifications.length === 0 ? (
                    <div className="text-gray-400 text-sm py-8 text-center">
                        送信履歴はありません
                    </div>
                ) : (
                    <div className="divide-y max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.map((note) => (
                            <div key={note.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {note.status === 'resolved' ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" />
                                                確認済み
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                未確認
                                            </Badge>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            {note.created_staff?.name || '自分'} • {new Date(note.created_at).toLocaleString('ja-JP')}
                                        </span>
                                    </div>
                                    {note.priority === 'high' && (
                                        <Badge variant="destructive" className="text-[10px] px-1.5 h-5">要対応</Badge>
                                    )}
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                                    {note.content}
                                </div>
                                {note.status === 'resolved' && (
                                    <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 inline-block">
                                        確認者: {note.resolved_staff?.name || '本社'}
                                        ({new Date(note.resolved_at!).toLocaleString('ja-JP')})
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
