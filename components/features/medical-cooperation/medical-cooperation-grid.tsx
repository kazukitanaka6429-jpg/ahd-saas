'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Resident, Staff } from '@/types'
import { upsertMedicalCooperationRecordsBulk, MedicalCooperationMatrix, MedicalCooperationRow } from '@/app/actions/medical-cooperation'
import { toast } from 'sonner'
import { getDaysInMonth } from 'date-fns'
import { Loader2, Save } from 'lucide-react'
import { FindingSheet } from '../daily-report/finding-sheet'

interface Props {
    matrix: MedicalCooperationMatrix
    nurses: Staff[]
    currentDate: string // YYYY-MM-DD
    findingsIndicators?: Record<string, string[]>
    facilityId?: string
}

export function MedicalCooperationGrid({ matrix, nurses, currentDate, findingsIndicators = {}, facilityId }: Props) {
    const { residents, rows } = matrix
    const dateObj = new Date(currentDate)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth()
    const daysCount = getDaysInMonth(dateObj)
    const days = Array.from({ length: daysCount }, (_, i) => i + 1)

    // Local State
    const [localRows, setLocalRows] = useState<MedicalCooperationRow[]>(rows)
    const [pendingChanges, setPendingChanges] = useState<Map<string, { residentId: string, date: string, staffId: string | null }>>(new Map())
    const [isSaving, setIsSaving] = useState(false)

    // Finding State
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        recordId: string | null
        jsonPath: string | null
        label: string
    }>({ isOpen: false, recordId: null, jsonPath: null, label: '' })

    useEffect(() => {
        setLocalRows(rows)
        setPendingChanges(new Map())
    }, [rows])

    const handleSelect = (residentId: string, _day: number, dateStr: string, staffId: string) => {
        const finalStaffId = staffId === 'none' ? null : staffId

        // Optimistic Update
        setLocalRows(prev => prev.map(row => {
            if (row.date === dateStr) {
                return {
                    ...row,
                    records: {
                        ...row.records,
                        [residentId]: finalStaffId
                    }
                }
            }
            return row
        }))

        // Pending Change
        setPendingChanges(prev => {
            const newMap = new Map(prev)
            newMap.set(`${residentId}:${dateStr}`, { residentId, date: dateStr, staffId: finalStaffId })
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
            const recordsToSave = Array.from(pendingChanges.values())
            // Pass facilityId if provided (Admin case)
            const result = await upsertMedicalCooperationRecordsBulk(recordsToSave, facilityId)

            if (result.error) {
                toast.error(`保存に失敗しました: ${result.error}`)
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

    // Helper to calculate nurse load from local state
    const getNurseLoad = (dateStr: string, staffId: string | null) => {
        if (!staffId) return 0
        const row = localRows.find(r => r.date === dateStr)
        if (!row) return 0
        return Object.values(row.records).filter(id => id === staffId).length
    }

    return (
        <div className="border rounded-md bg-white overflow-hidden flex flex-col h-full shadow-sm">
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
                <Table className="min-w-max border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 bg-gray-50 z-30 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[50px] min-w-[50px] bg-gray-50 sticky left-0 z-30 border-r border-b text-center font-bold text-xs">No</TableHead>
                            <TableHead className="w-[150px] min-w-[150px] bg-gray-50 sticky left-[50px] z-30 border-r border-b text-center font-bold text-xs drop-shadow-md">利用者名</TableHead>
                            {days.map(day => (
                                <TableHead key={day} className={`w-[40px] min-w-[40px] text-center border-r border-b p-0 h-8 text-xs ${[6, 0].includes(new Date(year, month, day).getDay()) ? 'bg-orange-50 text-orange-900' : ''}`}>
                                    {day}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {residents.map((resident, index) => (
                            <TableRow key={resident.id} className="hover:bg-gray-50/50">
                                <TableCell className="sticky left-0 bg-white z-20 border-r border-b font-medium text-center text-xs">
                                    {index + 1}
                                </TableCell>
                                <TableCell className="sticky left-[50px] bg-white z-20 border-r border-b font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] drop-shadow-sm">
                                    {resident.name}
                                </TableCell>
                                {days.map(day => {
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const row = localRows.find(r => r.date === dateStr)
                                    const staffId = row?.records[resident.id] || null

                                    // Nurse Load Calculation
                                    const nurseLoad = getNurseLoad(dateStr, staffId)

                                    let bgClass = 'bg-transparent'
                                    if (staffId) {
                                        if (nurseLoad === 2) bgClass = 'bg-yellow-100'
                                        else if (nurseLoad >= 3) bgClass = 'bg-blue-100'
                                    }

                                    const isPending = pendingChanges.has(`${resident.id}:${dateStr}`)

                                    return (
                                        <TableCell
                                            key={day}
                                            className={`p-0 border-r border-b min-w-[40px] h-8 text-center padding-0 relative ${bgClass} ${isPending ? 'ring-2 ring-orange-400 ring-inset' : ''}`}
                                        // context menu later
                                        >
                                            <select
                                                className={`h-8 w-full border-none shadow-none focus:ring-0 px-0 text-center text-xs bg-transparent cursor-pointer outline-none appearance-none`}
                                                value={staffId || 'none'}
                                                onChange={(e) => handleSelect(resident.id, day, dateStr, e.target.value)}
                                            >
                                                <option value="none" className="text-gray-400">-</option>
                                                {nurses.map(nurse => (
                                                    <option key={nurse.id} value={nurse.id} className="text-black">
                                                        {nurse.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Finding Sheet omitted for brevity if unused here logic-wise or needs props */}
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
