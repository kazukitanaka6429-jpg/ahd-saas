'use client'

import React, { useState, useEffect } from 'react'
import { Staff, DailyShift } from '@/types'
import { upsertDailyShift } from '@/app/actions/shift'
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
    facilityId: string
}

export function StaffShiftGrid({ staffs, initialData, date, facilityId }: StaffShiftGridProps) {
    const { registerSaveNode, unregisterSaveNode, triggerGlobalSave, isSaving: isGlobalSaving, setSharedState } = useGlobalSave()

    const [shiftData, setShiftData] = useState<Partial<DailyShift>>(initialData || {
        day_staff_ids: [],
        night_staff_ids: [],
        night_shift_plus: false
    })

    // Publish night staff count AND night_shift_plus to shared state for validation
    useEffect(() => {
        const nightStaffCount = (shiftData.night_staff_ids || []).filter(id => id && id !== '').length
        setSharedState('nightStaffCount', nightStaffCount)
        setSharedState('nightShiftPlus', !!shiftData.night_shift_plus)
    }, [shiftData.night_staff_ids, shiftData.night_shift_plus, setSharedState])

    // Register Save Function
    useEffect(() => {
        const id = 'staff-shift-grid'
        registerSaveNode(id, async () => {
            // Clean up arrays before saving (compact them)
            const cleanArray = (arr: any[]) => (arr || []).filter(x => x && x !== '')

            const payload = {
                ...shiftData,
                day_staff_ids: cleanArray(shiftData.day_staff_ids as any[]),
                night_staff_ids: cleanArray(shiftData.night_staff_ids as any[]),
            }

            const result = await upsertDailyShift(date, payload, facilityId)
            if (result?.error) {
                console.error("Shift save failed", result.error)
                // throw new Error(result.error) // Removed to prevent crash
                toast.error(`保存に失敗しました: ${result.error}`)
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

        const updated = { ...shiftData, [key]: newIds }
        setShiftData(updated)
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

    // Get facility-level validation errors
    const nightShiftPlus = !!shiftData.night_shift_plus
    const nightStaffCount = (shiftData.night_staff_ids || []).filter(id => id && id !== '').length
    const hasFacilityError = nightShiftPlus && nightStaffCount < 4
    const hasFacilityWarning = !nightShiftPlus && nightStaffCount >= 4

    return (
        <div className="mb-6">
            {/* Facility-level error banner */}
            {hasFacilityError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mb-2 rounded flex items-start gap-2">
                    <span className="font-bold shrink-0">⚠️ エラー:</span>
                    <span className="text-sm">夜勤職員が4名未満のため、夜勤加配は算定できません。夜勤加配のチェックを外すか、夜勤職員を追加してください。</span>
                </div>
            )}

            {/* Facility-level warning banner */}
            {hasFacilityWarning && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 mb-2 rounded flex items-start gap-2">
                    <span className="font-bold shrink-0">⚠️ 確認:</span>
                    <span className="text-sm">夜勤職員が4名以上配置されていますが、夜勤加配がOFFになっています。チェック漏れはありませんか？</span>
                </div>
            )}

            <div className="flex items-start gap-4">
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

                    {/* Night Shift */}
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
                <option value={value}>Unknown Staff</option>
            )}
            {value && <option value="remove" className="text-red-500">解除</option>}
        </select>
    )
}
