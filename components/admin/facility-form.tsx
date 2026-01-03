'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Facility } from '@/types'
import { upsertFacility } from '@/app/actions/admin/facilities'
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
            await upsertFacility(data)
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button size="sm"><Plus className="w-4 h-4 mr-2" />新規登録</Button>}
            </DialogTrigger>
            <DialogContent>
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
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                保存
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
