"use client"

import { useState, useTransition, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Coffee, Stethoscope, Trash2 } from "lucide-react"
import { upsertManualDeduction, deleteManualDeduction } from "@/app/actions/audit/manual"
import { toast } from "sonner"
import { ManualDeduction } from "@/types/audit"
import { addMinutes, format, parse } from "date-fns"

interface DeductionRow {
    id: string | number
    staffId: string
    reason: string // '休憩' | '医療連携' | 'その他'
    startTime: string
    endTime: string
    selected: boolean
    isNew: boolean
}

interface Props {
    targetDate: string
    staffList: { id: string, name: string }[]
    manualDeductions?: ManualDeduction[]
}

export function ManualDeductionDialog({ targetDate, staffList, manualDeductions = [] }: Props) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [rows, setRows] = useState<DeductionRow[]>([])

    // Initialize
    useEffect(() => {
        if (open) {
            if (manualDeductions && manualDeductions.length > 0) {
                const loaded: DeductionRow[] = manualDeductions.map(d => ({
                    id: d.id,
                    staffId: d.staff_id || "",
                    reason: d.reason || '休憩',
                    startTime: d.start_time,
                    endTime: d.end_time,
                    selected: false,
                    isNew: false
                }))
                // Add blank row
                const maxId = loaded.reduce((max: number, r) => (typeof r.id === 'number' && r.id > max ? r.id : max), 0)
                loaded.push({
                    id: maxId + 1,
                    staffId: "",
                    reason: "休憩",
                    startTime: "",
                    endTime: "",
                    selected: false,
                    isNew: true
                })
                setRows(loaded)
            } else {
                // Initialize with some blank rows
                const blanks = []
                for (let i = 0; i < 3; i++) {
                    blanks.push({
                        id: i,
                        staffId: "",
                        reason: "休憩",
                        startTime: "",
                        endTime: "",
                        selected: false,
                        isNew: true
                    })
                }
                setRows(blanks)
            }
        }
    }, [open, manualDeductions])

    const toggleSelectAll = (checked: boolean) => {
        setRows(rows.map(r => ({ ...r, selected: checked })))
    }

    const toggleRow = (id: string | number, checked: boolean) => {
        setRows(rows.map(r => r.id === id ? { ...r, selected: checked } : r))
    }

    const updateRow = (id: string | number, field: keyof DeductionRow, value: any) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const applyPreset = (type: 'break' | 'med4' | 'med5') => {
        let duration = 60
        let reason = '休憩'

        if (type === 'break') {
            duration = 60
            reason = '休憩'
        } else if (type === 'med4') {
            duration = 20
            reason = '医療連携'
        } else if (type === 'med5') {
            duration = 15
            reason = '医療連携'
        }

        setRows(rows.map(r => {
            if (!r.selected) return r;

            let start = r.startTime
            let end = r.endTime

            if (start) {
                try {
                    // Simple parse HH:mm
                    const [h, m] = start.split(':').map(Number)
                    const d = new Date()
                    d.setHours(h, m, 0, 0)
                    const dEnd = addMinutes(d, duration)
                    end = format(dEnd, 'HH:mm')
                } catch (e) { /* ignore */ }
            } else {
                if (type === 'break') {
                    start = '12:00'
                    end = '13:00'
                } else {
                    start = '14:00'
                    // Calculate default end based on duration
                    const d = new Date()
                    d.setHours(14, 0, 0, 0)
                    const dEnd = addMinutes(d, duration)
                    end = format(dEnd, 'HH:mm')
                }
            }

            return {
                ...r,
                reason,
                startTime: start,
                endTime: end
            }
        }))
    }

    const addRow = () => {
        const maxId = rows.reduce((max: number, r) => (typeof r.id === 'number' && r.id > max ? r.id : max), 0)
        setRows([...rows, {
            id: maxId + 1,
            staffId: "",
            reason: "休憩",
            startTime: "",
            endTime: "",
            selected: false,
            isNew: true
        }])
    }

    const handleDeleteRow = async (id: string | number) => {
        if (typeof id === 'string') {
            startTransition(async () => {
                const res = await deleteManualDeduction(id)
                if (res.error) toast.error("削除に失敗しました")
                else {
                    toast.success("削除しました")
                    setRows(rows.filter(r => r.id !== id))
                }
            })
        } else {
            setRows(rows.filter(r => r.id !== id))
        }
    }

    const handleSubmit = () => {
        const validRows = rows.filter(r => r.staffId && r.startTime && r.endTime)
        if (validRows.length === 0) {
            toast.error("有効なデータがありません")
            return
        }

        startTransition(async () => {
            let errorCount = 0
            await Promise.all(validRows.map(async (row) => {
                const res = await upsertManualDeduction({
                    id: typeof row.id === 'string' ? row.id : undefined,
                    staff_id: row.staffId,
                    target_date: targetDate,
                    start_time: row.startTime,
                    end_time: row.endTime,
                    reason: row.reason
                })
                if (res.error) errorCount++
            }))

            if (errorCount > 0) {
                toast.error(`${errorCount}件のエラーが発生しました`)
            } else {
                toast.success(`${validRows.length}件保存しました`)
                setOpen(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-red-700 bg-red-50 hover:bg-red-100 border-red-200">
                    控除追加 (手動)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[85vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-white shrink-0">
                    <DialogTitle>手動控除登録 ({targetDate})</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 py-3 px-6 bg-gray-50 border-b shrink-0">
                    <Button variant="outline" size="sm" onClick={() => applyPreset('break')} className="h-8 gap-1 bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
                        <Coffee className="h-3 w-3" /> 休憩 (60分)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('med4')} className="h-8 gap-1 bg-white border-green-200 text-green-700 hover:bg-green-50">
                        <Stethoscope className="h-3 w-3" /> 医療連携Ⅳ (20分)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('med5')} className="h-8 gap-1 bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <Stethoscope className="h-3 w-3" /> 医療連携Ⅴ (15分)
                    </Button>
                    <div className="ml-auto text-xs text-muted-foreground">
                        チェック項目に一括適用
                    </div>
                </div>

                <div className="grid grid-cols-[40px_180px_140px_160px_40px] gap-4 px-6 py-2 font-medium text-sm border-b bg-muted/20 shrink-0">
                    <Checkbox
                        checked={rows.length > 0 && rows.every(r => r.selected)}
                        onCheckedChange={(c) => toggleSelectAll(!!c)}
                    />
                    <div>スタッフ</div>
                    <div>控除区分</div>
                    <div>時間</div>
                    <div></div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-1 p-4 pb-20">
                        {rows.map((row) => (
                            <div key={row.id} className="grid grid-cols-[40px_180px_140px_160px_40px] items-center gap-4 p-2 rounded hover:bg-muted/50 transition-colors">
                                <Checkbox
                                    checked={row.selected}
                                    onCheckedChange={(c) => toggleRow(row.id, !!c)}
                                />
                                <div>
                                    <Select value={row.staffId} onValueChange={(v) => updateRow(row.id, 'staffId', v)}>
                                        <SelectTrigger className="h-9 w-full">
                                            <SelectValue placeholder="スタッフ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staffList.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Select value={row.reason} onValueChange={(v) => updateRow(row.id, 'reason', v)}>
                                        <SelectTrigger className="h-9 w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="休憩">休憩</SelectItem>
                                            <SelectItem value="医療連携">医療連携</SelectItem>
                                            <SelectItem value="その他">その他</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="time"
                                        className="h-9 px-2 text-center"
                                        value={row.startTime}
                                        onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                                    />
                                    <span className="text-gray-400">~</span>
                                    <Input
                                        type="time"
                                        className="h-9 px-2 text-center"
                                        value={row.endTime}
                                        onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteRow(row.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={addRow} className="w-full border-dashed border mt-2">
                            <Plus className="h-3 w-3 mr-2" /> 行を追加
                        </Button>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-white shrink-0 z-10 relative">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>キャンセル</Button>
                    <Button onClick={handleSubmit} disabled={isPending} className="min-w-[100px]">
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
