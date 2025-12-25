'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { registerUser } from './actions'
import { useRouter } from 'next/navigation'

export function RegisterForm({ invitation }: { invitation: any }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        const password = formData.get('password') as string
        const name = formData.get('name') as string

        if (password.length < 6) {
            toast.error('パスワードは6文字以上で入力してください')
            setLoading(false)
            return
        }

        const result = await registerUser(invitation.token, password, name)

        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success('アカウント登録が完了しました！')
            router.push('/')
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">氏名</Label>
                <Input id="name" name="name" required placeholder="例: 山田 花子" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">パスワード設定</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="6文字以上のパスワード"
                />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登録中...' : '登録して利用開始'}
            </Button>
        </form>
    )
}
