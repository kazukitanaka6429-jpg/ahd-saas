'use client'

import { Resident, ReportEntry } from '@/types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { saveReportEntry } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

interface ShortStayGridProps {
    residents: Resident[] // All available residents (including potential short stay)
    date: string
}

export function ShortStayGrid({ residents, date }: ShortStayGridProps) {
    // 4 slots for Short Stay
    const [slots, setSlots] = useState<Array<{ residentId: string | null }>>([
        { residentId: null },
        { residentId: null },
        { residentId: null },
        { residentId: null },
    ])

    // Load saved short stay usage?
    // In a real app, we should fetch report_entires for 'short_stay' residents on this date.
    // However, current schema doesn't distinguish "Short Stay Usage" explicitly unless we check 'status' of resident or specific flag.
    // For now, let's keep it simple: UI allows selecting ANY resident (or filtering for short stay status).
    // And if data exists for them on this date, show it.

    // BUT, the requirement says "4 fixed rows". 
    // This implies we need to store "Who is in Slot 1?" somewhere, OR just query ALL report_entries for this date
    // and filter out those who are "in_facility" (regular). The rest are likely short stay.

    // For this prototype, we'll initialize slots with residents who have entries but are NOT in the main list,
    // plus empty slots up to 4.

    // This logic requires fetching entries first, which we assume are passed or we fetch client side?
    // Let's implement basic inputs first.

    // Helper to handle saving
    const handleSave = async (residentId: string, column: string, value: any) => {
        if (!residentId) return
        try {
            await saveReportEntry(date, residentId, column, value)
            // success, silent update
        } catch (error) {
            toast.error('保存に失敗しました')
        }
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-700">■ ショートステイ利用（最大4名）</h3>
            </div>
            <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[180px] min-w-[180px] sticky left-0 bg-gray-50 z-10 font-bold text-gray-700">利用者名</TableHead>
                            <TableHead className="w-[80px] text-center">測定時間</TableHead>
                            <TableHead className="w-[120px] text-center">血圧(上/下)</TableHead>
                            <TableHead className="w-[60px] text-center">脈拍</TableHead>
                            <TableHead className="w-[60px] text-center">体温</TableHead>
                            <TableHead className="w-[150px] text-center">食事(朝/昼/夕)</TableHead>
                            <TableHead className="w-[180px] text-center">服薬(朝/昼/夕)</TableHead>
                            <TableHead className="w-[100px] text-center">入浴</TableHead>
                            <TableHead className="w-[80px] text-center">排便</TableHead>
                            <TableHead className="w-[80px] text-center">排尿</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* 4 Fixed Rows */}
                        {slots.map((slot, index) => (
                            <TableRow key={index} className="hover:bg-gray-50/50">
                                <TableCell className="sticky left-0 bg-white z-10 p-2 border-r">
                                    <Select
                                        onValueChange={(val) => {
                                            const newSlots = [...slots]
                                            newSlots[index].residentId = val
                                            setSlots(newSlots)
                                        }}
                                        value={slot.residentId || ''}
                                    >
                                        <SelectTrigger className="w-full h-8">
                                            <SelectValue placeholder="利用者を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {residents.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>

                                {/* Only show inputs if resident selected */}
                                {slot.residentId ? (
                                    <>
                                        <TableCell className="p-1 text-center">
                                            <Input type="time" className="h-8 w-20 mx-auto"
                                                onChange={(e) => handleSave(slot.residentId!, 'measurement_time', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <div className="flex items-center justify-center gap-1">
                                                <Input type="number" className="h-8 w-12 text-center" placeholder="上"
                                                    onChange={(e) => handleSave(slot.residentId!, 'blood_pressure_systolic', e.target.value)}
                                                />
                                                <span className="text-gray-400">/</span>
                                                <Input type="number" className="h-8 w-12 text-center" placeholder="下"
                                                    onChange={(e) => handleSave(slot.residentId!, 'blood_pressure_diastolic', e.target.value)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-1 text-center">
                                            <Input type="number" className="h-8 w-14 mx-auto"
                                                onChange={(e) => handleSave(slot.residentId!, 'pulse', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1 text-center">
                                            <Input type="number" step="0.1" className="h-8 w-14 mx-auto"
                                                onChange={(e) => handleSave(slot.residentId!, 'temperature', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <div className="flex items-center justify-center gap-1">
                                                <Input type="number" max={10} className="h-8 w-10 text-center px-1" placeholder="朝"
                                                    onChange={(e) => handleSave(slot.residentId!, 'meal_morning', e.target.value)}
                                                />
                                                <Input type="number" max={10} className="h-8 w-10 text-center px-1" placeholder="昼"
                                                    onChange={(e) => handleSave(slot.residentId!, 'meal_lunch', e.target.value)}
                                                />
                                                <Input type="number" max={10} className="h-8 w-10 text-center px-1" placeholder="夕"
                                                    onChange={(e) => handleSave(slot.residentId!, 'meal_dinner', e.target.value)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-1">
                                            <div className="flex items-center justify-center gap-2">
                                                <Checkbox onCheckedChange={(c) => handleSave(slot.residentId!, 'medication_morning', c ? 'avail' : null)} />
                                                <Checkbox onCheckedChange={(c) => handleSave(slot.residentId!, 'medication_lunch', c ? 'avail' : null)} />
                                                <Checkbox onCheckedChange={(c) => handleSave(slot.residentId!, 'medication_dinner', c ? 'avail' : null)} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-1 text-center">
                                            <Select onValueChange={(val) => handleSave(slot.residentId!, 'bath_type', val)}>
                                                <SelectTrigger className="h-8 w-24 mx-auto"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-</SelectItem>
                                                    <SelectItem value="general">一般浴</SelectItem>
                                                    <SelectItem value="special">機械浴</SelectItem>
                                                    <SelectItem value="shower">シャワー</SelectItem>
                                                    <SelectItem value="wipe">清拭</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="p-1 text-center">
                                            <Input className="h-8 w-16 mx-auto"
                                                onChange={(e) => handleSave(slot.residentId!, 'bowel_movement_count', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-1 text-center">
                                            <Input className="h-8 w-16 mx-auto"
                                                onChange={(e) => handleSave(slot.residentId!, 'urination_count', e.target.value)}
                                            />
                                        </TableCell>
                                    </>
                                ) : (
                                    <TableCell colSpan={9} className="text-center text-gray-400 text-sm py-2">
                                        利用者を選択してください
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
