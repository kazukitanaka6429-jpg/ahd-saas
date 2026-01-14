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
import { getFindingsPathsByRecordId } from '@/app/actions/findings'
import { cn } from '@/lib/utils'
import { Unit } from '@/app/actions/units'

interface Props {
    matrix: MedicalCooperationMatrix
    nurses: Staff[]
    currentDate: string // YYYY-MM-DD
    findingsIndicators?: Record<string, string[]>
    facilityId?: string
    units?: Unit[]
}

export function MedicalCooperationGrid({ matrix, nurses, currentDate, findingsIndicators = {}, facilityId, units = [] }: Props) {
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

    // Unit Filtering State
    const [selectedUnitId, setSelectedUnitId] = useState<string>('all')

    // Filter Residents based on Unit
    const filteredResidents = residents.filter(r => {
        if (units.length === 0) return true
        if (selectedUnitId === 'all') return true
        if (selectedUnitId === 'none') return !r.unit_id
        return r.unit_id === selectedUnitId
    })

    // Finding State
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        recordId: string | null
        jsonPath: string | null
        label: string
    }>({ isOpen: false, recordId: null, jsonPath: null, label: '' })

    // Findings Indicators State (recordId -> json_path[])
    const [localFindingsIndicators, setLocalFindingsIndicators] = useState<Record<string, string[]>>(findingsIndicators)

    useEffect(() => {
        setLocalFindingsIndicators(findingsIndicators)
    }, [findingsIndicators])

    useEffect(() => {
        setLocalRows(rows)
        setPendingChanges(new Map())
    }, [rows])

    // Context Menu Handler
    const handleContextMenu = (e: React.MouseEvent, recordId: string | undefined, residentName: string, dateStr: string) => {
        e.preventDefault()
        if (!recordId) {
            toast.warning('まずはデータを保存してください')
            return
        }
        setFindingState({
            isOpen: true,
            recordId: recordId,
            jsonPath: `staff_selection_${dateStr}`,  // json_path format
            label: `医療連携IV - ${residentName} (${dateStr})`
        })
    }

    // Check if cell has finding
    const hasFinding = (recordId: string | undefined, dateStr: string): boolean => {
        if (!recordId) return false
        const paths = localFindingsIndicators[recordId] || []
        return paths.includes(`staff_selection_${dateStr}`)
    }

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

            {units.length > 0 && (
                <div className="px-4 pt-4 border-b">
                    <div className="flex space-x-1">
                        {units.map(unit => (
                            <button
                                key={unit.id}
                                onClick={() => setSelectedUnitId(unit.id)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-colors",
                                    selectedUnitId === unit.id
                                        ? "bg-white border-gray-200 text-blue-600 border-b-white translate-y-[1px]"
                                        : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-gray-200 mb-[1px]"
                                )}
                            >
                                {unit.name}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedUnitId('none')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-colors",
                                selectedUnitId === 'none'
                                    ? "bg-white border-gray-200 text-blue-600 border-b-white translate-y-[1px]"
                                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-gray-200 mb-[1px]"
                            )}
                        >
                            未所属
                        </button>
                        <button
                            onClick={() => setSelectedUnitId('all')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent transition-colors",
                                selectedUnitId === 'all'
                                    ? "bg-white border-gray-200 text-blue-600 border-b-white translate-y-[1px]"
                                    : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-gray-200 mb-[1px]"
                            )}
                        >
                            全て
                        </button>
                    </div>
                </div>
            )}
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
                        {filteredResidents.map((resident, index) => {
                            const unitName = units.find(u => u.id === resident.unit_id)?.name
                            return (
                                <TableRow key={resident.id} className="hover:bg-gray-50/50">
                                    <TableCell className="sticky left-0 bg-white z-20 border-r border-b font-medium text-center text-xs">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="sticky left-[50px] bg-white z-20 border-r border-b font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] drop-shadow-sm">
                                        <div className="flex flex-col items-center justify-center">
                                            <span>{resident.name}</span>
                                            {selectedUnitId === 'all' && unitName && (
                                                <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500">{unitName}</span>
                                            )}
                                        </div>
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
                                                className={cn(
                                                    "p-0 border-r border-b min-w-[40px] h-8 text-center padding-0 relative",
                                                    bgClass,
                                                    isPending && 'ring-2 ring-orange-400 ring-inset'
                                                )}
                                                onContextMenu={(e) => handleContextMenu(e, row?.recordIds?.[resident.id], resident.name, dateStr)}
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
                                                {/* Red Finding Indicator */}
                                                {hasFinding(row?.recordIds?.[resident.id], dateStr) && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full pointer-events-none" />
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Finding Sheet omitted for brevity if unused here logic-wise or needs props */}
            <FindingSheet
                isOpen={findingState.isOpen}
                onClose={() => {
                    setFindingState(prev => ({ ...prev, isOpen: false }))
                    // Refresh indicators after closing
                    if (findingState.recordId) {
                        getFindingsPathsByRecordId(findingState.recordId, 'medical').then((pathsMap: Record<string, string[]>) => {
                            setLocalFindingsIndicators(prev => ({
                                ...prev,
                                ...pathsMap
                            }))
                        })
                    }
                }}
                recordId={findingState.recordId}
                jsonPath={findingState.jsonPath}
                label={findingState.label}
                recordType="medical"
            />
        </div>
    )
}
