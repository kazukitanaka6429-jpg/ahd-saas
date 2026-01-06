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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createNotification, Priority } from '@/app/actions/notifications'
import { Loader2, Send } from 'lucide-react'

export function CreateNotificationModal() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    //   const { toast } = useToast() // Commented out until verified, will use alert or just console if missing

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await createNotification(formData)

        setLoading(false)

        if (result.error) {
            alert('送信に失敗しました: ' + result.error)
        } else {
            setOpen(false)
            // toast({ title: "送信しました", description: "本社へ連絡を送信しました。" })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Send className="h-4 w-4" />
                    本社へ連絡
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>本社へ連絡</DialogTitle>
                    <DialogDescription>
                        重要な連絡事項を送信してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="priority">重要度</Label>
                            <Select name="priority" defaultValue="normal">
                                <SelectTrigger>
                                    <SelectValue placeholder="重要度を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">低 (Low)</SelectItem>
                                    <SelectItem value="normal">普通 (Normal)</SelectItem>
                                    <SelectItem value="high" className="text-red-600 font-bold">高 (High)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="content">内容</Label>
                            <Textarea
                                id="content"
                                name="content"
                                placeholder="連絡事項を入力してください..."
                                required
                                className="h-32"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            送信
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
