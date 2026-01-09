'use client'

import { useState, useTransition, useEffect } from 'react'
import { MedicalVData } from '@/app/actions/medical-v/get-medical-v-data'
import { Resident } from '@/types'
import { upsertMedicalVDaily, toggleMedicalVRecord } from '@/app/actions/medical-v/upsert-medical-v'
import { cn } from '@/lib/utils'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface MedicalVTableProps {
    data: MedicalVData[]
    residents: Resident[]
    targetCount: number
    year: number
    month: number
    facilityId?: string
}

export function MedicalVTable({ data, residents, targetCount, year, month, facilityId }: MedicalVTableProps) {
    const [isPending, startTransition] = useTransition()
    const [localRows, setLocalRows] = useState(data)
    const [changedDates, setChangedDates] = useState<Set<string>>(new Set())

    useEffect(() => {
        setLocalRows(data)
        setChangedDates(new Set())
    }, [data])

    // Helper for calculation
    const calculateUnits = (nurseCount: number) => {
        const denom = targetCount > 0 ? targetCount : 1
        return Math.floor((500 * nurseCount) / denom)
    }

    const handleNurseCountChange = (date: string, valStr: string) => {
        const val = parseInt(valStr)
        const nurseCount = isNaN(val) ? 0 : val

        // Optimistic Update
        setLocalRows(prev => prev.map(row => {
            if (row.date === date) {
                return {
                    ...row,
                    nurse_count: nurseCount,
                    calculated_units: calculateUnits(nurseCount)
                }
            }
            return row
        }))
        setChangedDates(prev => new Set(prev).add(date))

        // Server Action Removed (Manual Save)

    }

    const handleCheckToggle = (date: string, residentId: string, currentVal: boolean) => {
        const newVal = !currentVal

        // Optimistic Update
        setLocalRows(prev => prev.map(row => {
            if (row.date === date) {
                return {
                    ...row,
                    records: {
                        ...row.records,
                        [residentId]: newVal
                    }
                }
            }
            return row
        }))
        setChangedDates(prev => new Set(prev).add(date))

        // Server Action Removed (Manual Save)

    }

    // Days mapping (1 to end of month)
    const days = localRows.map(r => {
        // Parse YYYY-MM-DD explicitly to avoid timezone issues
        const [yStr, mStr, dStr] = r.date.split('-')
        const y = parseInt(yStr, 10)
        const m = parseInt(mStr, 10) - 1
        const d = parseInt(dStr, 10)

        // Construct date in local time (00:00:00) so getDay() works for local user
        const dateObj = new Date(y, m, d)

        return {
            dateStr: r.date,
            dayCheck: d, // use the parsed day directly
            dayLabel: `${d}日 (${['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]})`
        }
    })

    const handleSave = () => {
        if (changedDates.size === 0) return

        startTransition(async () => {
            const promises: Promise<any>[] = []

            changedDates.forEach(date => {
                const row = localRows.find(r => r.date === date)
                if (!row) return

                // 1. Save Nurse Count & Daily Record
                const p1 = upsertMedicalVDaily(date, { nurse_count: row.nurse_count }, targetCount, facilityId)
                promises.push(p1)


                const initialRow = data.find(d => d.date === date)
                residents.forEach(r => {
                    const currentVal = !!row.records[r.id]
                    const initialVal = !!(initialRow?.records?.[r.id])

                    if (currentVal !== initialVal) {
                        promises.push(toggleMedicalVRecord(date, r.id, currentVal, facilityId))
                    }
                })
            })

            try {
                await Promise.all(promises)
                toast.success('保存しました')
                setChangedDates(new Set())
            } catch (e) {
                toast.error('保存に失敗しました')
            }
        })
    }

    return (
        <div className="relative w-full border rounded-md bg-white overflow-hidden flex flex-col h-[calc(100vh-250px)]">
            <div className="p-2 border-b bg-gray-50 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={changedDates.size === 0 || isPending}
                    className={cn(
                        "font-bold",
                        changedDates.size > 0 ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 text-gray-400"
                    )}
                >
                    {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {changedDates.size > 0 ? '変更を保存する' : '保存完了'}
                </Button>
            </div>
            <div className="overflow-auto flex-1 relative">
                <table className="border-collapse w-full text-xs min-w-[max-content]">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm font-bold">
                        <tr>
                            <th className="border p-2 sticky left-0 z-30 bg-gray-100 w-[100px] min-w-[100px] h-[50px]">日付</th>
                            <th className="border p-1 sticky left-[100px] z-30 bg-gray-100 w-[80px] min-w-[80px]">
                                <div className="text-[10px] leading-tight text-gray-500">指導</div>
                                看護師数
                            </th>
                            <th className="border p-1 sticky left-[180px] z-30 bg-gray-100 w-[80px] min-w-[80px] text-blue-700">
                                <div className="text-[10px] leading-tight text-blue-500">当日の</div>
                                単位数
                            </th>

                            {residents.map(r => (
                                <th key={r.id} className="border p-2 w-[110px] min-w-[110px] bg-white text-center font-normal">
                                    <div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">{r.name}</div>
                                    <div className="text-[9px] text-gray-400">{r.sputum_suction ? '★吸引対象' : ''}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {localRows.map((row) => {
                            const dayObj = days.find(d => d.dateStr === row.date)
                            const isWeekend = new Date(row.date).getDay() === 0 || new Date(row.date).getDay() === 6

                            return (
                                <tr key={row.date} className={cn("hover:bg-gray-50", isWeekend && "bg-slate-50")}>
                                    <td className="border p-2 sticky left-0 z-10 bg-gray-50 font-bold text-center">
                                        {dayObj?.dayLabel}
                                    </td>
                                    <td className="border p-2 sticky left-[100px] z-10 bg-white text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full text-center border rounded p-1"
                                            value={row.nurse_count}
                                            onChange={(e) => handleNurseCountChange(row.date, e.target.value)}
                                        />
                                    </td>
                                    <td className="border p-2 sticky left-[180px] z-10 bg-blue-50 text-center font-bold text-blue-800">
                                        {row.calculated_units.toLocaleString()}
                                    </td>

                                    {residents.map(r => (
                                        <td key={`${row.date}-${r.id}`} className="border p-2 text-center bg-white cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleCheckToggle(row.date, r.id, !!row.records[r.id])}
                                        >
                                            <div className="flex justify-center items-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 cursor-pointer"
                                                    checked={!!row.records[r.id]}
                                                    readOnly // handled by cell click
                                                />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {isPending && (
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-white/90 px-3 py-1 rounded shadow-md text-xs font-bold text-green-700 animate-in fade-in">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    保存中...
                </div>
            )}
        </div>
    )
}
