'use client'

import { useState, useTransition, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Resident, Staff, MedicalCooperationRecord } from '@/types'
import { saveMedicalCooperationRecordsBulk } from '@/app/(dashboard)/medical-cooperation/actions'
import { toast } from 'sonner'
import { getDaysInMonth } from 'date-fns'
import { Loader2, Save } from 'lucide-react'
import { FindingSheet } from '../daily-report/finding-sheet'

interface Props {
    residents: Resident[]
    nurses: Staff[]
    records: MedicalCooperationRecord[]
    currentDate: string // YYYY-MM-DD
    findingsIndicators?: Record<string, string[]>
}

export function MedicalCooperationGrid({ residents, nurses, records, currentDate, findingsIndicators = {} }: Props) {
    // Generate days for the selected month
    const dateObj = new Date(currentDate)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth()
    const daysCount = getDaysInMonth(dateObj)
    const days = Array.from({ length: daysCount }, (_, i) => i + 1)

    // Local State for Optimistic UI
    const [localRecords, setLocalRecords] = useState(records)
    const [pendingChanges, setPendingChanges] = useState<Map<string, { residentId: string, date: string, staffId: string }>>(new Map())
    const [isSaving, setIsSaving] = useState(false)

    // Finding State
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        recordId: string | null
        jsonPath: string | null
        label: string
    }>({ isOpen: false, recordId: null, jsonPath: null, label: '' })

    // Sync records when props change (revalidation)
    useEffect(() => {
        setLocalRecords(records)
        setPendingChanges(new Map())
    }, [records])

    // Helper to get record
    const getRecord = (residentId: string, day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return localRecords.find(r => r.resident_id === residentId && r.date === dateStr)
    }

    const handleSelect = (residentId: string, day: number, staffId: string) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const finalStaffId = staffId === 'none' ? null : staffId

        // 1. Optimistic Update
        setLocalRecords(prev => {
            const existingIndex = prev.findIndex(r => r.resident_id === residentId && r.date === dateStr)
            if (existingIndex >= 0) {
                const newRecords = [...prev]
                if (finalStaffId) {
                    newRecords[existingIndex] = { ...newRecords[existingIndex], staff_id: finalStaffId }
                } else {
                    newRecords[existingIndex] = { ...newRecords[existingIndex], staff_id: finalStaffId as string }
                }
                return newRecords
            } else {
                if (!finalStaffId) return prev
                return [...prev, {
                    id: 'temp-' + Date.now(),
                    resident_id: residentId,
                    date: dateStr,
                    staff_id: finalStaffId,
                    facility_id: '',
                    created_at: '',
                    updated_at: ''
                }]
            }
        })

        // 2. Track Change
        setPendingChanges(prev => {
            const newMap = new Map(prev)
            newMap.set(`${residentId}:${dateStr}`, { residentId, date: dateStr, staffId: finalStaffId || '' })
            return newMap
        })
    }

    const onSave = async () => {
        if (pendingChanges.size === 0) {
            toast.info('変更はありません')
            return
        }

        setIsSaving(true)
        try {
            const recordsToSave = Array.from(pendingChanges.values()).map(c => ({
                residentId: c.residentId,
                date: c.date,
                staffId: c.staffId || null
            }))

            const result = await saveMedicalCooperationRecordsBulk(recordsToSave)

            if (result.error) {
                toast.error('保存に失敗しました')
            } else {
                toast.success('保存しました')
                setPendingChanges(new Map())
            }
        } catch (e) {
            toast.error('エラーが発生しました')
        } finally {
            setIsSaving(false)
        }
    }

    const handleContextMenu = (e: React.MouseEvent, recordId: string | undefined, label: string, dateStr: string) => {
        e.preventDefault()

        if (!recordId || recordId.startsWith('temp-')) {
            toast.warning('まずはデータを保存してください（ID未発行のため指摘を追加できません）')
            return
        }

        setFindingState({
            isOpen: true,
            recordId,
            jsonPath: 'staff_assignment', // Fixed path for this cell
            label: `${label} (${dateStr})`
        })
    }

    const hasFinding = (recordId: string | undefined) => {
        if (!recordId) return false
        const paths = findingsIndicators[recordId]
        return paths && paths.includes('staff_assignment')
    }

    return (
        <div className="border rounded-md bg-white overflow-hidden flex flex-col h-full">
            <div className="bg-gray-50 border-b px-4 py-2 flex justify-between items-center h-14 shrink-0">
                <div className="font-bold text-gray-700">医療連携記録</div>
                <Button
                    onClick={onSave}
                    disabled={isSaving || pendingChanges.size === 0}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            保存 ({pendingChanges.size})
                        </>
                    )}
                </Button>
            </div>
            <div className="overflow-auto flex-1">
                <Table className="min-w-max border-collapse">
                    <TableHeader className="sticky top-0 bg-gray-50 z-30 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[50px] min-w-[50px] bg-gray-50 sticky left-0 z-30 border-r text-center font-bold text-xs">No</TableHead>
                            <TableHead className="w-[150px] min-w-[150px] bg-gray-50 sticky left-[50px] z-30 border-r text-center font-bold text-xs drop-shadow-md">利用者名</TableHead>
                            {days.map(day => (
                                <TableHead key={day} className={`w-[40px] min-w-[40px] text-center border-r p-0 h-8 text-xs ${[6, 0].includes(new Date(year, month, day).getDay()) ? 'bg-orange-50 text-orange-900' : ''}`}>
                                    {day}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {residents.map((resident, index) => (
                            <TableRow key={resident.id} className="hover:bg-gray-50/50">
                                <TableCell className="sticky left-0 bg-white z-20 border-r font-medium text-center text-xs">
                                    {index + 1}
                                </TableCell>
                                <TableCell className="sticky left-[50px] bg-white z-20 border-r font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] drop-shadow-sm">
                                    {resident.name}
                                </TableCell>
                                {days.map(day => {
                                    const record = getRecord(resident.id, day)
                                    const showIndicator = hasFinding(record?.id)
                                    const dateStr = `${month + 1}/${day}`

                                    return (
                                        <TableCell
                                            key={day}
                                            className="p-0 border-r min-w-[40px] h-8 text-center padding-0 relative"
                                            onContextMenu={(e) => handleContextMenu(e, record?.id, resident.name, dateStr)}
                                        >
                                            <select
                                                className={`h-8 w-full border-none shadow-none focus:ring-0 px-0 text-center text-xs bg-transparent cursor-pointer outline-none appearance-none ${pendingChanges.has(`${resident.id}:${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`) ? 'bg-orange-200' : ''}`}
                                                value={record?.staff_id || 'none'}
                                                onChange={(e) => handleSelect(resident.id, day, e.target.value)}
                                            >
                                                <option value="none" className="text-gray-400">-</option>
                                                {nurses.map(nurse => (
                                                    <option key={nurse.id} value={nurse.id} className="text-black">
                                                        {nurse.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {showIndicator && (
                                                <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-r-[6px] border-t-red-500 border-r-transparent pointer-events-none" />
                                            )}
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <FindingSheet
                isOpen={findingState.isOpen}
                onClose={() => setFindingState(prev => ({ ...prev, isOpen: false }))}
                recordId={findingState.recordId}
                jsonPath={findingState.jsonPath}
                label={findingState.label}
                recordType="medical"
            />
        </div>
    )
}
