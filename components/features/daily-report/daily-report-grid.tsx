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
import { useState, useEffect } from 'react'
import { upsertDailyRecordsBulk } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { FindingSheet } from './finding-sheet'
import { useGlobalSave } from '@/components/providers/global-save-context'
import { cn } from '@/lib/utils'

interface DailyReportGridProps {
    residents: Resident[]
    defaultRecords: DailyRecord[]
    date: string
    findingsIndicators?: Record<string, string[]> // dailyRecordId -> [jsonPath, ...]
}

export function DailyReportGrid({ residents, defaultRecords, date, findingsIndicators = {} }: DailyReportGridProps) {
    const { registerSaveNode, unregisterSaveNode, triggerGlobalSave, isSaving: isGlobalSaving } = useGlobalSave()

    // Optimistic UI State
    const [localData, setLocalData] = useState<Map<string, DailyRecord>>(() => {
        const map = new Map()
        defaultRecords.forEach(r => {
            map.set(r.resident_id, r)
        })
        return map
    })

    const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<DailyRecord>>>(new Map())

    // Findings State
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        recordId: string | null
        jsonPath: string | null
        label: string
    }>({ isOpen: false, recordId: null, jsonPath: null, label: '' })

    useEffect(() => {
        const map = new Map()
        defaultRecords.forEach(r => {
            map.set(r.resident_id, r)
        })
        setLocalData(map)
        setPendingChanges(new Map())
    }, [defaultRecords])

    // Register Save Function
    useEffect(() => {
        const id = 'daily-report-grid'
        registerSaveNode(id, async () => {
            if (pendingChanges.size === 0) return

            const recordsToSave = Array.from(pendingChanges.entries()).map(([residentId, changes]) => ({
                resident_id: residentId,
                date: date,
                data: {}, // Not using data for these fields anymore, but keeping for compatibility if mixed
                ...changes
            }))

            const result = await upsertDailyRecordsBulk(recordsToSave)
            if (result.error) {
                console.error("Daily report save failed", result.error)
                throw new Error(result.error)
            }
            if (result.success) {
                setPendingChanges(new Map())
            }
        })
        return () => unregisterSaveNode(id)
    }, [registerSaveNode, unregisterSaveNode, pendingChanges, date])

    const getValue = (residentId: string, key: keyof DailyRecord) => {
        const record = localData.get(residentId)
        if (!record) return undefined
        return record[key]
    }

    const handleSave = (residentId: string, column: keyof DailyRecord, value: any) => {
        setLocalData(prev => {
            const newMap = new Map(prev)
            const current = newMap.get(residentId) || { resident_id: residentId } as DailyRecord
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

    const onManualSave = async () => {
        await triggerGlobalSave()
    }

    const handleContextMenu = (e: React.MouseEvent, residentId: string, key: string, label: string) => {
        e.preventDefault()
        const record = localData.get(residentId)
        if (!record?.id) {
            toast.warning('まずはデータを保存してください（ID未発行のため指摘を追加できません）')
            return
        }
        setFindingState({
            isOpen: true,
            recordId: record.id,
            jsonPath: key,
            label: `業務日誌 - ${label}`
        })
    }

    const hasFinding = (residentId: string, key: string) => {
        const record = localData.get(residentId)
        if (!record?.id) return false
        return findingsIndicators[record.id]?.includes(key)
    }

    const headerClass = "border border-black bg-gray-100 text-center font-bold text-xs p-1 h-auto align-middle"
    const cellClass = "border border-black p-0 text-center align-middle h-[40px] relative bg-white"
    const checkboxClass = "w-5 h-5 accent-green-600 cursor-pointer"

    const FindingCell = ({ residentId, colKey, children, className = "", label }: { residentId: string, colKey: string, children: React.ReactNode, className?: string, label: string }) => {
        const show = hasFinding(residentId, colKey)
        return (
            <TableCell
                className={cn(cellClass, className)}
                onContextMenu={(e) => handleContextMenu(e, residentId, colKey, label)}
            >
                {children}
                {show && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full pointer-events-none" />
                )}
            </TableCell>
        )
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-2 border-b flex justify-between items-center bg-gray-50 border-black border-l-0 border-r-0 border-t-0">
                <div className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-black mr-1"></span>
                    日中・夜間支援（業務日誌）
                </div>
                <Button onClick={onManualSave} disabled={isGlobalSaving} className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold">
                    {isGlobalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    保存
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table className="min-w-[1000px] border-collapse border border-black text-sm w-full">
                    <TableHeader>
                        <TableRow className="h-[40px]">
                            <TableHead className={cn(headerClass, "w-[150px]")} rowSpan={2}>ご利用者名</TableHead>
                            <TableHead className={cn(headerClass)} colSpan={3}>
                                <div className="border-b border-black py-1">食事</div>
                                <div className="text-red-500 text-xs">バランス弁当提供</div>
                            </TableHead>
                            <TableHead className={cn(headerClass)} colSpan={3}>
                                <div className="py-2">日中の活動 <span className="text-red-500 text-xs">(☑必須)</span></div>
                            </TableHead>
                            <TableHead className={cn(headerClass)} colSpan={4}>
                                <div className="py-2">夜間 <span className="text-red-500 text-xs">(☑必須)</span></div>
                            </TableHead>
                        </TableRow>
                        <TableRow className="h-[30px]">
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>朝食</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>昼食</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>夕食</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>GH</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>日中活動</TableHead>
                            <TableHead className={cn(headerClass, "w-[200px] bg-green-100/50")}>その他福祉サービス利用</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>GH泊</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>救急搬送</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>入院</TableHead>
                            <TableHead className={cn(headerClass, "w-[60px] bg-green-100/50")}>外泊</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {residents.map((resident) => {
                            const rId = resident.id
                            const val = (k: keyof DailyRecord) => getValue(rId, k)
                            const setVal = (k: keyof DailyRecord, v: any) => handleSave(rId, k, v)

                            return (
                                <TableRow key={resident.id} className="divide-x divide-black border-b border-black">
                                    <TableCell className="p-2 border border-black font-bold text-center bg-white">
                                        {resident.name}
                                    </TableCell>

                                    {/* Meals */}
                                    <FindingCell residentId={rId} colKey="meal_breakfast" label="朝食">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('meal_breakfast')} onChange={e => setVal('meal_breakfast', e.target.checked)} />
                                        </div>
                                    </FindingCell>
                                    <FindingCell residentId={rId} colKey="meal_lunch" label="昼食">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('meal_lunch')} onChange={e => setVal('meal_lunch', e.target.checked)} />
                                        </div>
                                    </FindingCell>
                                    <FindingCell residentId={rId} colKey="meal_dinner" label="夕食">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('meal_dinner')} onChange={e => setVal('meal_dinner', e.target.checked)} />
                                        </div>
                                    </FindingCell>

                                    {/* Day Activity - GH */}
                                    <FindingCell residentId={rId} colKey="is_gh" label="GH(日中)">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('is_gh')} onChange={e => setVal('is_gh', e.target.checked)} />
                                        </div>
                                    </FindingCell>

                                    {/* Day Activity */}
                                    <FindingCell residentId={rId} colKey="daytime_activity" label="日中活動">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('daytime_activity')} onChange={e => setVal('daytime_activity', e.target.checked)} />
                                        </div>
                                    </FindingCell>

                                    {/* Other Service */}
                                    <FindingCell residentId={rId} colKey="other_welfare_service" label="その他福祉">
                                        <select
                                            className="w-full h-full border-none bg-transparent text-center text-xs focus:ring-0 appearance-none cursor-pointer"
                                            value={(val('other_welfare_service') as string) || "none"}
                                            onChange={e => setVal('other_welfare_service', e.target.value === "none" ? null : e.target.value)}
                                        >
                                            <option value="none" className="bg-gray-100"></option>
                                            <option value="生活介護">生活介護</option>
                                            <option value="居宅介護">居宅介護</option>
                                            <option value="重度訪問介護">重度訪問介護</option>
                                            <option value="行動援護">行動援護</option>
                                            <option value="移動支援">移動支援</option>
                                        </select>
                                    </FindingCell>

                                    {/* Night - GH Stay */}
                                    <FindingCell residentId={rId} colKey="is_gh_night" label="GH泊">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('is_gh_night')} onChange={e => setVal('is_gh_night', e.target.checked)} />
                                        </div>
                                    </FindingCell>

                                    {/* Emergency */}
                                    <FindingCell residentId={rId} colKey="emergency_transport" label="救急搬送">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('emergency_transport')} onChange={e => setVal('emergency_transport', e.target.checked)} />
                                        </div>
                                    </FindingCell>

                                    {/* Hospitalization */}
                                    <FindingCell residentId={rId} colKey="hospitalization_status" label="入院">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('hospitalization_status')} onChange={e => setVal('hospitalization_status', e.target.checked)} />
                                        </div>
                                    </FindingCell>

                                    {/* Overnight */}
                                    <FindingCell residentId={rId} colKey="overnight_stay_status" label="外泊">
                                        <div className="flex justify-center items-center h-full">
                                            <input type="checkbox" className={checkboxClass} checked={!!val('overnight_stay_status')} onChange={e => setVal('overnight_stay_status', e.target.checked)} />
                                        </div>
                                    </FindingCell>
                                </TableRow>
                            )
                        })}
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
