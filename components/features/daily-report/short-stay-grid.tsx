'use client'

import { Resident, ShortStayRecord } from '@/types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { saveShortStayRecord, deleteShortStayRecord } from '@/app/actions/short-stay'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FindingSheet } from './finding-sheet'
import { getFindingsCountByRecord } from '@/app/actions/findings'
import { useGlobalSave } from '@/components/providers/global-save-context'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ShortStayGridProps {
    residents: Resident[]
    record?: ShortStayRecord | null // Optional for flexibility
    defaultRecords?: any[] // Kept for compatibility if passed
    date: string
}

export function ShortStayGrid({ residents, record: initialRecord, date }: ShortStayGridProps) {
    const { registerSaveNode, unregisterSaveNode, triggerGlobalSave, isSaving: isGlobalSaving } = useGlobalSave()

    // Local state
    const [formData, setFormData] = useState<Partial<ShortStayRecord>>({
        facility_id: '',
        date: date,
        resident_id: null,
        period_note: '',
        meal_breakfast: false,
        meal_lunch: false,
        meal_dinner: false,
        meal_provided_lunch: false,
        is_gh: false,
        is_gh_night: false,
        daytime_activity: null,
        other_welfare_service: null,
        entry_time: null,
        exit_time: null,
    })

    const [isDeleting, setIsDeleting] = useState(false)

    // Findings State
    const [findingsPaths, setFindingsPaths] = useState<string[]>([])
    const [findingState, setFindingState] = useState<{
        isOpen: boolean
        recordId: string | null
        jsonPath: string | null
        label: string
    }>({ isOpen: false, recordId: null, jsonPath: null, label: '' })

    // Load initial data
    useEffect(() => {
        if (initialRecord) {
            setFormData(initialRecord)
            getFindingsCountByRecord(initialRecord.id, 'short_stay').then(pathsMap => {
                setFindingsPaths(pathsMap[initialRecord.id] || [])
            })
        } else {
            // Reset logic if needed, but usually we just keep default if no record is passed
            // Or if date changes? The key prop on parent usually handles reset.
        }
    }, [initialRecord])

    // Register Save Function
    useEffect(() => {
        const id = 'short-stay-grid'
        registerSaveNode(id, async () => {
            if (!formData.resident_id) return // Skip empty

            // Silent save
            const result = await saveShortStayRecord({
                ...formData,
                date: date
            } as ShortStayRecord)

            if (result.error) {
                console.error("Short stay save failed", result.error)
                throw new Error(result.error)
            }
            if (result.data) {
                setFormData(prev => ({ ...prev, id: result.data.id }))
            }
        })
        return () => unregisterSaveNode(id)
    }, [registerSaveNode, unregisterSaveNode, formData, date])


    const handleChange = (key: keyof ShortStayRecord, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const onManualSave = async () => {
        // Trigger global save
        await triggerGlobalSave()
    }

    const onDelete = async () => {
        if (!formData.id) return
        if (!confirm('このレコードを削除しますか？')) return

        setIsDeleting(true)
        try {
            const result = await deleteShortStayRecord(formData.id)
            if (result.error) {
                toast.error(`削除に失敗しました: ${result.error}`)
            } else {
                toast.success('削除しました')
                setFormData({
                    date: date,
                    resident_id: null,
                    period_note: '',
                    meal_breakfast: false,
                    meal_lunch: false,
                    meal_dinner: false,
                    meal_provided_lunch: false,
                    is_gh: false,
                    is_gh_night: false,
                    daytime_activity: null,
                    other_welfare_service: null,
                    entry_time: null,
                    exit_time: null,
                })
            }
        } catch (e: any) {
            toast.error(`エラー: ${e.message}`)
        } finally {
            setIsDeleting(false)
        }
    }

    // Context Menu
    const handleContextMenu = (e: React.MouseEvent, key: string, label: string) => {
        e.preventDefault()
        if (!formData.id) {
            toast.warning('まずはデータを保存してください')
            return
        }
        setFindingState({
            isOpen: true,
            recordId: formData.id,
            jsonPath: key,
            label: `ショートステイ - ${label}`
        })
    }

    const hasFinding = (key: string) => findingsPaths.includes(key)

    // Helper for cells
    const inputCellBase = "bg-white h-full" // Changed from bg-[#d9ead3] to bg-white
    const checkboxClass = "w-5 h-5 accent-green-600 cursor-pointer"
    const headerBase = "border border-black text-black font-bold text-center h-auto py-1 bg-gray-100 p-0 align-middle"
    const cellBase = "border border-black p-0 text-center align-middle relative"

    const FindingCell = ({ colKey, children, className = "", label }: { colKey: string, children: React.ReactNode, className?: string, label: string }) => {
        const show = hasFinding(colKey)
        return (
            <td
                className={cn(cellBase, className)}
                onContextMenu={(e) => handleContextMenu(e, colKey, label)}
            >
                {children}
                {show && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-full pointer-events-none" />}
            </td>
        )
    }

    // Date Logic
    const handleDateSelect = (part: 'start' | 'end', d: Date | undefined) => {
        if (!d) return
        const formatted = format(d, 'yyyy/MM/dd')
        const current = formData.period_note || '~'
        const [start, end] = current.split('~')

        const newStart = part === 'start' ? formatted : (start || '')
        const newEnd = part === 'end' ? formatted : (end || '')
        handleChange('period_note', `${newStart}~${newEnd}`)
    }

    const getPeriodDate = (part: 'start' | 'end') => {
        const current = formData.period_note || '~'
        const [start, end] = current.split('~')
        const val = part === 'start' ? start : end
        if (!val || !val.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) return undefined
        return new Date(val)
    }

    // Display formatter for button
    const formatPeriodDisplay = (part: 'start' | 'end') => {
        const d = getPeriodDate(part)
        return d ? format(d, 'M/d') : 'MM/DD'
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm mt-8">
            <div className="px-4 py-2 border-b flex justify-between items-center bg-gray-50 border-black border-l-0 border-r-0 border-t-0">
                <div className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-black mr-1"></span>
                    ショートステイ利用
                </div>
                <div className="text-xs text-gray-500">※同日のショート利用は1人まで</div>
                <div className="flex gap-2">
                    {formData.id && (
                        <Button onClick={onDelete} disabled={isDeleting} variant="destructive" className="h-8 font-bold">
                            <Trash2 className="w-4 h-4 mr-2" />削除
                        </Button>
                    )}
                    <Button onClick={onManualSave} disabled={isGlobalSaving} className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold">
                        {isGlobalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        保存
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table className="min-w-[1000px] border-collapse border border-black text-sm w-full">
                    <TableHeader>
                        {/* Header Structure (Same as before) */}
                        <TableRow className="h-[40px]">
                            <TableHead className={cn(cellBase, headerBase, "w-[150px]")} rowSpan={2}>
                                <div className="flex flex-col h-full justify-between text-xs py-1 px-2">
                                    <span>利用者名</span>
                                    <span>利用期間</span>
                                </div>
                            </TableHead>
                            <TableHead className={cn(cellBase, headerBase)} colSpan={3}>
                                <div className="border-b border-black py-1">食事</div>
                                <div className="text-[10px] text-red-600 font-normal">バランス弁当提供</div>
                            </TableHead>
                            <TableHead className={cn(cellBase, headerBase)} colSpan={3}>
                                <div className="py-2">日中の活動 <span className="text-red-500 text-xs">(☑必須)</span></div>
                            </TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[60px]")} rowSpan={1}>
                                <div className="flex flex-col h-full justify-center py-1">
                                    <span className="text-xs">夜間</span>
                                    <span className="text-[10px] text-red-500">(☑必須)</span>
                                </div>
                            </TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[120px]")} colSpan={2}>
                                <div className="border-b border-black py-1">入退去時間 <span className="text-red-500 text-xs">(必須)</span></div>
                            </TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[60px]")} rowSpan={2}>
                                <div className="flex flex-col justify-center h-full gap-1">
                                    <div className="text-[10px] leading-tight">食事提供有<br />(経管含む)</div>
                                    <div className="border-t border-black w-full pt-1">昼食</div>
                                </div>
                            </TableHead>
                        </TableRow>

                        {/* Sub Header */}
                        <TableRow className="h-[30px]">
                            <TableHead className={cn(cellBase, headerBase, "w-[40px] bg-gray-50")}>朝</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[40px] bg-gray-50")}>昼</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[40px] bg-gray-50")}>夜</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[40px] bg-gray-50")}>GH</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[60px] bg-gray-50")}>日中活動</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "bg-gray-50")}>その他福祉サービス利用</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "w-[60px] bg-gray-50")}>GH泊</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "bg-gray-50")}>入居時刻</TableHead>
                            <TableHead className={cn(cellBase, headerBase, "bg-gray-50")}>退居時刻</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="h-[60px] border-b border-black">
                            {/* Resident / Period */}
                            <TableCell className={cn(cellBase, "bg-white align-top p-1")}>
                                <div className="flex flex-col gap-1 h-full justify-center">
                                    <Select value={formData.resident_id || ""} onValueChange={(val) => handleChange('resident_id', val)}>
                                        <SelectTrigger className="w-full h-7 text-xs border-gray-300">
                                            <SelectValue placeholder="選択..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    <div className="flex items-center gap-1">
                                        {/* Start Date Popover */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <div className="bg-white flex-1 h-[24px] border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50">
                                                    <span className="text-xs">{formatPeriodDisplay('start')}</span>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={getPeriodDate('start')}
                                                    onSelect={(d) => handleDateSelect('start', d)}
                                                    initialFocus
                                                    locale={ja}
                                                />
                                            </PopoverContent>
                                        </Popover>

                                        <span className="text-xs">~</span>

                                        {/* End Date Popover */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <div className="bg-white flex-1 h-[24px] border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50">
                                                    <span className="text-xs">{formatPeriodDisplay('end')}</span>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={getPeriodDate('end')}
                                                    onSelect={(d) => handleDateSelect('end', d)}
                                                    initialFocus
                                                    locale={ja}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </TableCell>

                            {/* Meals */}
                            <FindingCell colKey="meal_breakfast" className={inputCellBase} label="朝食">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.meal_breakfast || false} onChange={(e) => handleChange('meal_breakfast', e.target.checked)} />
                                </div>
                            </FindingCell>
                            <FindingCell colKey="meal_lunch" className={inputCellBase} label="昼食">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.meal_lunch || false} onChange={(e) => handleChange('meal_lunch', e.target.checked)} />
                                </div>
                            </FindingCell>
                            <FindingCell colKey="meal_dinner" className={inputCellBase} label="夕食">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.meal_dinner || false} onChange={(e) => handleChange('meal_dinner', e.target.checked)} />
                                </div>
                            </FindingCell>

                            {/* GH */}
                            <FindingCell colKey="is_gh" className={inputCellBase} label="GH">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.is_gh || false} onChange={(e) => handleChange('is_gh', e.target.checked)} />
                                </div>
                            </FindingCell>

                            {/* Day Activity */}
                            <FindingCell colKey="daytime_activity" className={inputCellBase} label="日中活動">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.daytime_activity === 'true'} onChange={(e) => handleChange('daytime_activity', e.target.checked ? 'true' : 'false')} />
                                </div>
                            </FindingCell>

                            {/* Other Welfare */}
                            <FindingCell colKey="other_welfare_service" className={inputCellBase} label="その他福祉">
                                <div className="px-1 py-1 h-full flex items-center">
                                    <Select value={formData.other_welfare_service || ""} onValueChange={(val) => handleChange('other_welfare_service', val === "none" ? null : val)}>
                                        <SelectTrigger className="w-full h-full min-h-[32px] text-xs border-0 bg-transparent p-0 justify-center focus:ring-0">
                                            <SelectValue placeholder="-" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-</SelectItem>
                                            <SelectItem value="生活介護">生活介護</SelectItem>
                                            <SelectItem value="居宅介護">居宅介護</SelectItem>
                                            <SelectItem value="重度訪問介護">重度訪問介護</SelectItem>
                                            <SelectItem value="行動援護">行動援護</SelectItem>
                                            <SelectItem value="移動支援">移動支援</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </FindingCell>

                            {/* Night GH */}
                            <FindingCell colKey="is_gh_night" className={inputCellBase} label="GH泊">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.is_gh_night || false} onChange={(e) => handleChange('is_gh_night', e.target.checked)} />
                                </div>
                            </FindingCell>

                            {/* Entry/Exit */}
                            <FindingCell colKey="entry_time" className="bg-white" label="入居時刻">
                                <Input type="time" className="h-full border-0 bg-transparent text-center p-0 text-xs" value={formData.entry_time || ''} onChange={(e) => handleChange('entry_time', e.target.value)} />
                            </FindingCell>
                            <FindingCell colKey="exit_time" className="bg-white" label="退居時刻">
                                <Input type="time" className="h-full border-0 bg-transparent text-center p-0 text-xs" value={formData.exit_time || ''} onChange={(e) => handleChange('exit_time', e.target.value)} />
                            </FindingCell>

                            {/* Meal Provided */}
                            <FindingCell colKey="meal_provided_lunch" className={inputCellBase} label="食事提供有">
                                <div className="flex justify-center items-center h-full">
                                    <input type="checkbox" className={checkboxClass} checked={formData.meal_provided_lunch || false} onChange={(e) => handleChange('meal_provided_lunch', e.target.checked)} />
                                </div>
                            </FindingCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <FindingSheet
                isOpen={findingState.isOpen}
                onClose={() => setFindingState(prev => ({ ...prev, isOpen: false }))}
                recordId={findingState.recordId}
                jsonPath={findingState.jsonPath}
                label={findingState.label}
                recordType="short_stay"
            />
        </div>
    )
}
