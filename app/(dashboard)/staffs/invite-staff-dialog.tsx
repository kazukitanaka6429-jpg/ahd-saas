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
import { useState } from 'react'
import { toast } from 'sonner'
import { inviteStaff } from '@/app/actions/admin-auth'
import { Mail, Loader2, Copy, CheckCircle } from 'lucide-react'

interface InviteStaffDialogProps {
    staffId: string
    staffName: string
    defaultEmail?: string | null
}

export function InviteStaffDialog({ staffId, staffName, defaultEmail }: InviteStaffDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState(defaultEmail || '')
    const [passwordResetLink, setPasswordResetLink] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email) {
            toast.error('メールアドレスを入力してください')
            return
        }

        setLoading(true)
        const result = await inviteStaff(email, staffId) as any
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            setSuccess(true)
            toast.success(result.message || 'アカウントを作成しました')

            // パスワードリセットリンクがある場合は表示
            if (result.passwordResetLink) {
                setPasswordResetLink(result.passwordResetLink)
            } else {
                // リンクがない場合は少し待ってから閉じる
                setTimeout(() => {
                    setOpen(false)
                    resetState()
                }, 1500)
            }
        }
    }

    const handleCopy = () => {
        if (passwordResetLink) {
            navigator.clipboard.writeText(passwordResetLink)
            toast.success('リンクをコピーしました')
        }
    }

    const resetState = () => {
        setPasswordResetLink(null)
        setSuccess(false)
        setEmail(defaultEmail || '')
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            resetState()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    招待
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {success ? '✅ アカウント作成完了' : 'アカウント招待'}
                    </DialogTitle>
                    <DialogDescription>
                        {success ? (
                            passwordResetLink ? (
                                <>
                                    <strong>{staffName}</strong> さんのアカウントを作成しました。<br />
                                    以下のリンクを本人に共有してください。
                                </>
                            ) : (
                                <>
                                    <strong>{staffName}</strong> さんのアカウントを作成しました。
                                </>
                            )
                        ) : (
                            <>
                                <strong>{staffName}</strong> さんにログインアカウントを発行します。
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {!success ? (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="invite-email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    required
                                    className="col-span-3"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={loading} className="gap-2">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        作成中...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="h-4 w-4" />
                                        アカウント作成
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : passwordResetLink ? (
                    <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-xs text-muted-foreground mb-2">パスワード設定リンク:</p>
                            <p className="text-sm font-mono break-all">{passwordResetLink}</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                閉じる
                            </Button>
                            <Button onClick={handleCopy} className="gap-2">
                                <Copy className="h-4 w-4" />
                                リンクをコピー
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
