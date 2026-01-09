'use client'

import { useState } from 'react'
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
import { Plus, Loader2, Edit } from 'lucide-react'
import { createFacility, updateFacility } from '@/app/actions/facility'
import { toast } from "sonner"
import { Facility } from '@/types'

interface FacilityFormDialogProps {
    initialData?: Facility
    trigger?: React.ReactNode
}

export function FacilityFormDialog({ initialData, trigger }: FacilityFormDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEdit = !!initialData

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const payload = {
            name: formData.get('name') as string,
            code: formData.get('code') as string,
            provider_number: formData.get('provider_number') as string
        }

        let result
        if (isEdit && initialData) {
            result = await updateFacility(initialData.id, payload)
        } else {
            result = await createFacility(payload)
        }

        if (result.error) {
            setError(result.error)
            toast.error(result.error)
        } else {
            setOpen(false)
            toast.success(isEdit ? '施設情報を更新しました。' : '新しい施設を登録しました。')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        施設を追加
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? '施設情報の編集' : '新しい施設を登録'}</DialogTitle>
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
                                施設名
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={initialData?.name}
                                placeholder="例: ひまわりケアセンター"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">
                                施設コード
                            </Label>
                            <Input
                                id="code"
                                name="code"
                                defaultValue={initialData?.code}
                                placeholder="例: HIMAWARI_001"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="provider_number" className="text-right">
                                事業所番号
                            </Label>
                            <Input
                                id="provider_number"
                                name="provider_number"
                                defaultValue={initialData?.provider_number || ''}
                                placeholder="例: 1234567890"
                                className="col-span-3"
                            />
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
