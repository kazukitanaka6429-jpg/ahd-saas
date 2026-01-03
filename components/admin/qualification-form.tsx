'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Qualification } from '@/types'
import { upsertQualification } from '@/app/actions/admin/qualifications'
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
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, '資格名は必須です'),
    is_medical_target: z.boolean().default(false),
})

type FormData = z.infer<typeof formSchema>

interface QualificationFormProps {
    initialData?: Qualification
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function QualificationForm({ initialData, trigger, onSuccess }: QualificationFormProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: initialData?.id,
            name: initialData?.name || '',
            is_medical_target: initialData?.is_medical_target || false,
        },
    })

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true)
        try {
            await upsertQualification(data)
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
                    <DialogTitle>{initialData ? '資格を編集' : '資格を登録'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>資格名</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="例: 看護師" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="is_medical_target"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            医療連携加算の対象資格とする
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            看護師・准看護師の場合にチェックしてください
                                        </p>
                                    </div>
                                </FormItem>
                            )}
                        />
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
