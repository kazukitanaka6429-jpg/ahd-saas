'use client'

import React, { useState, useEffect } from 'react'
import { Staff, DailyShift } from '@/types'
import { saveDailyShift } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useGlobalSave } from '@/components/providers/global-save-context'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'

interface StaffShiftGridProps {
    staffs: Staff[]
    initialData?: DailyShift
    date: string
}

export function StaffShiftGrid({ staffs, initialData, date }: StaffShiftGridProps) {
    const { registerSaveNode, unregisterSaveNode, triggerGlobalSave, isSaving: isGlobalSaving } = useGlobalSave()

    const [shiftData, setShiftData] = useState<Partial<DailyShift>>(initialData || {
        day_staff_ids: [],
        evening_staff_ids: [],
        night_staff_ids: [],
        night_shift_plus: false
    })

    // Register Save Function
    useEffect(() => {
        const id = 'staff-shift-grid'
        registerSaveNode(id, async () => {
            // Clean up arrays before saving (compact them)
            const cleanArray = (arr: any[]) => (arr || []).filter(x => x && x !== '')

            const payload = {
                ...shiftData,
                day_staff_ids: cleanArray(shiftData.day_staff_ids as any[]),
                evening_staff_ids: cleanArray(shiftData.evening_staff_ids as any[]),
                night_staff_ids: cleanArray(shiftData.night_staff_ids as any[]),
            }

            const result = await saveDailyShift(date, payload)
            if (result?.error) {
                console.error("Shift save failed", result.error)
                throw new Error("Shift save failed")
            }
        })
        return () => unregisterSaveNode(id)
    }, [registerSaveNode, unregisterSaveNode, shiftData, date])

    const handleStaffChange = async (shiftType: 'day' | 'night', index: number, staffId: string) => {
        const key = `${shiftType}_staff_ids` as keyof DailyShift
        const currentIds = (shiftData[key] as string[]) || []
        const newIds = [...currentIds]
        while (newIds.length < 4) newIds.push('')
        newIds[index] = staffId === 'remove' ? '' : staffId

        // We update state immediately but DO NOT convert to compacted array yet to keep UI stable
        // The compaction happens on Save or re-render from server ? 
        // We'll keep it as is in state.

        const updated = { ...shiftData, [key]: newIds }
        setShiftData(updated)
        // Note: No auto-save on change anymore, relies on Global Save button
    }

    const handleNightShiftPlus = (checked: boolean) => {
        setShiftData(prev => ({ ...prev, night_shift_plus: checked }))
    }

    const onManualSave = async () => {
        await triggerGlobalSave()
    }

    // Helper to get staff ID at visual index (padded)
    const getStaffIdAt = (shiftType: 'day' | 'night', index: number) => {
        const key = `${shiftType}_staff_ids` as keyof DailyShift
        const ids = (shiftData[key] as string[]) || []
        return ids[index] || ''
    }

    return (
        <div className="flex items-start gap-4 mb-6">
            <div className="border border-black bg-white">
                {/* Day Shift */}
                <div className="grid grid-cols-[80px_1fr] border-b border-black">
                    <div className="bg-green-100 flex items-center justify-center font-bold border-r border-black p-2 text-sm">
                        日勤
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-black w-[400px]">
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

                {/* Night Shift (Use "night" key data) */}
                <div className="grid grid-cols-[80px_1fr]">
                    <div className="bg-green-100 flex items-center justify-center font-bold border-r border-black p-2 text-sm">
                        夜勤
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-black w-[400px]">
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
                </div>
            </div>

            {/* Controls Outside Frame */}
            <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-white">
                    <Checkbox
                        id="night_plus"
                        checked={!!shiftData.night_shift_plus}
                        onCheckedChange={handleNightShiftPlus}
                        className="w-5 h-5 accent-green-600"
                    />
                    <label htmlFor="night_plus" className="text-sm font-bold cursor-pointer">夜勤加配</label>
                </div>

                <Button onClick={onManualSave} disabled={isGlobalSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 w-full">
                    {isGlobalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    保存
                </Button>
            </div>
        </div>
    )
}

function StaffSelect({ staffs, value, onChange }: { staffs: Staff[], value: string, onChange: (val: string) => void }) {
    return (
        <select
            className="w-full h-8 px-1 text-sm bg-transparent border-none outline-none focus:ring-0 cursor-pointer text-center"
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
