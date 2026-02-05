'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Download, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import {
    OperationLog,
    getOperationLogs,
    exportLogsToCSV,
} from '@/app/actions/admin/get-operation-logs'
import { getResourceLabel, getActionLabel } from '@/lib/operation-log-labels'

interface OperationLogsClientProps {
    initialLogs: OperationLog[]
    initialTotal: number
    staffs: { id: string; name: string }[]
}

const RESOURCE_OPTIONS = [
    { value: 'daily_record', label: '業務日誌' },
    { value: 'medical_iv_record', label: '医療連携IV' },
    { value: 'medical_v_record', label: '医療連携V' },
    { value: 'resident', label: '利用者' },
    { value: 'staff', label: '職員' },
    { value: 'facility', label: '施設' },
    { value: 'short_stay', label: 'ショートステイ' },
]

const ACTION_OPTIONS = [
    { value: 'CREATE', label: '作成' },
    { value: 'UPDATE', label: '更新' },
    { value: 'DELETE', label: '削除' },
    { value: 'EXPORT', label: 'エクスポート' },
]

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    EXPORT: 'bg-purple-100 text-purple-800',
    LOGIN: 'bg-yellow-100 text-yellow-800',
    LOGOUT: 'bg-gray-100 text-gray-800',
}

const PAGE_SIZE = 50

