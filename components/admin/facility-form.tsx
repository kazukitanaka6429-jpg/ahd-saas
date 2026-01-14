'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Facility } from '@/types'
import { createFacility, updateFacility } from '@/app/actions/facility'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, '施設名は必須です'),
    code: z.string().min(1, '施設コードは必須です'),
    provider_number: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface FacilityFormProps {
    initialData?: Facility
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function FacilityForm({ initialData, trigger, onSuccess }: FacilityFormProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: initialData?.id,
            name: initialData?.name || '',
            code: initialData?.code || '',
            provider_number: initialData?.provider_number || '',
        },
    })

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            if (initialData?.id) {
                await updateFacility(initialData.id, data)
            } else {
                await createFacility(data)
            }
            toast.success('保存しました')
            setOpen(false)
            form.reset()
            onSuccess?.()
        } catch (error) {
            toast.error('保存に失敗しました')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // State for Units
    const [units, setUnits] = useState<any[]>([])
    const [loadingUnits, setLoadingUnits] = useState(false)
    const [newUnitName, setNewUnitName] = useState('')
    const [newUnitOrder, setNewUnitOrder] = useState('0')
    const [isProcessingUnit, setIsProcessingUnit] = useState(false)

    // Fetch units when dialog opens in Edit mode
    const fetchUnits = async () => {
        if (!initialData?.id) return
        setLoadingUnits(true)
        const { getUnits } = await import('@/app/actions/units')
        const result = await getUnits(initialData.id)
        if (result.data) {
            setUnits(result.data)
        }
        setLoadingUnits(false)
    }

    const onOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen && initialData?.id) {
            fetchUnits()
        }
    }

    const handleAddUnit = async () => {
        if (!initialData?.id || !newUnitName) return
        setIsProcessingUnit(true)
        const { upsertUnit } = await import('@/app/actions/units')

        const formData = new FormData()
        formData.append('facility_id', initialData.id)
        formData.append('name', newUnitName)
        formData.append('display_order', newUnitOrder)

        const result = await upsertUnit(null, formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('ユニットを追加しました')
            setNewUnitName('')
            await fetchUnits()
        }
        setIsProcessingUnit(false)
    }

    const handleDeleteUnit = async (unitId: string) => {
        if (!confirm('このユニットを削除しますか？')) return
        setIsProcessingUnit(true)
        const { deleteUnit } = await import('@/app/actions/units')

        const formData = new FormData()
        formData.append('id', unitId)

        const result = await deleteUnit(null, formData)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('ユニットを削除しました')
            await fetchUnits()
        }
        setIsProcessingUnit(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger || <Button size="sm"><Plus className="w-4 h-4 mr-2" />新規登録</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? '施設を編集' : '施設を登録'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>施設名</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="例: ABCホーム" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>施設コード</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="例: ABC001" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="provider_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>事業所番号</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="例: 1234567890" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end pt-4 border-b pb-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                施設情報を保存
                            </Button>
                        </div>
                    </form>
                </Form>

                {/* Unit Management Section - Only for Edit Mode */}
                {initialData?.id ? (
                    <div className="space-y-4 pt-4">
                        <div>
                            <h3 className="text-lg font-medium">ユニット設定</h3>
                            <p className="text-sm text-muted-foreground">この施設のユニットを管理します。</p>
                        </div>

                        {/* Validated Unit List */}
                        <div className="space-y-2">
                            {loadingUnits ? (
                                <div className="text-center py-4"><Loader2 className="animate-spin h-5 w-5 mx-auto" /></div>
                            ) : units.length === 0 ? (
                                <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">ユニットは登録されていません</div>
                            ) : (
                                <div className="border rounded divide-y">
                                    {units.map((unit) => (
                                        <div key={unit.id} className="flex items-center justify-between p-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded w-8 text-center">{unit.display_order}</span>
                                                <span className="font-medium">{unit.name}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 h-8 w-8 p-0"
                                                onClick={() => handleDeleteUnit(unit.id)}
                                                disabled={isProcessingUnit}
                                            >
                                                <Loader2 className={`h-4 w-4 ${isProcessingUnit ? 'animate-spin' : 'hidden'}`} />
                                                {!isProcessingUnit && <span className="text-lg">×</span>}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Unit Form */}
                        <div className="flex gap-2 items-end bg-gray-50 p-3 rounded border">
                            <div className="w-20">
                                <label className="text-xs mb-1 block">順序</label>
                                <Input
                                    type="number"
                                    value={newUnitOrder}
                                    onChange={(e) => setNewUnitOrder(e.target.value)}
                                    className="bg-white h-8"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs mb-1 block">ユニット名</label>
                                <Input
                                    value={newUnitName}
                                    onChange={(e) => setNewUnitName(e.target.value)}
                                    placeholder="新規ユニット名"
                                    className="bg-white h-8"
                                />
                            </div>
                            <Button
                                size="sm"
                                onClick={handleAddUnit}
                                disabled={!newUnitName || isProcessingUnit}
                                className="h-8"
                            >
                                {isProcessingUnit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                                追加
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm mt-4">
                        ※ ユニットの登録は、施設情報を保存した後に行えます。
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
