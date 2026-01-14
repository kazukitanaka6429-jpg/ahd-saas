'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    MedicalVData
} from '@/app/actions/medical-v/get-medical-v-data'
import {
    saveMedicalVDataBulk
} from '@/app/actions/medical-v/upsert-medical-v'
import { toast } from 'sonner'
import { Loader2, Save, AlertTriangle } from 'lucide-react'
import { MedicalVRow } from './medical-v-row'
import { cn } from '@/lib/utils'
import { Unit } from '@/app/actions/units'
import { FindingSheet } from '../daily-report/finding-sheet'
import { getFindingsPathsByRecordId } from '@/app/actions/findings'

// Props definition
interface Props {
    residents: any[]
    rows: MedicalVData[]
    targetCount: number
    currentDate: string // YYYY-MM-DD
    facilityId?: string
    units?: Unit[]
}

// Types for pending updates
type PendingDaily = { nurse_count: number }
type PendingRecord = { is_executed: boolean }

export function MedicalVGrid({ residents = [], rows: initialRows = [], targetCount = 0, currentDate, facilityId, units = [] }: Props) {
    const [rows, setRows] = useState<MedicalVData[]>(initialRows || [])
    const [isDirty, setIsDirty] = useState(false)
    const [pendingDailies, setPendingDailies] = useState<Map<string, PendingDaily>>(new Map())
    const [pendingRecords, setPendingRecords] = useState<Map<string, PendingRecord>>(new Map())
    const [isSaving, setIsSaving] = useState(false)

    // Unit Filtering State
    const [selectedUnitId, setSelectedUnitId] = useState<string>('all')

    // Filter Residents based on Unit
    const filteredResidents = useMemo(() => residents.filter(r => {
        if (units.length === 0) return true
        if (selectedUnitId === 'all') return true
        if (selectedUnitId === 'none') return !r.unit_id
        return r.unit_id === selectedUnitId
    }), [residents, units, selectedUnitId])

    useEffect(() => {
        setRows(initialRows || [])
        setPendingDailies(new Map())
        setPendingRecords(new Map())
        setIsDirty(false)
    }, [initialRows])

    // Finding State for date column
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        dailyId: string | null
        label: string
    }>({ isOpen: false, dailyId: null, label: '' })

    // Findings paths by dailyId
    const [findingsDailyPaths, setFindingsDailyPaths] = useState<Record<string, string[]>>({})

    // Handle date column context menu
    const handleDateContextMenu = useCallback((e: React.MouseEvent, dailyId: string | undefined, dateLabel: string) => {
        if (!dailyId) {
            toast.warning('まずはデータを保存してください')
            return
        }
        setFindingState({
            isOpen: true,
            dailyId,
            label: `医療連携V - ${dateLabel}`
        })
    }, [])

    // Toggle Checkbox - Memozied
    const handleToggle = useCallback((dateStr: string, residentId: string, currentVal: boolean, resident: any) => {
        // Admission date check logic is also inside Row for UI, but double check here or in Row?
        // Let's keep validation here or leave it to Row validation prop?
        // Row already checks disabled state. But simple check here is safe.
        if (resident.start_date) {
            const cellDate = new Date(dateStr)
            const admissionDate = new Date(resident.start_date)
            cellDate.setHours(0, 0, 0, 0)
            admissionDate.setHours(0, 0, 0, 0)
            if (cellDate < admissionDate) {
                toast.error(`入居日前の日付です`)
                return
            }
        }

        const newVal = !currentVal
        setRows(prev => prev.map(r => {
            if (r.date === dateStr) {
                return {
                    ...r,
                    records: { ...r.records, [residentId]: newVal }
                }
            }
            return r
        }))
        setPendingRecords(prev => {
            const next = new Map(prev)
            next.set(`${dateStr}:${residentId}`, { is_executed: newVal })
            return next
        })
        setIsDirty(true)
    }, [])

    // Update Daily Inputs - Memoized
    const handleDailyUpdate = useCallback((dateStr: string, value: string) => {
        const numVal = parseInt(value)
        if (isNaN(numVal)) return
        setRows(prev => prev.map(r => {
            if (r.date === dateStr) {
                return { ...r, nurse_count: numVal }
            }
            return r
        }))
        setPendingDailies(prev => {
            const next = new Map(prev)
            next.set(dateStr, { nurse_count: numVal })
            return next
        })
        setIsDirty(true)
    }, [])

    const onSave = async () => {
        if (!isDirty) return
        setIsSaving(true)
        try {
            const dailyUpdates = Array.from(pendingDailies.entries()).map(([date, val]) => ({
                date,
                nurse_count: val.nurse_count
            }))
            const recordUpdates = Array.from(pendingRecords.entries()).map(([key, val]) => {
                const [date, residentId] = key.split(':')
                return { date, resident_id: residentId, is_executed: val.is_executed }
            })
            const res = await saveMedicalVDataBulk(dailyUpdates, recordUpdates, targetCount, facilityId)
            if (res.error) {
                toast.error(`保存に失敗しました: ${res.error}`)
            } else {
                toast.success('保存しました')
                setPendingDailies(new Map())
                setPendingRecords(new Map())
                setIsDirty(false)
            }
        } catch (e) {
            toast.error('エラーが発生しました')
            console.error(e)
        } finally {
            setIsSaving(false)
        }
    }

    const dateObj = new Date(currentDate)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1

    // Calculation Units Helper (Reused for Totals)
    const getEstimatedUnits = (nurseCount: number) => {
        const tc = targetCount <= 0 ? 1 : targetCount
        return Math.floor((500 * nurseCount) / tc)
    }

    // Monthly Totals
    const monthlyTotals = useMemo(() => {
        let totalNurses = 0
        let totalUnits = 0
        const residentCounts: Record<string, number> = {}

        residents.forEach(r => { residentCounts[r.id] = 0 })

        rows.forEach(row => {
            totalNurses += row.nurse_count || 0
            const isDailyDirty = pendingDailies.has(row.date)
            totalUnits += isDailyDirty ? getEstimatedUnits(row.nurse_count) : row.calculated_units

            residents.forEach(r => {
                if (row.records[r.id]) {
                    residentCounts[r.id]++
                }
            })
        })

        return { totalNurses, totalUnits, residentCounts }
    }, [rows, pendingDailies, residents, targetCount])

    // Optimization: Pre-calculate dirty keys for passing to Rows as primitive
    // This allows React.memo to work effectively
    const allPendingRecordKeys = useMemo(() => Array.from(pendingRecords.keys()), [pendingRecords])

    return (
        <div className="flex flex-col h-full overflow-hidden border rounded-lg bg-white shadow-sm relative filter-drop-shadow">
            {/* Unsaved Changes Warning Banner */}
            {isDirty && (
                <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertDescription className="text-base font-medium text-amber-800">
                        ⚠️ 保存されていない変更があります。「保存」ボタンを押してください。
                    </AlertDescription>
                </Alert>
            )}

            {/* Header with Summary & Save */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center shrink-0">
                <div className="flex gap-8 items-center">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-500">当月喀痰吸引が必要な利用者数</span>
                        <span className="text-2xl font-bold text-slate-800">{targetCount}名</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-500">当月合計単位数</span>
                        <span className="text-2xl font-bold text-blue-600">{monthlyTotals.totalUnits.toLocaleString()}</span>
                    </div>
                </div>

                <Button
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    size="lg"
                    className={`font-bold text-lg px-6 py-3 h-auto transition-all ${isDirty
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
                        : 'bg-slate-600 hover:bg-slate-700 text-white'}`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            {isDirty ? '保存する' : '保存済み'}
                        </>
                    )}
                </Button>
            </div>

            {units.length > 0 && (
                <div className="px-4 pt-4 border-b">
                    <div className="flex space-x-1">
                        {units.map(unit => (
                            <button
                                key={unit.id}
                                onClick={() => setSelectedUnitId(unit.id)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-colors",
                                    selectedUnitId === unit.id
                                        ? "bg-white border-gray-200 text-blue-600 border-b-white translate-y-[1px]"
                                        : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-gray-200 mb-[1px]"
                                )}
                            >
                                {unit.name}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedUnitId('none')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-colors",
                                selectedUnitId === 'none'
                                    ? "bg-white border-gray-200 text-blue-600 border-b-white translate-y-[1px]"
                                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-gray-200 mb-[1px]"
                            )}
                        >
                            未所属
                        </button>
                        <button
                            onClick={() => setSelectedUnitId('all')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-colors",
                                selectedUnitId === 'all'
                                    ? "bg-white border-gray-200 text-blue-600 border-b-white translate-y-[1px]"
                                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-gray-200 mb-[1px]"
                            )}
                        >
                            全て
                        </button>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="overflow-auto flex-1">
                <Table className="min-w-max border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 bg-slate-100 z-30 shadow-sm">
                        <TableRow className="h-20">
                            <TableHead className="w-[100px] min-w-[100px] bg-slate-200 sticky left-0 z-30 border-r border-b text-center align-middle font-bold text-base text-slate-800">
                                指導日
                            </TableHead>
                            <TableHead className="w-[100px] min-w-[100px] bg-slate-200 sticky left-[100px] z-30 border-r border-b text-center align-middle font-bold text-base text-slate-800">
                                指導<br />看護師数
                            </TableHead>
                            <TableHead className="w-[100px] min-w-[100px] bg-slate-200 sticky left-[200px] z-30 border-r border-b text-center align-middle font-bold text-base text-slate-800">
                                当日の<br />単位数
                            </TableHead>
                            {filteredResidents?.map((r, i) => {
                                const unitName = units.find(u => u.id === r.unit_id)?.name
                                return (
                                    <TableHead key={r.id} className="w-[70px] min-w-[70px] bg-slate-100 border-r border-b text-center align-bottom p-1 text-sm text-slate-800 font-normal relative">
                                        <div className="absolute top-1 left-1 text-xs text-slate-400 font-bold">{i + 1}</div>
                                        <div className="writing-mode-vertical-rl h-16 w-full flex items-center justify-center mx-auto whitespace-nowrap font-medium gap-1">
                                            <span>{r.name}</span>
                                            {selectedUnitId === 'all' && unitName && (
                                                <span className="text-[9px] text-gray-400">{unitName}</span>
                                            )}
                                        </div>
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows?.map((row) => {
                            // Optimize: Filter dirty keys for this row only
                            const dirtyRecordIdsStr = allPendingRecordKeys
                                .filter(k => k.startsWith(row.date))
                                .map(k => k.split(':')[1])
                                .join(',')

                            const isDailyDirty = pendingDailies.has(row.date)

                            return (
                                <MedicalVRow
                                    key={row.date}
                                    row={row}
                                    month={month}
                                    residents={filteredResidents}
                                    isDailyDirty={isDailyDirty}
                                    dirtyRecordIdsStr={dirtyRecordIdsStr}
                                    targetCount={targetCount}
                                    onDailyUpdate={handleDailyUpdate}
                                    onToggle={handleToggle}
                                    onDateContextMenu={handleDateContextMenu}
                                    hasFinding={row.dailyId ? (findingsDailyPaths[row.dailyId]?.length > 0) : false}
                                />
                            )
                        })}
                    </TableBody>
                    {/* Monthly Summary Footer */}
                    <TableFooter className="sticky bottom-0 z-20 bg-slate-50 border-t-2 border-slate-300">
                        <TableRow className="h-12 bg-slate-50 hover:bg-slate-50">
                            <TableCell className="sticky left-0 z-20 border-r bg-slate-100 text-center font-bold text-base text-slate-800">
                                月間合計
                            </TableCell>
                            <TableCell className="sticky left-[100px] z-20 border-r bg-slate-100 text-center font-bold text-lg text-slate-800">
                                {monthlyTotals.totalNurses}
                            </TableCell>
                            <TableCell className="sticky left-[200px] z-20 border-r bg-slate-100 text-center font-bold text-lg text-blue-600">
                                {monthlyTotals.totalUnits.toLocaleString()}
                            </TableCell>
                            {filteredResidents?.map(r => (
                                <TableCell key={r.id} className="text-center font-bold text-sm bg-slate-50 border-r text-slate-700">
                                    {monthlyTotals.residentCounts[r.id] || 0}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Finding Sheet for date column */}
            <FindingSheet
                isOpen={findingState.isOpen}
                onClose={() => {
                    setFindingState(prev => ({ ...prev, isOpen: false }))
                    // Refresh indicator after closing
                    if (findingState.dailyId) {
                        getFindingsPathsByRecordId(findingState.dailyId, 'medical_v_daily').then((pathsMap) => {
                            setFindingsDailyPaths(prev => ({ ...prev, ...pathsMap }))
                        })
                    }
                }}
                recordId={findingState.dailyId}
                jsonPath="date"
                label={findingState.label}
                recordType="medical_v_daily"
            />
        </div>
    )
}
