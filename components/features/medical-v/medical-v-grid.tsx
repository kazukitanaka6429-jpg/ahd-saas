'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    getMedicalVData,
    MedicalVData,
    MedicalVRecord
} from '@/app/actions/medical-v/get-medical-v-data'
import {
    upsertMedicalVDaily,
    toggleMedicalVRecord,
    saveMedicalVDataBulk
} from '@/app/actions/medical-v/upsert-medical-v'
import { toast } from 'sonner'
import { Loader2, Save, AlertTriangle } from 'lucide-react'
import holiday_jp from '@holiday-jp/holiday_jp'

// Props definition
interface Props {
    residents: any[]
    rows: MedicalVData[]
    targetCount: number
    currentDate: string // YYYY-MM-DD
    facilityId?: string
}

// Types for pending updates
type PendingDaily = { nurse_count: number }
type PendingRecord = { is_executed: boolean }

// Helper: Check if date is a Japanese holiday
const isHoliday = (date: Date): boolean => {
    return holiday_jp.isHoliday(date)
}

// Helper: Get day type for styling
const getDayType = (date: Date): 'weekday' | 'saturday' | 'sunday' | 'holiday' => {
    if (isHoliday(date)) return 'holiday'
    const day = date.getDay()
    if (day === 0) return 'sunday'
    if (day === 6) return 'saturday'
    return 'weekday'
}

// Helper: Get text color class based on day type
const getDateTextColor = (dayType: 'weekday' | 'saturday' | 'sunday' | 'holiday'): string => {
    switch (dayType) {
        case 'saturday': return 'text-blue-600'
        case 'sunday': return 'text-red-600'
        case 'holiday': return 'text-red-600'
        default: return 'text-gray-900'
    }
}

// Helper: Check if date is before resident's admission (start_date)
const isBeforeAdmission = (dateStr: string, resident: any): boolean => {
    if (!resident.start_date) return false
    const cellDate = new Date(dateStr)
    const admissionDate = new Date(resident.start_date)
    // Compare dates only (ignore time)
    cellDate.setHours(0, 0, 0, 0)
    admissionDate.setHours(0, 0, 0, 0)
    return cellDate < admissionDate
}

