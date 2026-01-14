'use client'

import { useEffect, useState } from 'react'
import { getUnresolvedNotifications, getResolvedNotifications, resolveNotification, FacilityNotification } from '@/app/actions/notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardFilter, FilterValues } from './DashboardFilter'
import { getStaffListForFilter, SimpleStaff } from '@/app/actions/staff'
import { NotificationFilters } from '@/app/actions/notifications'
import { CheckCircle2, AlertCircle, RefreshCw, History, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

type GroupedNotifications = {
    [facilityName: string]: (FacilityNotification & { created_staff?: { name: string } | null, resolved_staff?: { name: string } | null })[]
}

export function NotificationWidget() {
    const [notifications, setNotifications] = useState<(FacilityNotification & { created_staff?: { name: string } | null })[]>([])
    const [resolvedNotifications, setResolvedNotifications] = useState<(FacilityNotification & { created_staff?: { name: string } | null, resolved_staff?: { name: string } | null })[]>([])
    const [staffList, setStaffList] = useState<SimpleStaff[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('inbox')

    // Filter State
    const [filters, setFilters] = useState<FilterValues>({
        year: '',
        month: '',
        created_by: 'all',
        resolved_by: 'all'
    })

    const fetchNotifications = async () => {
        setLoading(true)
        const data = await getUnresolvedNotifications()
        setNotifications(data)

        if (activeTab === 'history') {
            await fetchResolved(filters)
        }

        setLoading(false)
    }

    const fetchResolved = async (currentFilters: FilterValues) => {
        // Convert empty strings to undefined for API
        const apiFilters: NotificationFilters = {
            year: currentFilters.year || undefined,
            month: currentFilters.month || undefined,
            created_by: currentFilters.created_by,
            resolved_by: currentFilters.resolved_by
        }
        const data = await getResolvedNotifications(apiFilters)
        setResolvedNotifications(data)
    }

    const loadStaffList = async () => {
        const list = await getStaffListForFilter()
        setStaffList(list)
    }

    useEffect(() => {
        fetchNotifications()
        loadStaffList()
    }, [])

    useEffect(() => {
        if (activeTab === 'history') {
            fetchResolved(filters)
        }
    }, [activeTab])

    const handleFilterChange = (newFilters: FilterValues) => {
        setFilters(newFilters)
        if (activeTab === 'history') {
            fetchResolved(newFilters)
        }
    }

    const handleResolve = async (id: string) => {
        const result = await resolveNotification(id)
        if (result.success) {
            setNotifications((prev) => prev.filter((n) => n.id !== id))
            // Refresh resolved list if switching to history later
            fetchResolved(filters)
        } else {
            alert('エラーが発生しました')
        }
    }

    // Grouping logic for Inbox
    const groupedInbox = notifications.reduce((acc, note) => {
        const facilityName = note.facilities?.name || 'Unknown Facility'
        if (!acc[facilityName]) {
            acc[facilityName] = []
        }
        acc[facilityName].push(note)
        return acc
    }, {} as GroupedNotifications)

    // Grouping logic for History (Resolved)
    // For resolved, maybe displaying by date is better? But let's stick to facility grouping for consistency first, 
    // or just a flat list since order matters more? 
    // Let's use facility grouping for now to match UI style.
    const groupedResolved = resolvedNotifications.reduce((acc, note) => {
        const facilityName = note.facilities?.name || 'Unknown Facility'
        if (!acc[facilityName]) {
            acc[facilityName] = []
        }
        acc[facilityName].push(note)
        return acc
    }, {} as GroupedNotifications)


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    施設からの連絡
                </h2>
                <Button variant="ghost" size="sm" onClick={() => { activeTab === 'inbox' ? fetchNotifications() : fetchResolved(filters) }} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    更新
                </Button>
            </div>

            <Tabs defaultValue="inbox" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="inbox" className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        未確認
                        {notifications.length > 0 && (
                            <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-[20px] justify-center">
                                {notifications.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        確認済み履歴
                    </TabsTrigger>
                </TabsList>

                {/* INBOX CONTENT */}
                <TabsContent value="inbox" className="mt-0">
                    {loading && notifications.length === 0 ? (
                        <div className="text-gray-500 text-sm p-4 text-center">読み込み中...</div>
                    ) : notifications.length === 0 ? (
                        <Card>
                            <CardContent>
                                <div className="text-gray-400 text-sm py-8 text-center">
                                    現在、未確認の連絡はありません
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            {Object.entries(groupedInbox).map(([facilityName, notes]) => {
                                const hasHighPriority = notes.some((n) => n.priority === 'high')
                                return (
                                    <Card key={facilityName} className={cn("overflow-hidden border-t-4", hasHighPriority ? "border-t-red-500" : "border-t-blue-500")}>
                                        <CardHeader className="bg-gray-50/50 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                            <div className="font-bold flex items-center gap-2">{facilityName}</div>
                                            {hasHighPriority && (
                                                <Badge variant="destructive" className="flex gap-1 items-center">
                                                    <AlertCircle className="h-3 w-3" /> 要対応
                                                </Badge>
                                            )}
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {notes.map((note) => (
                                                    <div key={note.id} className="p-4 flex gap-3 hover:bg-gray-50 transition-colors">
                                                        <div className="shrink-0 pt-1">
                                                            {note.priority === 'high' ? <AlertCircle className="h-5 w-5 text-red-500" /> : <div className="h-2 w-2 rounded-full bg-blue-400 m-1.5" />}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <p className={cn("text-sm leading-relaxed", note.priority === 'high' && "font-medium")}>{note.content}</p>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                <span>{note.created_staff?.name || '職員'}</span>
                                                                <span>•</span>
                                                                <span>{new Date(note.created_at).toLocaleString('ja-JP')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0">
                                                            <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => handleResolve(note.id)}>
                                                                <CheckCircle2 className="h-3 w-3 mr-1" /> 確認
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* HISTORY CONTENT */}
                <TabsContent value="history" className="mt-0">
                    <DashboardFilter
                        onFilterChange={handleFilterChange}
                        staffList={staffList}
                        showResolvedBy={true}
                    />

                    {resolvedNotifications.length === 0 ? (
                        <Card>
                            <CardContent>
                                <div className="text-gray-400 text-sm py-8 text-center">
                                    確認済みの連絡はありません
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            {Object.entries(groupedResolved).map(([facilityName, notes]) => (
                                <Card key={facilityName} className="overflow-hidden border-t-4 border-t-gray-300">
                                    <CardHeader className="bg-gray-50/50 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                        <div className="font-bold flex items-center gap-2 text-gray-600">{facilityName}</div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {notes.map((note) => (
                                                <div key={note.id} className="p-4 flex gap-3 hover:bg-gray-50 transition-colors opacity-75">
                                                    <div className="shrink-0 pt-1">
                                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm leading-relaxed text-gray-700">{note.content}</p>
                                                        <div className="flex flex-col gap-1 text-xs text-gray-400">
                                                            <div className="flex items-center gap-2">
                                                                <span>作成: {note.created_staff?.name || '職員'}</span>
                                                                <span>{new Date(note.created_at).toLocaleString('ja-JP')}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-green-600">
                                                                <span>確認: {note.resolved_staff?.name || '本社'}</span>
                                                                <span>{note.resolved_at ? new Date(note.resolved_at).toLocaleString('ja-JP') : '-'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
