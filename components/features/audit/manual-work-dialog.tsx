"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Sun, Moon, Trash2, RefreshCcw } from "lucide-react"
import { upsertManualWork, deleteManualWork } from "@/app/actions/audit/manual"
import { toast } from "sonner"
import { ManualWorkRecord } from "@/types/audit"
import { DailyShift } from "@/types"

interface WorkRow {
    id: string | number // number for new, string (uuid) for existing
    staffId: string
    startTime: string
    endTime: string
    note: string
    selected: boolean
    isNew: boolean
}

interface Props {
    targetDate: string
    staffList: { id: string, name: string }[]
    manualWorks?: ManualWorkRecord[]
    dailyShifts?: DailyShift[]
}

export function ManualWorkDialog({ targetDate, staffList, manualWorks = [], dailyShifts = [] }: Props) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [rows, setRows] = useState<WorkRow[]>([])

    // Logic to load from Daily Shifts
    const loadFromDailyShifts = useCallback(() => {
        const newRows: WorkRow[] = []
        let tempId = 0

        if (dailyShifts && dailyShifts.length > 0) {
            dailyShifts.forEach(shift => {
                // Day Staff (8:30 - 17:30)
                shift.day_staff_ids?.forEach(sid => {
                    newRows.push({
                        id: tempId++,
                        staffId: sid,
                        startTime: "08:30",
                        endTime: "17:30",
                        note: "日誌反映",
                        selected: false,
                        isNew: true
                    })
                })
                // Night Staff (16:30 - 09:30)
                shift.night_staff_ids?.forEach(sid => {
                    newRows.push({
                        id: tempId++,
                        staffId: sid,
                        startTime: "16:30",
                        endTime: "09:30",
                        note: "日誌反映",
                        selected: false,
                        isNew: true
                    })
                })
            })
        }

        // Always ensure at least 5 empty rows
        const needed = 5 - newRows.length
        if (needed > 0) {
            for (let i = 0; i < needed; i++) {
                newRows.push({
                    id: tempId++,
                    staffId: "",
                    startTime: "",
                    endTime: "",
                    note: "",
                    selected: false,
                    isNew: true
                })
            }
        } else {
            newRows.push({
                id: tempId++,
                staffId: "",
                startTime: "",
                endTime: "",
                note: "",
                selected: false,
                isNew: true
            })
        }

        setRows(newRows)
    }, [dailyShifts])

    const loadInitialData = useCallback(() => {
        if (manualWorks && manualWorks.length > 0) {
            const loaded: WorkRow[] = manualWorks.map(m => ({
                id: m.id,
                staffId: m.staff_id || "",
                startTime: m.start_time,
                endTime: m.end_time || "",
                note: m.note || "",
                selected: false,
                isNew: false
            }))

            // Add a blank row
            const maxId = loaded.reduce((max: number, r) => (typeof r.id === 'number' && r.id > max ? r.id : max), 0)
            loaded.push({
                id: maxId + 1,
                staffId: "",
                startTime: "",
                endTime: "",
                note: "",
                selected: false,
                isNew: true
            })
            setRows(loaded)
        } else {
            loadFromDailyShifts()
        }
    }, [manualWorks, loadFromDailyShifts])

    // Initialize Data on Open
    useEffect(() => {
        if (open) {
            loadInitialData()
        }
    }, [open, loadInitialData])

    const toggleSelectAll = (checked: boolean) => {
        setRows(rows.map(r => ({ ...r, selected: checked })))
    }

    const toggleRow = (id: string | number, checked: boolean) => {
        setRows(rows.map(r => r.id === id ? { ...r, selected: checked } : r))
    }

    const updateRow = (id: string | number, field: keyof WorkRow, value: any) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const applyPreset = (type: 'day' | 'night') => {
        const start = type === 'day' ? "08:30" : "16:30"
        const end = type === 'day' ? "17:30" : "09:30"
        setRows(rows.map(r => r.selected ? { ...r, startTime: start, endTime: end } : r))
    }

    const addRow = () => {
        const maxId = rows.reduce((max: number, r) => (typeof r.id === 'number' && r.id > max ? r.id : max), 0)
        setRows([...rows, {
            id: maxId + 1,
            staffId: "",
            startTime: "",
            endTime: "",
            note: "",
            selected: false,
            isNew: true
        }])
    }

    const handleDeleteRow = async (id: string | number) => {
        if (typeof id === 'string') {
            startTransition(async () => {
                const res = await deleteManualWork(id)
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
            let lastError = ""
            await Promise.all(validRows.map(async (row) => {
                const res = await upsertManualWork({
                    id: typeof row.id === 'string' ? row.id : undefined,
                    staff_id: row.staffId,
                    target_date: targetDate,
                    start_time: row.startTime,
                    end_time: row.endTime,
                    note: row.note
                })
                if (res.error) {
                    errorCount++
                    lastError = res.error
                }
            }))

            if (errorCount > 0) {
                toast.error(`${errorCount}件のエラーが発生しました: ${lastError}`)
            } else {
                toast.success(`${validRows.length}件保存しました`)
                setOpen(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> 勤務調整 (手動)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[85vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-white shrink-0">
                    <DialogTitle className="flex items-center justify-between">
                        <span>手動勤務調整 ({targetDate})</span>
                        <Button variant="ghost" size="sm" onClick={() => { loadFromDailyShifts(); toast.success("リセットしました"); }} className="text-xs text-muted-foreground gap-1 border">
                            <RefreshCcw className="h-3 w-3" /> 日誌からリセット
                        </Button>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 py-3 px-6 bg-gray-50 border-b shrink-0">
                    <Button variant="outline" size="sm" onClick={() => applyPreset('day')} className="h-8 gap-1 bg-white border-orange-200 text-orange-700 hover:bg-orange-50">
                        <Sun className="h-3 w-3" /> 日勤 (8:30-17:30)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('night')} className="h-8 gap-1 bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
                        <Moon className="h-3 w-3" /> 夜勤 (16:30-9:30)
                    </Button>
                    <div className="ml-auto text-xs text-muted-foreground">
                        チェック項目に一括適用
                    </div>
                </div>

                <div className="grid grid-cols-[40px_180px_260px_1fr_40px] gap-4 px-6 py-2 font-medium text-sm border-b bg-muted/20 shrink-0">
                    <Checkbox
                        checked={rows.length > 0 && rows.every(r => r.selected)}
                        onCheckedChange={(c) => toggleSelectAll(!!c)}
                    />
                    <div>スタッフ</div>
                    <div>時間</div>
                    <div>備考</div>
                    <div></div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-1 p-4 pb-20">
                        {rows.map((row) => (
                            <div key={row.id} className="grid grid-cols-[40px_180px_260px_1fr_40px] items-center gap-4 p-2 rounded hover:bg-muted/50 transition-colors">
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
                                <div>
                                    <Input
                                        placeholder="備考"
                                        className="h-9"
                                        value={row.note}
                                        onChange={(e) => updateRow(row.id, 'note', e.target.value)}
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
