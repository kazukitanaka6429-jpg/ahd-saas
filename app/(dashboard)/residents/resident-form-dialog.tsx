'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Loader2 } from 'lucide-react'
import { createResident, updateResident, ResidentInput } from '@/app/actions/resident'
import { toast } from "sonner"
import { createClient } from '@/lib/supabase/client'
import { Facility } from '@/types'
import { getUnits, Unit } from '@/app/actions/units'

interface ResidentFormDialogProps {
    currentStaff?: any;
    initialData?: any;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ResidentFormDialog({ currentStaff, initialData, trigger, open: controlledOpen, onOpenChange }: ResidentFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    // New: Track selected facility ID to filter units
    const [selectedFacilityId, setSelectedFacilityId] = useState<string | undefined>(
        initialData?.facility_id || currentStaff?.facility_id
    )

    const isEdit = !!initialData

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            // Admin: Fetch Facilities
            if (currentStaff?.role === 'admin') {
                const { data } = await supabase.from('facilities').select('*')
                if (data) setFacilities(data)
            }
        }
        if (open) fetchData()
    }, [open, currentStaff])

    // Fetch units whenever selectedFacilityId changes
    useEffect(() => {
        const fetchUnitsData = async () => {
            if (!selectedFacilityId) {
                setUnits([])
                return
            }
            const unitRes = await getUnits(selectedFacilityId) // Pass facilityId
            if (unitRes.data) setUnits(unitRes.data)
        }
        if (open) fetchUnitsData()
    }, [open, selectedFacilityId])

    const handleFacilityChange = (value: string) => {
        setSelectedFacilityId(value)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)

        // Map form data to ResidentInput
        const displayIdValue = formData.get('display_id') as string
        const unitIdValue = formData.get('unit_id') as string // 'none' or UUID or null
        const payload: ResidentInput = {
            facility_id: formData.get('facility_id') as string || undefined,
            unit_id: (unitIdValue && unitIdValue !== 'none') ? unitIdValue : null,
            display_id: displayIdValue ? parseInt(displayIdValue) : undefined,
            name: formData.get('name') as string,
            status: formData.get('status') as 'in_facility' | 'hospitalized' | 'home_stay' | 'left' | 'deceased',
            care_level: formData.get('classification') as string || undefined, // UI uses classification
            start_date: formData.get('start_date') as string || undefined,
            // direct_debit_start_date removed as per schema
            primary_insurance: formData.get('primary_insurance') as string || undefined,
            limit_application_class: formData.get('limit_application_class') as string || undefined,
            public_expense_1: formData.get('public_expense_1') as string || undefined,
            public_expense_2: formData.get('public_expense_2') as string || undefined,

            // Checkboxes
            // formData.get('key') returns 'on' if checked, null if not.
            // But Checkbox component might not send 'on'.
            // Standard form submission behavior: unchecked checkboxes are not sent.
            table_7: formData.get('table_7') === 'on',
            table_8: formData.get('table_8') === 'on',
            ventilator: formData.get('ventilator') === 'on',
            severe_disability_addition: formData.get('severe_disability_addition') === 'on',
            sputum_suction: formData.get('sputum_suction') === 'on',
        }

        let result
        if (isEdit && initialData?.id) {
            result = await updateResident(initialData.id, payload)
        } else {
            result = await createResident(payload)
        }

        if (result.error) {
            setError(result.error)
            toast.error(result.error)
        } else {
            setOpen(false)
            toast.success(isEdit ? '利用者情報を更新しました。' : '新しい利用者を登録しました。')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            {!trigger && !isControlled && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        利用者を追加
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? '利用者情報の編集' : '新しい利用者を登録'}</DialogTitle>
                        <DialogDescription>
                            必要な情報を入力してください。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        {/* 施設選択 (管理者のみ) */}
                        {currentStaff?.role === 'admin' && (
                            <div className="grid grid-cols-4 items-center gap-4 mb-4">
                                <Label htmlFor="facility_id" className="text-right col-span-1">施設</Label>
                                <Select name="facility_id" value={selectedFacilityId} onValueChange={handleFacilityChange}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="施設を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {facilities.map(f => (
                                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* ユニット選択 (ユニットがある場合のみ表示) */}
                        {units.length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4 mb-4">
                                <Label htmlFor="unit_id" className="text-right col-span-1">所属ユニット</Label>
                                <Select name="unit_id" defaultValue={initialData?.unit_id || undefined}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="ユニットを選択 (未所属可)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">未所属</SelectItem>
                                        {units.map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="display_id">表示ID <span className="text-red-500">*</span></Label>
                                <Input
                                    id="display_id"
                                    name="display_id"
                                    type="number"
                                    required
                                    min={1}
                                    placeholder="例: 101"
                                    defaultValue={initialData?.display_id}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">氏名 <span className="text-red-500">*</span></Label>
                                <Input id="name" name="name" required placeholder="例: 田中 トメ" defaultValue={initialData?.name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_date">入居日 <span className="text-red-500">*</span></Label>
                                <Input id="start_date" name="start_date" type="date" required defaultValue={initialData?.start_date} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="primary_insurance">主保険</Label>
                                <Select name="primary_insurance" defaultValue={initialData?.primary_insurance || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="国保">国保</SelectItem>
                                        <SelectItem value="社保">社保</SelectItem>
                                        <SelectItem value="生保単独">生保単独</SelectItem>
                                        <SelectItem value="その他">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="limit_application_class">限度額適用区分</Label>
                                <Select name="limit_application_class" defaultValue={initialData?.limit_application_class || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ア">ア</SelectItem>
                                        <SelectItem value="イ">イ</SelectItem>
                                        <SelectItem value="ウ">ウ</SelectItem>
                                        <SelectItem value="エ">エ</SelectItem>
                                        <SelectItem value="オ">オ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="public_expense_1">第1公費</Label>
                                <Select name="public_expense_1" defaultValue={initialData?.public_expense_1 || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="難病">難病</SelectItem>
                                        <SelectItem value="小慢">小慢</SelectItem>
                                        <SelectItem value="その他">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="public_expense_2">第2公費</Label>
                                <Select name="public_expense_2" defaultValue={initialData?.public_expense_2 || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="有(償還払い無)">有(償還払い無)</SelectItem>
                                        <SelectItem value="有(償還払い有)">有(償還払い有)</SelectItem>
                                        <SelectItem value="有(自己負担無)">有(自己負担無)</SelectItem>
                                        <SelectItem value="有(自己負担有)">有(自己負担有)</SelectItem>
                                        <SelectItem value="無">無</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* DB column is care_level, use classification name in UI */}
                            <div className="space-y-2">
                                <Label htmlFor="classification">区分</Label>
                                <Select name="classification" defaultValue={initialData?.care_level || initialData?.classification || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="6">6</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">状況</Label>
                                <Select name="status" defaultValue={initialData?.status || "in_facility"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="状況を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_facility">入所中</SelectItem>
                                        <SelectItem value="hospitalized">入院中</SelectItem>
                                        <SelectItem value="home_stay">外泊中</SelectItem>
                                        <SelectItem value="left">退去</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label>加算・特記事項</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="table_7" name="table_7" defaultChecked={initialData?.table_7} />
                                    <label htmlFor="table_7" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">別表7</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="table_8" name="table_8" defaultChecked={initialData?.table_8} />
                                    <label htmlFor="table_8" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">別表8</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="ventilator" name="ventilator" defaultChecked={initialData?.ventilator} />
                                    <label htmlFor="ventilator" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">人工呼吸器</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="severe_disability_addition" name="severe_disability_addition" defaultChecked={initialData?.severe_disability_addition} />
                                    <label htmlFor="severe_disability_addition" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">重度加算</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="sputum_suction" name="sputum_suction" defaultChecked={initialData?.sputum_suction} />
                                    <label htmlFor="sputum_suction" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">喀痰吸引</label>
                                </div>
                            </div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存する
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
