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
import { createStaff } from './actions'
import { toast } from "sonner"
import { createClient } from '@/lib/supabase/client'
import { Facility } from '@/types'
import { Checkbox } from "@/components/ui/checkbox"

export function CreateStaffDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [facilities, setFacilities] = useState<Facility[]>([])

    // State for multi-select job types
    const jobTypesOptions = ['看護管理者', '看護', '介護管理者', 'サービス管理責任者', '介護']
    const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([])

    useEffect(() => {
        const fetchFacilities = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('facilities').select('*')
            if (data) setFacilities(data)
        }
        if (open) {
            fetchFacilities()
            setSelectedJobTypes([]) // Reset on open
        }
    }, [open])

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
        // Manually append array data
        formData.delete('job_types')
        formData.append('job_types', JSON.stringify(selectedJobTypes))

        const result = await createStaff(formData)

        if (result.error) {
            setError(result.error)
            toast.error(result.error)
        } else {
            setOpen(false)
            toast.success('新しい職員を登録しました。')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    職員を追加
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>新しい職員を登録</DialogTitle>
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

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                氏名
                            </Label>
                            <Input
                                id="name"
                                name="name"
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
                            <Label htmlFor="qualifications" className="text-right">资格</Label>
                            <Select name="qualifications">
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="資格を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="看護師">看護師</SelectItem>
                                    <SelectItem value="准看護師">准看護師</SelectItem>
                                    <SelectItem value="介護福祉士">介護福祉士</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                システム権限
                            </Label>
                            <Select name="role" defaultValue="staff">
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
