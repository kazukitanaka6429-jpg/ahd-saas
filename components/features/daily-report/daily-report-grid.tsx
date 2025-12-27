'use client'

import { Resident, DailyRecord } from '@/types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { upsertDailyRecordsBulk } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { FindingSheet } from './finding-sheet'

interface DailyReportGridProps {
    residents: Resident[]
    defaultRecords: DailyRecord[]
    date: string
    findingsIndicators?: Record<string, string[]> // dailyRecordId -> [jsonPath, ...]
}

export function DailyReportGrid({ residents, defaultRecords, date, findingsIndicators = {} }: DailyReportGridProps) {
    // Optimistic UI State
    const [localData, setLocalData] = useState<Map<string, Record<string, any>>>(() => {
        const map = new Map()
        defaultRecords.forEach(r => {
            map.set(r.resident_id, r.data || {})
        })
        return map
    })

    // Map resident_id to daily_record_id for findings lookup
    const [recordIds, setRecordIds] = useState<Map<string, string>>(() => {
        const map = new Map()
        defaultRecords.forEach(r => map.set(r.resident_id, r.id))
        return map
    })

    const [pendingChanges, setPendingChanges] = useState<Map<string, Record<string, any>>>(new Map())
    const [isSaving, setIsSaving] = useState(false)

    // Findings State
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        recordId: string | null
        jsonPath: string | null
        label: string
    }>({ isOpen: false, recordId: null, jsonPath: null, label: '' })

    useEffect(() => {
        const map = new Map()
        const idMap = new Map()
        defaultRecords.forEach(r => {
            map.set(r.resident_id, r.data || {})
            idMap.set(r.resident_id, r.id)
        })
        setLocalData(map)
        setRecordIds(idMap)
        setPendingChanges(new Map())
    }, [defaultRecords])

    const getValue = (residentId: string, key: string) => {
        const data = localData.get(residentId)
        if (!data) return ''
        return data[key] !== undefined && data[key] !== null ? String(data[key]) : ''
    }

    const handleSave = (residentId: string, column: string, value: any) => {
        setLocalData(prev => {
            const newMap = new Map(prev)
            const current = newMap.get(residentId) || {}
            newMap.set(residentId, { ...current, [column]: value })
            return newMap
        })

        setPendingChanges(prev => {
            const newMap = new Map(prev)
            const current = newMap.get(residentId) || {}
            newMap.set(residentId, { ...current, [column]: value })
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
            const recordsToSave = Array.from(pendingChanges.entries()).map(([residentId, changes]) => ({
                resident_id: residentId,
                date: date,
                data: changes
            }))

            const result = await upsertDailyRecordsBulk(recordsToSave)

            if (result.error) {
                toast.error(`保存に失敗しました: ${result.error}`)
            } else {
                toast.success('保存しました')
                setPendingChanges(new Map())
            }
        } catch (e: any) {
            toast.error(`エラーが発生しました: ${e.message || 'Unknown error'}`)
        } finally {
            setIsSaving(false)
        }
    }

    // Context Menu Handler
    const handleContextMenu = (e: React.MouseEvent, resident: Resident, key: string, label: string) => {
        e.preventDefault() // Block default browser menu
        const recordId = recordIds.get(resident.id)

        if (!recordId) {
            toast.warning('まずはデータを保存してください（ID未発行のため指摘を追加できません）')
            return
        }

        setFindingState({
            isOpen: true,
            recordId,
            jsonPath: key,
            label: `${resident.name} - ${label}`
        })
    }

    // Indicator Helper
    const hasFinding = (residentId: string, key: string) => {
        // findingIndicators uses dailyRecordId
        const recordId = recordIds.get(residentId)
        if (!recordId) return false
        const paths = findingsIndicators[recordId]
        return paths && paths.includes(key)
    }

    // Cell Wrapper for consistent context menu and indicator
    const Cell = ({ resident, colKey, label, children, className = "" }: { resident: Resident, colKey: string, label: string, children: React.ReactNode, className?: string }) => {
        const showIndicator = hasFinding(resident.id, colKey)
        return (
            <TableCell
                className={`border border-black p-0 text-center relative ${className}`}
                onContextMenu={(e) => handleContextMenu(e, resident, colKey, label)}
            >
                {children}
                {showIndicator && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-red-500 border-r-transparent pointer-events-none" />
                )}
                {/* Alternative indicator: Red triangle in corner 
                    border-t-red-500 border-l-transparent ...
                 */}
                {showIndicator && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full pointer-events-none" />
                )}
            </TableCell>
        )
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm">
            {/* Header with Save Button */}
            <div className="px-4 py-2 border-b flex justify-between items-center bg-gray-50 border-black border-l-0 border-r-0 border-t-0">
                <div className="text-sm text-gray-500">
                    ※セルを右クリックすると指摘・コメントを追加できます
                </div>
                <Button
                    onClick={onSave}
                    disabled={isSaving || pendingChanges.size === 0}
                    className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    保存 ({pendingChanges.size})
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table className="min-w-[1200px] border-collapse border border-black table-fixed text-sm">
                    <TableHeader>
                        <TableRow className="bg-white hover:bg-white text-black">
                            <TableHead className="w-[140px] border border-black text-black font-bold text-center h-auto py-1 bg-gray-100" rowSpan={2}>
                                利用者名
                            </TableHead>

                            {/* Meals (3 cols) */}
                            <TableHead className="border border-black text-black font-bold text-center h-auto py-1 bg-gray-100 p-0" colSpan={3}>
                                <div className="border-b border-black py-1">食事</div>
                                <div className="text-[10px] text-red-600 font-normal">バランス弁当提供</div>
                            </TableHead>

                            {/* Day Activity (3 cols) */}
                            <TableHead className="border border-black text-black font-bold text-center h-auto py-1 bg-gray-100 p-0" colSpan={3}>
                                <div className="py-2">日中の活動 <span className="text-red-500 text-xs">(必須)</span></div>
                            </TableHead>

                            {/* Night Activity (4 cols) */}
                            <TableHead className="border border-black text-black font-bold text-center h-auto py-1 bg-gray-100 p-0" colSpan={4}>
                                <div className="py-2">夜間 <span className="text-red-500 text-xs">(必須)</span></div>
                            </TableHead>
                        </TableRow>

                        {/* Sub Header */}
                        <TableRow className="bg-white hover:bg-white text-black">
                            {/* Meals */}
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">朝食</TableHead>
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">昼食</TableHead>
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">夕食</TableHead>

                            {/* Day Activity */}
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">GH</TableHead>
                            <TableHead className="border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">日中活動</TableHead>
                            <TableHead className="border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">その他福祉<br />サービス利用</TableHead>

                            {/* Night Activity */}
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">GH泊</TableHead>
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">救急</TableHead>
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">入院</TableHead>
                            <TableHead className="w-[50px] border border-black text-black text-center h-auto py-1 text-xs bg-gray-50">外泊</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {residents.map((resident) => (
                            <TableRow key={resident.id} className="hover:bg-blue-50/50 border-b border-black h-[48px]">
                                <TableCell className="border border-black p-2 font-medium bg-white">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-4 text-right">No.</span>
                                        {resident.name}
                                    </div>
                                </TableCell>

                                {/* Meals */}
                                <Cell resident={resident} colKey="meal_breakfast" label="朝食" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'meal_breakfast') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'meal_breakfast', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="meal_lunch" label="昼食" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'meal_lunch') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'meal_lunch', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="meal_dinner" label="夕食" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'meal_dinner') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'meal_dinner', e.target.checked)}
                                    />
                                </Cell>

                                {/* Day Activity */}
                                <Cell resident={resident} colKey="activity_gh" label="GH" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'activity_gh') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'activity_gh', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="activity_day_support" label="日中活動" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'activity_day_support') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'activity_day_support', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="activity_other" label="その他福祉サービス">
                                    <select
                                        className="w-full h-full bg-transparent border-none outline-none text-center cursor-pointer min-h-[40px]"
                                        value={getValue(resident.id, 'activity_other')}
                                        onChange={(e) => handleSave(resident.id, 'activity_other', e.target.value)}
                                    >
                                        <option value="">-</option>
                                        <option value="day_service">デイサービス</option>
                                        <option value="visit_nursing">訪問看護</option>
                                        <option value="helper">ヘルパー</option>
                                    </select>
                                </Cell>

                                {/* Night Activity */}
                                <Cell resident={resident} colKey="night_gh" label="GH泊" className="text-center align-middle bg-[#d9ead3]">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'night_gh') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'night_gh', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="night_ambulance" label="救急" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'night_ambulance') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'night_ambulance', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="hosp" label="入院" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'hosp') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'hosp', e.target.checked)}
                                    />
                                </Cell>
                                <Cell resident={resident} colKey="overnight" label="外泊" className="text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={getValue(resident.id, 'overnight') === 'true'}
                                        onChange={(e) => handleSave(resident.id, 'overnight', e.target.checked)}
                                    />
                                </Cell>

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
                recordType="daily"
            />
        </div>
    )
}
