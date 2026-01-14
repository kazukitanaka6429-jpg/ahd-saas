'use client'

import { memo } from 'react'
import {
    TableCell,
    TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { MedicalVData } from '@/app/actions/medical-v/get-medical-v-data' // Ensure path is correct

// Helper: Check if date is a Japanese holiday
import holiday_jp from '@holiday-jp/holiday_jp'
const isHoliday = (date: Date): boolean => {
    return holiday_jp.isHoliday(date)
}

// Helper: Get day type
const getDayType = (date: Date): 'weekday' | 'saturday' | 'sunday' | 'holiday' => {
    if (isHoliday(date)) return 'holiday'
    const day = date.getDay()
    if (day === 0) return 'sunday'
    if (day === 6) return 'saturday'
    return 'weekday'
}

// Helper: Text color
const getDateTextColor = (dayType: 'weekday' | 'saturday' | 'sunday' | 'holiday'): string => {
    switch (dayType) {
        case 'saturday': return 'text-blue-600'
        case 'sunday': return 'text-red-600'
        case 'holiday': return 'text-red-600'
        default: return 'text-slate-900'
    }
}

// Helper: Admission check
const isBeforeAdmission = (dateStr: string, resident: any): boolean => {
    if (!resident.start_date) return false
    const cellDate = new Date(dateStr)
    const admissionDate = new Date(resident.start_date)
    cellDate.setHours(0, 0, 0, 0)
    admissionDate.setHours(0, 0, 0, 0)
    return cellDate < admissionDate
}

interface Props {
    row: MedicalVData
    month: number
    residents: any[]
    isDailyDirty: boolean
    dirtyRecordIdsStr: string // Comma separated IDs of dirty cells
    targetCount: number // Needed for units calc optimization display
    onDailyUpdate: (date: string, value: string) => void
    onToggle: (date: string, residentId: string, currentVal: boolean, resident: any) => void
    // Optional: Finding comments on date column
    onDateContextMenu?: (e: React.MouseEvent, dailyId: string | undefined, dateLabel: string) => void
    hasFinding?: boolean // Show red indicator on date column
}

const MedicalVRowComponent = ({
    row,
    month,
    residents,
    isDailyDirty,
    dirtyRecordIdsStr,
    targetCount,
    onDailyUpdate,
    onToggle,
    onDateContextMenu,
    hasFinding = false
}: Props) => {
    const d = new Date(row.date)
    const dayNum = d.getDate()
    const dayType = getDayType(d)
    const textColor = getDateTextColor(dayType)

    // Parse dirty IDs for O(1) lookup? Or just includes?
    // String "id1,id2" includes "id1". Safe enough for UUIDs? Yes.
    // Or split to set? String is passed for memo stability. 
    // Splitting here is cheap (per row render).
    const dirtySet = new Set(dirtyRecordIdsStr ? dirtyRecordIdsStr.split(',') : [])

    // Units Logic
    const getEstimatedUnits = (nurseCount: number) => {
        const tc = targetCount <= 0 ? 1 : targetCount
        return Math.floor((500 * nurseCount) / tc)
    }

    const displayUnits = isDailyDirty ? getEstimatedUnits(row.nurse_count) : row.calculated_units

    const bgColor = dayType === 'saturday' ? 'bg-blue-50'
        : (dayType === 'sunday' || dayType === 'holiday') ? 'bg-red-50'
            : 'bg-white'

    return (
        <TableRow className="hover:bg-slate-50 h-10 group">
            {/* Date Column */}
            <TableCell
                className={`sticky left-0 z-20 border-r border-b text-center font-bold text-base p-1 relative cursor-pointer ${bgColor} ${textColor}`}
                onContextMenu={(e) => {
                    if (onDateContextMenu) {
                        e.preventDefault()
                        onDateContextMenu(e, row.dailyId, `${month}/${dayNum}`)
                    }
                }}
            >
                {month}/{dayNum}
                {dayType === 'holiday' && <span className="text-xs ml-1">祝</span>}
                {hasFinding && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full pointer-events-none" />
                )}
            </TableCell>

            {/* Nurse Count Input */}
            <TableCell className={`sticky left-[100px] z-20 border-r border-b p-0 ${isDailyDirty ? 'bg-amber-50' : 'bg-white'}`}>
                <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-12 w-full border-none border-b border-r-0 border-t-0 border-l-0 text-center text-lg font-medium focus-visible:ring-2 focus-visible:ring-amber-400 rounded-none bg-transparent shadow-none"
                    value={row.nurse_count || ''}
                    onChange={(e) => onDailyUpdate(row.date, e.target.value)}
                />
            </TableCell>

            {/* Units Display */}
            <TableCell className="sticky left-[200px] z-20 border-r border-b text-center text-lg font-medium p-0 bg-white text-slate-700">
                {displayUnits}
            </TableCell>

            {/* Resident Checkboxes */}
            {residents?.map(r => {
                const isChecked = row.records[r.id] || false
                const isCellDirty = dirtySet.has(r.id)
                const isDisabled = isBeforeAdmission(row.date, r)

                return (
                    <TableCell
                        key={r.id}
                        className={`p-0 border-r border-b text-center h-10 w-[70px] transition-colors ${isCellDirty ? 'bg-amber-50' : ''
                            } ${isDisabled ? 'bg-slate-100' : ''} group-hover:bg-slate-50`}
                        title={isDisabled ? `入居日: ${r.start_date}` : ''}
                    >
                        <div className="flex items-center justify-center h-full w-full">
                            <Checkbox
                                checked={isChecked}
                                disabled={isDisabled}
                                onCheckedChange={() => onToggle(row.date, r.id, isChecked, r)}
                                className={`h-5 w-5 border-2 rounded transition-colors ${isDisabled
                                    ? 'border-slate-300 bg-slate-200 cursor-not-allowed opacity-50'
                                    : isChecked
                                        ? 'bg-amber-500 border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white'
                                        : 'border-slate-300 hover:border-amber-400'
                                    }`}
                            />
                        </div>
                    </TableCell>
                )
            })}
        </TableRow>
    )
}

export const MedicalVRow = memo(MedicalVRowComponent)
