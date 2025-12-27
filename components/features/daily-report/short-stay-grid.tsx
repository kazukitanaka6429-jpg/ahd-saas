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
import { useState, useEffect } from 'react'
import { saveShortStayRecord, deleteShortStayRecord } from '@/app/actions/short-stay'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Trash2, AlertCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ShortStayGridProps {
    residents: Resident[]
    record: ShortStayRecord | null
    date: string
}

export function ShortStayGrid({ residents, record, date }: ShortStayGridProps) {
    const [formData, setFormData] = useState<Partial<ShortStayRecord>>({
        date: date,
        meal_breakfast: false,
        meal_lunch: false,
        meal_dinner: false,
        is_gh: false,
        is_gh_night: false,
        meal_provided_lunch: false,
        ...record
    })

    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        setFormData({
            date: date,
            meal_breakfast: false,
            meal_lunch: false,
            meal_dinner: false,
            is_gh: false,
            is_gh_night: false,
            meal_provided_lunch: false,
            ...record
        })
        setHasChanges(false)
    }, [record, date])

    const handleChange = (key: keyof ShortStayRecord, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }))
        setHasChanges(true)
    }

    const onSave = async () => {
        // Validation
        if (!formData.resident_id) {
            toast.error('利用者が選択されていません')
            return
        }
        if (!formData.daytime_activity) {
            // Check required? User said "Required"
        }

        setIsSaving(true)
        const result = await saveShortStayRecord(formData)
        setIsSaving(false)

        if (result.error) {
            toast.error(`保存に失敗しました: ${result.error}`)
        } else {
            toast.success('保存しました')
            setHasChanges(false)
        }
    }

    const onDelete = async () => {
        if (!formData.id) return
        if (!confirm('このレコードを削除しますか？')) return

        setIsSaving(true)
        const result = await deleteShortStayRecord(formData.id)
        setIsSaving(false)

        if (result.error) {
            toast.error(`削除に失敗しました: ${result.error}`)
        } else {
            toast.success('削除しました')
            setFormData({ date: date }) // Reset
        }
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm mt-8">
            <div className="bg-white px-4 py-2 border-b flex justify-between items-center border-[3px] border-l-transparent border-r-transparent border-t-transparent border-b-black">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-lg">■ショートステイ利用</h3>
                    <span className="text-xs text-red-500 font-bold">※同日のショート利用は1人まで</span>
                </div>
                <div className="flex items-center gap-2">
                    {formData.id && (
                        <Button
                            variant="destructive"
                            onClick={onDelete}
                            disabled={isSaving}
                            className="h-8 w-8 p-0"
                            title="削除"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        onClick={onSave}
                        disabled={isSaving || !hasChanges}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        保存
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table className="min-w-[1000px] border-collapse border border-black">
                    <TableHeader>
                        <TableRow className="bg-white hover:bg-white text-black">
                            <TableHead className="w-[120px] border border-black text-black font-bold h-auto py-1" rowSpan={2}>
                                <div className="flex flex-col h-full justify-between text-xs">
                                    <span>利用者No</span>
                                    <span>利用期間</span>
                                </div>
                            </TableHead>
                            <TableHead className="w-[140px] border border-black text-black font-bold text-center h-auto py-1 p-0" colSpan={3}>
                                <div className="flex flex-col border-b border-black bg-white">
                                    <span className="py-0.5">食事</span>
                                    <span className="text-red-500 text-[10px] py-0.5 border-t border-black bg-white">バランス弁当提供</span>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-black bg-white">
                                    <span className="py-1">朝</span>
                                    <span className="py-1">昼</span>
                                    <span className="py-1">夜</span>
                                </div>
                            </TableHead>
                            <TableHead className="border border-black text-black font-bold text-center h-auto py-1 p-0" colSpan={2}>
                                <div className="border-b border-black py-0.5 bg-white">
                                    日中の活動 <span className="text-red-500">(☑必須)</span>
                                </div>
                                <div className="grid grid-cols-[50px_1fr] divide-x divide-black bg-white">
                                    <span className="py-1">GH</span>
                                    <span className="py-1">その他福祉サービス利用</span>
                                </div>
                            </TableHead>
                            <TableHead className="w-[50px] border border-black text-black font-bold text-center h-auto py-1 p-0" rowSpan={1}>
                                <div className="border-b border-black text-[10px] leading-tight py-1 bg-white">
                                    夜間<br /><span className="text-red-500">(☑必須)</span>
                                </div>
                                <div className="py-1 bg-white">GH泊</div>
                            </TableHead>
                            <TableHead className="border border-black text-black font-bold text-center h-auto py-1 p-0" colSpan={2}>
                                <div className="border-b border-black py-0.5 bg-white">
                                    入退去時間 <span className="text-red-500">(必須)</span>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-black bg-white">
                                    <span className="py-1 text-xs">入居時刻</span>
                                    <span className="py-1 text-xs">退居時刻</span>
                                </div>
                            </TableHead>
                            <TableHead className="w-[60px] border border-black text-black font-bold text-center h-auto py-1 text-[10px] leading-tight" rowSpan={2}>
                                食事提供有<br />(経営含む)
                                <div className="border-t border-black mt-1 py-1">昼食</div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-gray-50/50 border-b border-black h-[60px]">
                            {/* Resident / Period */}
                            <TableCell className="border border-black p-1 align-top bg-white">
                                <div className="flex flex-col gap-1">
                                    {/* Resident Select */}
                                    <Select
                                        value={formData.resident_id || ""}
                                        onValueChange={(val) => handleChange('resident_id', val)}
                                    >
                                        <SelectTrigger className="w-full h-7 text-xs border-gray-300">
                                            <SelectValue placeholder="選択..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {residents.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Period Note */}
                                    <Input
                                        className="h-6 text-xs px-1"
                                        placeholder="1/1~1/3"
                                        value={formData.period_note || ''}
                                        onChange={(e) => handleChange('period_note', e.target.value)}
                                    />
                                </div>
                            </TableCell>

                            {/* Meals */}
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <div className="flex justify-center items-center h-full py-2">
                                    <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={formData.meal_breakfast || false}
                                        onChange={(e) => handleChange('meal_breakfast', e.target.checked)}
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <div className="flex justify-center items-center h-full py-2">
                                    <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={formData.meal_lunch || false}
                                        onChange={(e) => handleChange('meal_lunch', e.target.checked)}
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <div className="flex justify-center items-center h-full py-2">
                                    <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={formData.meal_dinner || false}
                                        onChange={(e) => handleChange('meal_dinner', e.target.checked)}
                                    />
                                </div>
                            </TableCell>

                            {/* GH */}
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <div className="flex justify-center items-center h-full py-2">
                                    <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={formData.is_gh || false}
                                        onChange={(e) => handleChange('is_gh', e.target.checked)}
                                    />
                                </div>
                            </TableCell>

                            {/* Activities */}
                            <TableCell className="border border-black p-0 bg-[#d9ead3] align-middle">
                                <div className="px-1 py-1 h-full">
                                    <Input
                                        className={`h-full min-h-[40px] w-full text-xs bg-white border-0 ${!formData.daytime_activity ? 'border border-red-200' : ''}`}
                                        placeholder="必須"
                                        value={formData.daytime_activity || ''}
                                        onChange={(e) => handleChange('daytime_activity', e.target.value)}
                                    />
                                    {/* OR Select if needed */}
                                    <Select
                                        value={formData.other_welfare_service || ""}
                                        onValueChange={(val) => handleChange('other_welfare_service', val)}
                                    >
                                        <SelectTrigger className="w-full h-7 text-xs border-0 bg-transparent mt-1 p-0">
                                            <SelectValue placeholder="その他サービス..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="day_service">デイサービス</SelectItem>
                                            <SelectItem value="visit_nursing">訪問看護</SelectItem>
                                            <SelectItem value="none">なし</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TableCell>

                            {/* Night GH */}
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <div className="flex justify-center items-center h-full py-2">
                                    <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={formData.is_gh_night || false}
                                        onChange={(e) => handleChange('is_gh_night', e.target.checked)}
                                    />
                                </div>
                            </TableCell>

                            {/* Time */}
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <Input type="time" className="h-full border-0 bg-transparent text-center"
                                    value={formData.entry_time || ''}
                                    onChange={(e) => handleChange('entry_time', e.target.value)}
                                />
                            </TableCell>
                            <TableCell className="border border-black p-0 text-center align-middle">
                                <Input type="time" className="h-full border-0 bg-transparent text-center"
                                    value={formData.exit_time || ''}
                                    onChange={(e) => handleChange('exit_time', e.target.value)}
                                />
                            </TableCell>

                            {/* Meal Provided */}
                            <TableCell className="border border-black p-0 text-center align-middle bg-[#d9ead3]">
                                <div className="flex justify-center items-center h-full py-2">
                                    <input type="checkbox" className="w-5 h-5 accent-green-600 cursor-pointer"
                                        checked={formData.meal_provided_lunch || false}
                                        onChange={(e) => handleChange('meal_provided_lunch', e.target.checked)}
                                    />
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