export function MedicalVGrid({ residents = [], rows: initialRows = [], targetCount = 0, currentDate, facilityId }: Props) {
    const [rows, setRows] = useState<MedicalVData[]>(initialRows || [])
    const [isDirty, setIsDirty] = useState(false)
    const [pendingDailies, setPendingDailies] = useState<Map<string, PendingDaily>>(new Map())
    const [pendingRecords, setPendingRecords] = useState<Map<string, PendingRecord>>(new Map())
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        setRows(initialRows || [])
        setPendingDailies(new Map())
        setPendingRecords(new Map())
        setIsDirty(false)
    }, [initialRows])

    // Toggle Checkbox with admission date validation
    const handleToggle = (dateStr: string, residentId: string, currentVal: boolean, resident: any) => {
        // ② Check admission date - prevent checking before admission
        if (isBeforeAdmission(dateStr, resident)) {
            toast.error(`この利用者は ${resident.start_date} から入居のため、それ以前の日付にチェックを付けることはできません。`)
            return
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
    }

    // Update Daily Inputs
    const handleDailyUpdate = (dateStr: string, value: string) => {
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
    }

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

    // Units Calculation
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

    return (
        <div className="flex flex-col h-full overflow-hidden border rounded-lg bg-white shadow-md relative">
            {/* Unsaved Changes Warning Banner */}
            {isDirty && (
                <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 bg-orange-100 border-orange-300">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="text-base font-medium text-orange-800">
                        ⚠️ 保存されていない変更があります。「保存」ボタンを押してください。
                    </AlertDescription>
                </Alert>
            )}

            {/* Header with Summary & Save */}
            <div className="bg-green-100 border-b border-green-200 px-4 py-3 flex justify-between items-center shrink-0">
                <div className="flex gap-8 items-center">
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-green-800">当月喀痰吸引が必要な利用者数</span>
                        <span className="text-2xl font-bold">{targetCount}名</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-green-800">当月合計単位数</span>
                        <span className="text-2xl font-bold text-blue-700">{monthlyTotals.totalUnits.toLocaleString()}</span>
                    </div>
                </div>

                <Button
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    size="lg"
                    className={`font-bold text-lg px-6 py-3 h-auto ${isDirty
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg'
                        : 'bg-green-600 hover:bg-green-700 text-white'}`}
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

            {/* Main Table */}
            <div className="overflow-auto flex-1">
                <Table className="min-w-max border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 bg-green-50 z-30 shadow-sm">
                        <TableRow className="h-20">
                            <TableHead className="w-[100px] min-w-[100px] bg-green-200/70 sticky left-0 z-30 border-r border-b text-center align-middle font-bold text-base text-black">
                                指導日
                            </TableHead>
                            <TableHead className="w-[100px] min-w-[100px] bg-green-200/70 sticky left-[100px] z-30 border-r border-b text-center align-middle font-bold text-base text-black">
                                指導<br />看護師数
                            </TableHead>
                            <TableHead className="w-[100px] min-w-[100px] bg-green-200/70 sticky left-[200px] z-30 border-r border-b text-center align-middle font-bold text-base text-black">
                                当日の<br />単位数
                            </TableHead>
                            {residents?.map((r, i) => (
                                <TableHead key={r.id} className="w-[70px] min-w-[70px] bg-green-100/70 border-r border-b text-center align-bottom p-1 text-sm text-black font-normal relative">
                                    <div className="absolute top-1 left-1 text-xs text-gray-500 font-bold">{i + 1}</div>
                                    <div className="writing-mode-vertical-rl h-16 w-full flex items-center justify-center mx-auto whitespace-nowrap font-medium">
                                        {r.name}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows?.map((row) => {
                            const d = new Date(row.date)
                            const dayNum = d.getDate()
                            const dayType = getDayType(d)
                            const textColor = getDateTextColor(dayType)
                            const isDailyDirty = pendingDailies.has(row.date)
                            const displayUnits = isDailyDirty ? getEstimatedUnits(row.nurse_count) : row.calculated_units
                            const bgColor = dayType === 'saturday' ? 'bg-blue-50'
                                : (dayType === 'sunday' || dayType === 'holiday') ? 'bg-red-50'
                                    : 'bg-white'

                            return (
                                <TableRow key={row.date} className="hover:bg-gray-50 h-10">
                                    <TableCell className={`sticky left-0 z-20 border-r border-b text-center font-bold text-base p-1 ${bgColor} ${textColor}`}>
                                        {month}/{dayNum}
                                        {dayType === 'holiday' && <span className="text-xs ml-1">祝</span>}
                                    </TableCell>
                                    <TableCell className={`sticky left-[100px] z-20 border-r border-b p-0 ${isDailyDirty ? 'bg-orange-50' : 'bg-white'}`}>
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="0"
                                            className="h-12 w-full border border-gray-200 text-center text-lg font-medium focus-visible:ring-2 focus-visible:ring-blue-400 rounded bg-white"
                                            value={row.nurse_count || ''}
                                            onChange={(e) => handleDailyUpdate(row.date, e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="sticky left-[200px] z-20 border-r border-b text-center text-lg font-medium p-0 bg-white">
                                        {displayUnits}
                                    </TableCell>
                                    {residents?.map(r => {
                                        const isChecked = row.records[r.id] || false
                                        const isCellDirty = pendingRecords.has(`${row.date}:${r.id}`)
                                        const isDisabled = isBeforeAdmission(row.date, r)

                                        return (
                                            <TableCell
                                                key={r.id}
                                                className={`p-0 border-r border-b text-center h-10 w-[70px] ${isCellDirty ? 'bg-orange-50' : ''} ${isDisabled ? 'bg-gray-100' : ''}`}
                                                title={isDisabled ? `入居日: ${r.start_date}` : ''}
                                            >
                                                <div className="flex items-center justify-center h-full w-full">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        disabled={isDisabled}
                                                        onCheckedChange={() => handleToggle(row.date, r.id, isChecked, r)}
                                                        className={`h-6 w-6 border-2 rounded transition-colors ${isDisabled
                                                                ? 'border-gray-300 bg-gray-200 cursor-not-allowed opacity-50'
                                                                : isChecked
                                                                    ? 'bg-green-600 border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white'
                                                                    : 'border-gray-400 hover:border-green-500'
                                                            }`}
                                                    />
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                    {/* Monthly Summary Footer */}
                    <TableFooter className="sticky bottom-0 z-20 bg-green-100 border-t-2 border-green-300">
                        <TableRow className="h-12">
                            <TableCell className="sticky left-0 z-20 border-r bg-green-200/80 text-center font-bold text-base">
                                月間合計
                            </TableCell>
                            <TableCell className="sticky left-[100px] z-20 border-r bg-green-200/80 text-center font-bold text-lg">
                                {monthlyTotals.totalNurses}
                            </TableCell>
                            <TableCell className="sticky left-[200px] z-20 border-r bg-green-200/80 text-center font-bold text-lg text-blue-700">
                                {monthlyTotals.totalUnits.toLocaleString()}
                            </TableCell>
                            {residents?.map(r => (
                                <TableCell key={r.id} className="text-center font-bold text-sm bg-green-100/80 border-r">
                                    {monthlyTotals.residentCounts[r.id] || 0}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    )
}