export function OperationLogsClient({ initialLogs, initialTotal, staffs }: OperationLogsClientProps) {
    const [logs, setLogs] = useState<OperationLog[]>(initialLogs)
    const [total, setTotal] = useState(initialTotal)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(0)

    // Filters
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [actorId, setActorId] = useState('')
    const [targetResource, setTargetResource] = useState('')
    const [actionType, setActionType] = useState('')

    const fetchLogs = useCallback(async (newPage: number = 0) => {
        setLoading(true)
        try {
            const result = await getOperationLogs({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                actorId: actorId === 'all' ? undefined : actorId || undefined,
                targetResource: targetResource === 'all' ? undefined : targetResource || undefined,
                actionType: actionType === 'all' ? undefined : actionType || undefined,
                limit: PAGE_SIZE,
                offset: newPage * PAGE_SIZE
            })
            setLogs(result.logs)
            setTotal(result.total)
            setPage(newPage)
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate, actorId, targetResource, actionType])

    const handleSearch = () => {
        fetchLogs(0)
    }

    const handleExport = async () => {
        setLoading(true)
        try {
            const csv = await exportLogsToCSV({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                actorId: actorId === 'all' ? undefined : actorId || undefined,
                targetResource: targetResource === 'all' ? undefined : targetResource || undefined,
                actionType: actionType === 'all' ? undefined : actionType || undefined,
            })

            // Download CSV
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `operation_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setLoading(false)
        }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                        <Label htmlFor="startDate">開始日</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDate">終了日</Label>
                        <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="actor">操作者</Label>
                        <Select value={actorId} onValueChange={setActorId}>
                            <SelectTrigger id="actor">
                                <SelectValue placeholder="すべて" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">すべて</SelectItem>
                                {staffs.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="resource">対象</Label>
                        <Select value={targetResource} onValueChange={setTargetResource}>
                            <SelectTrigger id="resource">
                                <SelectValue placeholder="すべて" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">すべて</SelectItem>
                                {RESOURCE_OPTIONS.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="action">操作種別</Label>
                        <Select value={actionType} onValueChange={setActionType}>
                            <SelectTrigger id="action">
                                <SelectValue placeholder="すべて" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">すべて</SelectItem>
                                {ACTION_OPTIONS.map(a => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end gap-2">
                        <Button onClick={handleSearch} disabled={loading}>
                            <Search className="h-4 w-4 mr-2" />
                            検索
                        </Button>
                        <Button variant="outline" onClick={handleExport} disabled={loading}>
                            <Download className="h-4 w-4 mr-2" />
                            CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
                {total.toLocaleString()} 件のログ
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[160px]">日時</TableHead>
                            <TableHead className="w-[120px]">操作者</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                            <TableHead className="w-[120px]">対象</TableHead>
                            <TableHead>詳細</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    ログがありません
                                </TableCell>
                            </TableRow>
                        ) : logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="text-sm text-gray-600">
                                    {format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {log.actor_name}
                                </TableCell>
                                <TableCell>
                                    <Badge className={ACTION_COLORS[log.action_type] || 'bg-gray-100'}>
                                        {getActionLabel(log.action_type)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {getResourceLabel(log.target_resource)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600 max-w-[300px] truncate">
                                    {formatDetails(log.details)}
                                </TableCell>
                                <TableCell>
                                    <LogDetailDialog log={log} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(page - 1)}
                        disabled={page === 0 || loading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                        {page + 1} / {totalPages} ページ
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(page + 1)}
                        disabled={page >= totalPages - 1 || loading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}

// フィールド名の日本語翻訳
const FIELD_LABELS: Record<string, string> = {
    // 共通
    date: '日付',
    name: '名前',
    facilityId: '施設ID',
    facility_id: '施設ID',
    residentId: '利用者ID',
    resident_id: '利用者ID',
    residentName: '利用者名',
    count: '件数',
    recordCount: '記録数',
    dailyCount: '日次記録数',
    dateRange: '日付範囲',
    isExecuted: '実行',
    is_executed: '実行',
    role: 'ロール',

    // 業務日誌 - 食事
    meal_breakfast: '朝食',
    meal_lunch: '昼食',
    meal_dinner: '夕食',

    // 業務日誌 - 日中活動
    is_gh: 'GH（日中）',
    daytime_activity: '日中活動',
    other_welfare_service: 'その他福祉サービス',

    // 業務日誌 - 夜間
    is_gh_night: 'GH泊',
    is_gh_stay: 'GH宿泊',
    emergency_transport: '救急搬送',
    hospitalization_status: '入院',
    overnight_stay_status: '外泊',

    // 医療連携関連
    staff_id: '担当スタッフID',
    nurse_count: '看護師数',
    calculated_units: '算定単位',

    // シフト関連
    day_staff_ids: '日勤職員',
    night_staff_ids: '夜勤職員',
    night_shift_plus: '夜勤加配',
    type: '種別',

    // 利用者関連
    status: 'ステータス',
    care_level: '介護度',
    sputum_suction: '喀痰吸引',
    severe_disability_addition: '重度障害者加算',
    ventilator: '人工呼吸器',
    table_7: '別表第7',
    table_8: '別表第8',
    start_date: '開始日',
    end_date: '終了日',
    unit_id: 'ユニットID',

    // 職員関連
    qualification_id: '資格ID',
    job_types: '職種',
    invite_token: '招待トークン',
    auth_user_id: '認証ユーザーID',

    // ショートステイ
    short_stay_type: '区分',
    is_trial: '体験利用',
    is_meal: '食事提供'
}

// 値の日本語翻訳
const VALUE_LABELS: Record<string, Record<string, string>> = {
    status: {
        in_facility: '入居中',
        hospitalized: '入院中',
        home_stay: '外泊中',
        left: '退所',
        active: '有効',
        retired: '退職'
    },
    role: {
        admin: '本社',
        manager: '管理者',
        staff: '一般'
    },
    short_stay_type: {
        short_stay: 'ショートステイ',
        emergency: '緊急',
        trial: '体験'
    },
    other_welfare_service: {
        '生活介護': '生活介護',
        '居宅介護': '居宅介護',
        '重度訪問介護': '重度訪問介護',
        '行動援護': '行動援護',
        '移動支援': '移動支援'
    }
}

function translateFieldName(key: string): string {
    return FIELD_LABELS[key] || key
}

function translateValue(key: string, value: any): string {
    if (value === null || value === undefined) return '-'
    if (value === true) return '✓'
    if (value === false) return '-'
    if (VALUE_LABELS[key] && VALUE_LABELS[key][value]) {
        return VALUE_LABELS[key][value]
    }
    if (Array.isArray(value)) {
        return value.join(', ')
    }
    return String(value)
}

function formatDetails(details: Record<string, any>): string {
    if (!details || Object.keys(details).length === 0) return '-'

    const parts: string[] = []

    // 基本情報
    if (details.date) parts.push(`${details.date}`)
    if (details.name) parts.push(`${details.name}`)
    if (details.residentName) parts.push(`${details.residentName}`)
    if (details.count) parts.push(`${details.count}件`)
    if (details.recordCount) parts.push(`${details.recordCount}件`)
    if (details.type === 'shift_update') parts.push('シフト変更')

    // 変更内容の要約
    if (details.before || details.after) {
        const changes: string[] = []
        const before = details.before || {}
        const after = details.after || {}

        // 変更されたキーを収集
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
        allKeys.forEach(key => {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                changes.push(translateFieldName(key))
            }
        })

        if (changes.length > 0) {
            parts.push(`変更: ${changes.join(', ')}`)
        } else {
            parts.push('変更あり')
        }
    }

    return parts.length > 0 ? parts.join(' / ') : '-'
}

function LogDetailDialog({ log }: { log: OperationLog }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>ログ詳細</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-500">日時</Label>
                            <p>{format(new Date(log.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}</p>
                        </div>
                        <div>
                            <Label className="text-gray-500">操作者</Label>
                            <p>{log.actor_name}</p>
                        </div>
                        <div>
                            <Label className="text-gray-500">操作種別</Label>
                            <Badge className={ACTION_COLORS[log.action_type] || 'bg-gray-100'}>
                                {getActionLabel(log.action_type)}
                            </Badge>
                        </div>
                        <div>
                            <Label className="text-gray-500">対象</Label>
                            <p>{getResourceLabel(log.target_resource)}</p>
                        </div>
                        {log.ip_address && (
                            <div>
                                <Label className="text-gray-500">IPアドレス</Label>
                                <p className="font-mono text-sm">{log.ip_address}</p>
                            </div>
                        )}
                    </div>

                    {/* Before/After - 日本語表示 */}
                    {(log.details?.before || log.details?.after) && (
                        <div className="border-t pt-4">
                            <Label className="text-gray-500 mb-2 block">変更内容</Label>
                            <div className="space-y-2">
                                <ChangesList
                                    before={log.details.before}
                                    after={log.details.after}
                                />
                            </div>
                        </div>
                    )}

                    {/* Other details - 日本語表示 */}
                    {Object.keys(log.details || {}).filter(k => k !== 'before' && k !== 'after').length > 0 && (
                        <div className="border-t pt-4">
                            <Label className="text-gray-500 mb-2 block">操作情報</Label>
                            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                                {Object.entries(log.details)
                                    .filter(([k]) => k !== 'before' && k !== 'after')
                                    .map(([key, value]) => (
                                        <div key={key} className="flex text-sm">
                                            <span className="text-gray-500 w-32">{translateFieldName(key)}:</span>
                                            <span>{translateValue(key, value)}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ChangesList({ before, after }: { before?: Record<string, any>; after?: Record<string, any> }) {
    if (!before && !after) return null

    // Get all unique keys from both before and after
    const allKeys = [...new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {})
    ])]

    // Filter to only changed values
    const changedKeys = allKeys.filter(key => {
        const beforeVal = before?.[key]
        const afterVal = after?.[key]
        return JSON.stringify(beforeVal) !== JSON.stringify(afterVal)
    })

    if (changedKeys.length === 0) {
        return <p className="text-sm text-gray-500">変更なし</p>
    }

    return (
        <div className="space-y-2">
            {changedKeys.map(key => {
                const beforeVal = before?.[key]
                const afterVal = after?.[key]

                return (
                    <div key={key} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium text-gray-700 min-w-[100px]">
                            {translateFieldName(key)}
                        </span>
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded line-through">
                            {translateValue(key, beforeVal)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {translateValue(key, afterVal)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

