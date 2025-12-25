'use client'

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
} from '@/components/ui/select'
import { useState } from 'react'
import { toast } from 'sonner'
import { createInvitation } from './actions'
import { Copy, Mail } from 'lucide-react'

export function InviteDialog() {
    const [open, setOpen] = useState(false)
    const [inviteLink, setInviteLink] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        const result = await createInvitation(formData)
        if (result.error) {
            toast.error(result.error)
        } else if (result.link) {
            setInviteLink(result.link)
            toast.success(result.isResend ? '既存の招待リンクを取得しました' : '招待リンクを生成しました')
        }
    }

    const handleCopy = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink)
            toast.success('リンクをコピーしました')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" />
                    職員を招待
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>新規職員の招待</DialogTitle>
                    <DialogDescription>
                        招待メールアドレスと権限を入力してください。<br />
                        メール送信サーバー未設定のため、生成されたリンクを手動で共有してください。
                    </DialogDescription>
                </DialogHeader>

                {!inviteLink ? (
                    <form action={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input id="email" name="email" type="email" required className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    権限
                                </Label>
                                <Select name="role" defaultValue="staff">
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="権限を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">一般 (自施設の実務のみ)</SelectItem>
                                        <SelectItem value="manager">管理者 (自施設の管理が可能)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">招待リンク生成</Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-muted rounded break-all text-sm font-mono">
                            {inviteLink}
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setInviteLink(null)}>戻る</Button>
                            <Button onClick={handleCopy} className="gap-2">
                                <Copy className="h-4 w-4" />
                                リンクをコピー
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
