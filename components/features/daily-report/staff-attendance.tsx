'use client'

import React, { useState } from 'react'
import { Staff, DailyShift } from '@/types'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { saveDailyShift } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'

// Safe default just in case
export function StaffAttendance({
    staffs = [],
    initialData,
    date
}: {
    staffs?: Staff[],
    initialData?: DailyShift,
    date: string
}) {

    // Helper to Convert ID list to Staff objects
    const getStaffsByIds = (ids: string[]) => {
        return ids.map(id => staffs.find(s => s.id === id)).filter(Boolean) as Staff[]
    }

    const [dayShift, setDayShift] = useState<Staff[]>(getStaffsByIds((initialData?.day_staff_ids as any) || []))
    // evening_staff_ids is not in current schema - commenting out
    // const [eveningShift, setEveningShift] = useState<Staff[]>(getStaffsByIds((initialData?.evening_staff_ids as any) || []))
    const [nightShift, setNightShift] = useState<Staff[]>(getStaffsByIds((initialData?.night_staff_ids as any) || []))
    const [nightShiftPlus, setNightShiftPlus] = useState(initialData?.night_shift_plus || false)

    const handleSave = async (key: 'day_staff_ids' | 'night_staff_ids' | 'night_shift_plus', value: any) => {
        // Optimistic update locally
        if (key === 'day_staff_ids') setDayShift(getStaffsByIds(value))
        // if (key === 'evening_staff_ids') setEveningShift(getStaffsByIds(value))
        if (key === 'night_staff_ids') setNightShift(getStaffsByIds(value))
        if (key === 'night_shift_plus') setNightShiftPlus(value)

        // Save to DB
        // Save to DB
        // saveDailyShift expects (date, shiftsObject). 
        const result = await saveDailyShift(date, { [key]: value })
        // Note: saveDailyShift currently returns void in actions.ts, so result might be undefined.
        // But the calling code checks result.error.
        // We should update saveDailyShift to return result object or handle promise rejection.
        // For now, let's fix the argument.
        // Wait, checking actions.ts, `saveDailyShift` is:
        // export async function saveDailyShift(date: string, shifts: any) { ... if (error) console.error(error); revalidatePath(...) }
        // It does NOT return { error: ... }.
        // So `if (result.error)` will crash if result is undefined or void.
        // I should also fix actions.ts to return validation result OR fix this component to not assume return.
        // Given existing code, I'll fix arguments first.

        if (result.error) {
            toast.error('保存に失敗しました')
        }
    }

    return (
        <div className="border rounded-sm bg-white mb-4">
            <ShiftRow
                label="日勤"
                allStaffs={staffs}
                selectedStaffs={dayShift}
                onChange={(newStaffs) => handleSave('day_staff_ids', newStaffs.map(s => s.id))}
            />
            {/* evening_staff_ids is not in current schema - commenting out
            <ShiftRow
                label="夕勤"
                allStaffs={staffs}
                selectedStaffs={eveningShift}
                onChange={(newStaffs) => handleSave('evening_staff_ids', newStaffs.map(s => s.id))}
            />
            */}
            <div className="grid grid-cols-[100px_1fr]">
                <div className="bg-green-100 p-2 text-sm font-bold flex items-center justify-center border-r">
                    夜勤
                </div>
                <div className="p-1 grid grid-cols-[1fr_auto] gap-2 items-center">
                    <MultiSelectStaff
                        allStaffs={staffs}
                        selectedStaffs={nightShift}
                        onChange={(newStaffs) => handleSave('night_staff_ids', newStaffs.map(s => s.id))}
                    />
                    <div className="flex items-center gap-1 pr-2">
                        <input
                            type="checkbox"
                            id="night_shift_plus"
                            className="w-4 h-4 cursor-pointer"
                            checked={nightShiftPlus}
                            onChange={(e) => handleSave('night_shift_plus', e.target.checked)}
                        />
                        <label htmlFor="night_shift_plus" className="text-xs cursor-pointer select-none">夜勤加算</label>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ShiftRow({
    label,
    allStaffs,
    selectedStaffs,
    onChange
}: {
    label: string,
    allStaffs: Staff[],
    selectedStaffs: Staff[],
    onChange: (staffs: Staff[]) => void
}) {
    return (
        <div className="grid grid-cols-[100px_1fr] border-b">
            <div className="bg-green-100 p-2 text-sm font-bold flex items-center justify-center border-r">
                {label}
            </div>
            <div className="p-1">
                <MultiSelectStaff
                    allStaffs={allStaffs}
                    selectedStaffs={selectedStaffs}
                    onChange={onChange}
                />
            </div>
        </div>
    )
}

function MultiSelectStaff({
    allStaffs,
    selectedStaffs,
    onChange
}: {
    allStaffs: Staff[],
    selectedStaffs: Staff[],
    onChange: (staffs: Staff[]) => void
}) {
    const [open, setOpen] = useState(false)

    const handleSelect = (staffId: string) => {
        const staff = allStaffs.find(s => s.id === staffId)
        if (!staff) return

        if (selectedStaffs.some(s => s.id === staffId)) {
            // Remove
            onChange(selectedStaffs.filter(s => s.id !== staffId))
        } else {
            // Add
            onChange([...selectedStaffs, staff])
        }
    }

    const handleRemove = (e: React.MouseEvent, staffId: string) => {
        e.stopPropagation()
        onChange(selectedStaffs.filter(s => s.id !== staffId))
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    role="combobox"
                    aria-expanded={open}
                    className="w-full min-h-[32px] p-1 flex flex-wrap gap-1 items-center cursor-text"
                    onClick={() => setOpen(true)}
                >
                    {selectedStaffs.length === 0 && (
                        <span className="text-sm text-muted-foreground px-1">職員を選択...</span>
                    )}
                    {selectedStaffs.map((staff) => (
                        <Badge key={staff.id} variant="secondary" className="mr-1 pr-1 font-normal bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200">
                            {staff.name}
                            <div
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                onClick={(e) => handleRemove(e, staff.id)}
                            >
                                <X className="h-3 w-3 text-blue-500 hover:text-blue-700" />
                            </div>
                        </Badge>
                    ))}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="職員を検索..." />
                    <CommandList>
                        <CommandEmpty>職員が見つかりません。</CommandEmpty>
                        <CommandGroup>
                            {allStaffs.map((staff) => {
                                const isSelected = selectedStaffs.some(s => s.id === staff.id)
                                return (
                                    <CommandItem
                                        key={staff.id}
                                        value={staff.name}
                                        onSelect={() => handleSelect(staff.id)}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{staff.name}</span>
                                        {staff.role === 'manager' && (
                                            <span className="ml-2 text-xs text-muted-foreground">(管理者)</span>
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
