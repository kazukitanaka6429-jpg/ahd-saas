
'use client'

import React, { useState } from 'react'
import { Staff, DailyShift } from '@/types'
import { saveDailyShift } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface StaffShiftGridProps {
    staffs: Staff[]
    initialData?: DailyShift
    date: string
}

export function StaffShiftGrid({ staffs, initialData, date }: StaffShiftGridProps) {
    const [shiftData, setShiftData] = useState<Partial<DailyShift>>(initialData || {
        day_staff_ids: [],
        evening_staff_ids: [],
        night_staff_ids: [],
        night_shift_plus: false
    })

    const handleStaffChange = async (shiftType: 'day' | 'evening' | 'night', index: number, staffId: string) => {
        const key = `${shiftType}_staff_ids` as keyof DailyShift
        const currentIds = (shiftData[key] as string[]) || []
        const newIds = [...currentIds]

        // Ensure array has enough size (pad with null/empty if needed, but here we just assign by index)
        // If index is 3, 0..2 must exist? Not necessarily for string[], but we treat it as sparse or fixed size.
        // Let's ensure it's length 4.
        while (newIds.length < 4) newIds.push('')

        newIds[index] = staffId === 'remove' ? '' : staffId

        // Filter out empty strings before saving? 
        // Spec says 3x4 grid. If we save as clean array, we lose position?
        // Actually, for "Display", we need to know "Slot 1, Slot 2". 
        // If we save `['id1', 'id2']`, next time Slot 1=id1, Slot 2=id2, Slot 3=empty.
        // It's acceptable to compact the array on save, as long as UI fills slots 1..4.
        const compactedIds = newIds.filter(id => id && id !== '')

        // Update Local State (keep sparse for UI? No, Select just shows value. 
        // If we compact, "Slot 3" value might jump to "Slot 2" if Slot 2 was removed.
        // User might expect fixed slots. 
        // BUT DB schema is `text[]`. It doesn't store "index 0 is null".
        // Compromise: We save compacted array. UI always fills first available slots. 
        // If user clears slot 2, slot 3 shifts to slot 2. 
        // Ideally we'd store jsonb with slots, but schema is simple array.
        // Let's stick to compacted array behavior (queue behavior). 

        const updated = { ...shiftData, [key]: compactedIds }
        setShiftData(updated)

        const result = await saveDailyShift(date, { [key]: compactedIds })
        if (result?.error) {
            toast.error('保存に失敗しました')
        }
    }

    const handleNightShiftPlus = async (checked: boolean) => {
        const updated = { ...shiftData, night_shift_plus: checked }
        setShiftData(updated)
        await saveDailyShift(date, { night_shift_plus: checked })
    }

    // Helper to get staff ID at visual index (padded)
    const getStaffIdAt = (shiftType: 'day' | 'evening' | 'night', index: number) => {
        const key = `${shiftType}_staff_ids` as keyof DailyShift
        const ids = (shiftData[key] as string[]) || []
        return ids[index] || ''
    }

    return (
        <div className="border border-black bg-white mb-6">
            {/* Header / Title if needed? No, just the grid. */}

            <div className="grid grid-cols-[80px_1fr] border-b border-black">
                {/* Day Shift */}
                <div className="bg-green-100 flex items-center justify-center font-bold border-r border-black p-2 text-sm">
                    日勤
                </div>
                <div className="grid grid-cols-4 divide-x divide-black">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="p-1">
                            <StaffSelect
                                staffs={staffs}
                                value={getStaffIdAt('day', i)}
                                onChange={(val) => handleStaffChange('day', i, val)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-[80px_1fr] border-b border-black">
                {/* Evening Shift */}
                <div className="bg-green-100 flex items-center justify-center font-bold border-r border-black p-2 text-sm">
                    夕勤
                </div>
                <div className="grid grid-cols-4 divide-x divide-black">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="p-1">
                            <StaffSelect
                                staffs={staffs}
                                value={getStaffIdAt('evening', i)}
                                onChange={(val) => handleStaffChange('evening', i, val)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-[80px_1fr]">
                {/* Night Shift */}
                <div className="bg-green-100 flex items-center justify-center font-bold border-r border-black p-2 text-sm">
                    夜勤
                </div>
                <div className="grid grid-cols-[1fr_100px] divide-x divide-black">
                    <div className="grid grid-cols-4 divide-x divide-black">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="p-1">
                                <StaffSelect
                                    staffs={staffs}
                                    value={getStaffIdAt('night', i)}
                                    onChange={(val) => handleStaffChange('night', i, val)}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Night Shift Plus Checkbox */}
                    <div className="flex flex-col items-center justify-center p-2 bg-yellow-50">
                        <label htmlFor="night_plus" className="text-xs font-bold mb-1 cursor-pointer">夜勤加配</label>
                        <Checkbox
                            id="night_plus"
                            checked={!!shiftData.night_shift_plus}
                            onCheckedChange={handleNightShiftPlus}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function StaffSelect({ staffs, value, onChange }: { staffs: Staff[], value: string, onChange: (val: string) => void }) {
    return (
        <select
            className="w-full h-8 px-1 text-sm bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">(未選択)</option>
            {staffs.map(s => (
                <option key={s.id} value={s.id}>
                    {s.name}
                </option>
            ))}
            {value && !staffs.find(s => s.id === value) && (
                <option value={value}>Unkown Staff</option>
            )}
            {value && <option value="remove" className="text-red-500">解除</option>}
        </select>
    )
}
