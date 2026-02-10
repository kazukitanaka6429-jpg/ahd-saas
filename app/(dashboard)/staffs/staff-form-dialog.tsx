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
import { Plus, Loader2 } from 'lucide-react'
import { createStaff, updateStaff } from '@/app/actions/staff'
import { toast } from "sonner"
import { createClient } from '@/lib/supabase/client'
import { Facility, Qualification } from '@/types'
import { Checkbox } from "@/components/ui/checkbox"

interface StaffFormDialogProps {
    currentStaff?: any; // 操作・閲覧しているユーザー（権限チェック用）
    initialData?: any;  // 編集対象のデータ（なければ新規作成）
    trigger?: React.ReactNode; // カスタムトリガー（編集ボタンなど）
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function StaffFormDialog({ currentStaff, initialData, trigger, open: controlledOpen, onOpenChange }: StaffFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange! : setInternalOpen

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [qualifications, setQualifications] = useState<Qualification[]>([])

    // State for multi-select job types
    const jobTypesOptions = ['看護管理者', '看護', '介護管理者', 'サービス管理責任者', '介護']
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])

    // State for qualification selection
    const [qualificationId, setQualificationId] = useState<string | undefined>(undefined)
    const [qualificationKey, setQualificationKey] = useState(0)

    const isEdit = !!initialData

    // マスタデータの取得
    useEffect(() => {
        const fetchMasters = async () => {
            const supabase = createClient()

            // 施設取得 (管理者以上)
            if (currentStaff?.role === 'admin' || currentStaff?.role === 'manager') {
                const { data: facilitiesData } = await supabase.from('facilities').select('*')
                if (facilitiesData) setFacilities(facilitiesData as Facility[])
            }

            // 資格取得
            const { data: qualsData } = await supabase
                .from('qualifications')
                .select('*')
                .order('is_medical_coord_iv_target', { ascending: false })
                .order('name')
            if (qualsData) setQualifications(qualsData as Qualification[])
        }

        if (open) {
            fetchMasters()
            // 初期データセット
            if (initialData) {
                // job_typesがJSON文字列で保存されている場合と配列の場合があるため吸収する
                let types: string[] = []
                if (Array.isArray(initialData.job_types)) {
                    types = initialData.job_types
                } else if (typeof initialData.job_types === 'string') {
                    try {
                        const parsed = JSON.parse(initialData.job_types)
                        if (Array.isArray(parsed)) types = parsed
                    } catch (e) {
                        // パースエラーなら単一の文字列か何かかも知れないが一旦無視
                        console.error('Failed to parse job_types', e)
                    }
                }
                setSelectedJobTypes(types)
            } else {
                setSelectedJobTypes([])
            }
            // Initialize qualification
            setQualificationId(initialData?.qualification_id)
            setQualificationKey(prev => prev + 1) // Force re-render to ensure default value is respected or cleared
        }
    }, [open, currentStaff, initialData])

    const toggleJobType = (job: string) => {
        setSelectedJobTypes(prev =>
            prev.includes(job) ? prev.filter(j => j !== job) : [...prev, job]
        )
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string
        const role = formData.get('role') as 'admin' | 'manager' | 'staff'
        const rawFacilityId = formData.get('facility_id') as string
        const facilityId = rawFacilityId === 'hq' ? null : rawFacilityId

        // Qualification ID logic handled by state 'qualificationId'
        // Job Types handled by state 'selectedJobTypes'

        const payload = {
            name,
            role,
            facility_id: facilityId,
            qualification_id: qualificationId || null,
            job_types: selectedJobTypes,
        }

        let result
        if (isEdit) {
            result = await updateStaff(initialData.id, payload)
        } else {
            result = await createStaff(payload)
        }

        if (result.error) {
            setError(result.error)
            toast.error(result.error)
        } else {
            setOpen(false)
            toast.success(isEdit ? '職員情報を更新しました。' : '新しい職員を登録しました。')
        }
        setLoading(false)
    }

    const showFacilitySelect = currentStaff?.role === 'admin' || currentStaff?.role === 'manager'

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            {!trigger && !isControlled && (
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        職員を追加
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? '職員情報の編集' : '新しい職員を登録'}</DialogTitle>
                        <DialogDescription>
                            基本情報を入力して「保存」をクリックしてください。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        {/* 施設選択 (管理者のみ) */}
                        {showFacilitySelect && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="facility_id" className="text-right">施設</Label>
                                <Select name="facility_id" defaultValue={initialData?.facility_id ?? (currentStaff?.facility_id ?? "hq")}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="施設を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hq">本社 (施設所属なし)</SelectItem>
                                        {facilities.map(f => (
                                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                氏名
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={initialData?.name}
                                placeholder="例: 山田 花子"
                                className="col-span-3"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="join_date" className="text-right">
                                入社年月日
                            </Label>
                            <Input
                                id="join_date"
                                name="join_date"
                                type="date"
                                defaultValue={initialData?.join_date}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="leave_date" className="text-right">
                                退社年月日
                            </Label>
                            <Input
                                id="leave_date"
                                name="leave_date"
                                type="date"
                                defaultValue={initialData?.leave_date}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">職種</Label>
                            <div className="col-span-3 flex flex-wrap gap-4 pt-1">
                                {jobTypesOptions.map(job => (
                                    <div key={job} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`job-${job}`}
                                            checked={selectedJobTypes.includes(job)}
                                            onCheckedChange={() => toggleJobType(job)}
                                        />
                                        <label htmlFor={`job-${job}`} className="text-sm cursor-pointer">{job}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="qualification_id" className="text-right">資格</Label>
                            <div className="col-span-3 flex gap-2">
                                <Select
                                    key={qualificationKey}
                                    name="qualification_id"
                                    value={qualificationId}
                                    onValueChange={setQualificationId}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="資格を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {qualifications.map(q => (
                                            <SelectItem key={q.id} value={q.id}>
                                                {q.name}
                                                {q.is_medical_coord_iv_target && <span className="ml-2 text-xs text-green-600">(対象)</span>}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        setQualificationId(undefined)
                                        setQualificationKey(prev => prev + 1)
                                    }}
                                    title="選択解除"
                                >
                                    <span className="text-lg">×</span>
                                </Button>
                                <input type="hidden" name="qualification_id" value={qualificationId || ''} />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                システム権限
                            </Label>
                            <Select name="role" defaultValue={initialData?.role || "staff"}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="役割を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="staff">一般職員</SelectItem>
                                    <SelectItem value="manager">管理者</SelectItem>
                                    <SelectItem value="admin">システム管理者</SelectItem>
                                </SelectContent>
                            </Select>
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
