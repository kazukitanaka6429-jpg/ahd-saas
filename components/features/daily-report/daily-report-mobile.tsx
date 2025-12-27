'use client'

import { Resident, DailyRecord } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { upsertDailyRecordsBulk } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from "sonner"
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from 'lucide-react'

// Constants shared with Grid
const MEASUREMENT_TIME_OPTIONS = ['朝', '昼', '夕']
const MEAL_INTAKE_OPTIONS = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0']
const MEDICATION_OPTIONS = ['全', '一', '×']
const BATH_TYPE_OPTIONS = ['一', '機', '清']
const EXCRETION_OPTIONS = ['1', '2', '3', '4', '5+', '多']

export function DailyReportMobileList({
    residents,
    date
}: {
    residents: Resident[]
    date: string
}) {
    const [entries, setEntries] = useState<Record<string, Record<string, any>>>({})

    useEffect(() => {
        const fetchEntries = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('daily_records')
                .select('*')
                .eq('date', date)

            const entryMap: Record<string, Record<string, any>> = {}
            data?.forEach((record: DailyRecord) => {
                entryMap[record.resident_id] = record.data || {}
            })
            setEntries(entryMap)
        }
        fetchEntries()
    }, [date])

    const handleSave = async (residentId: string, column: string, value: any) => {
        // Optimistic Update
        setEntries(prev => {
            const currentData = prev[residentId] || {}
            return {
                ...prev,
                [residentId]: {
                    ...currentData,
                    [column]: value
                }
            }
        })

        // Server Action
        try {
            await upsertDailyRecordsBulk([{
                resident_id: residentId,
                date: date,
                data: { [column]: value }
            }])
        } catch (error) {
            toast.error('保存に失敗しました')
            // Revert state if needed (skipped for simplicity in MVP)
        }
    }

    return (
        <div className="space-y-4">
            {residents.map((resident) => {
                const entry = entries[resident.id] || {}
                return (
                    <ResidentMobileCard
                        key={resident.id}
                        resident={resident}
                        entry={entry}
                        onSave={handleSave}
                    />
                )
            })}
        </div>
    )
}

function ResidentMobileCard({ resident, entry, onSave }: any) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CollapsibleTrigger>
                            <CardTitle className="text-base font-bold">
                                {resident.name}
                            </CardTitle>
                            {resident.care_level && (
                                <Badge variant="secondary" className="text-xs">{resident.care_level}</Badge>
                            )}
                        </div>
                        {/* Summary Badges (e.g. show vital taken) */}
                        <div className="flex gap-1">
                            {entry.blood_pressure_systolic && (
                                <Badge variant="outline" className="text-xs bg-green-50">バイタル済</Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="p-4 space-y-4 pt-0">
                        {/* 1. Vitals */}
                        <div className="bg-gray-50 p-3 rounded-md space-y-3">
                            <h4 className="text-xs font-bold text-gray-500">バイタル測定</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs block mb-1">時間</label>
                                    <Select
                                        value={entry.measurement_time}
                                        onValueChange={(val) => onSave(resident.id, 'measurement_time', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MEASUREMENT_TIME_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="flex-1">
                                        <label className="text-xs block mb-1">血圧(上)</label>
                                        <input
                                            type="number"
                                            className="w-full text-xs p-1 border rounded h-8"
                                            value={entry.blood_pressure_systolic || ''}
                                            onChange={(e) => onSave(resident.id, 'blood_pressure_systolic', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs block mb-1">(下)</label>
                                        <input
                                            type="number"
                                            className="w-full text-xs p-1 border rounded h-8"
                                            value={entry.blood_pressure_diastolic || ''}
                                            onChange={(e) => onSave(resident.id, 'blood_pressure_diastolic', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs block mb-1">脈拍</label>
                                    <input
                                        type="number"
                                        className="w-full text-xs p-1 border rounded h-8"
                                        value={entry.pulse || ''}
                                        onChange={(e) => onSave(resident.id, 'pulse', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs block mb-1">体温</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full text-xs p-1 border rounded h-8"
                                        value={entry.temperature || ''}
                                        onChange={(e) => onSave(resident.id, 'temperature', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Meals & Meds */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500">食事・服薬</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs block mb-1 text-center">朝食</label>
                                    <Select
                                        value={entry.meal_morning}
                                        onValueChange={(val) => onSave(resident.id, 'meal_morning', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>{MEAL_INTAKE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs block mb-1 text-center">昼食</label>
                                    <Select
                                        value={entry.meal_lunch}
                                        onValueChange={(val) => onSave(resident.id, 'meal_lunch', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>{MEAL_INTAKE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs block mb-1 text-center">夕食</label>
                                    <Select
                                        value={entry.meal_dinner}
                                        onValueChange={(val) => onSave(resident.id, 'meal_dinner', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>{MEAL_INTAKE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-4 p-2 bg-yellow-50 rounded">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`med-${resident.id}`}
                                        checked={entry.medication_morning === '全'}
                                        onCheckedChange={(c) => onSave(resident.id, 'medication_morning', c ? '全' : null)}
                                    />
                                    <label htmlFor={`med-${resident.id}`} className="text-xs">服薬確認</label>
                                </div>
                            </div>
                        </div>

                        {/* 3. Bath & Excretion */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500">入浴・排泄</h4>
                            <div className="flex gap-2">
                                <div className="w-1/3">
                                    <label className="text-xs block mb-1">入浴</label>
                                    <Select
                                        value={entry.bath_type}
                                        onValueChange={(val) => onSave(resident.id, 'bath_type', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>{BATH_TYPE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs block mb-1">排便(回)</label>
                                    <Select
                                        value={entry.bowel_movement_count}
                                        onValueChange={(val) => onSave(resident.id, 'bowel_movement_count', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>{EXCRETION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-1/3">
                                    <label className="text-xs block mb-1">排尿(回)</label>
                                    <Select
                                        value={entry.urination_count}
                                        onValueChange={(val) => onSave(resident.id, 'urination_count', val)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                        <SelectContent>{EXCRETION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}
