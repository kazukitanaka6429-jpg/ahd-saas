'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'

export function UpdatePasswordForm() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 8) {
            toast.error('パスワードは8文字以上で入力してください')
            return
        }

        if (password !== confirmPassword) {
            toast.error('パスワードが一致しません')
            return
        }

        setLoading(true)
        const supabase = createClient()

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        setLoading(false)

        if (error) {
            console.error('Password Update Error:', error)
            toast.error(`パスワード設定に失敗しました: ${error.message}`)
            return
        }

        toast.success('パスワードを設定しました。ダッシュボードに移動します。')
        router.push('/')
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">新しいパスワード</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="8文字以上"
                        required
                        minLength={8}
                        disabled={loading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">パスワード（確認）</Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="もう一度入力"
                        required
                        minLength={8}
                        disabled={loading}
                    />
                </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        設定中...
                    </>
                ) : (
                    <>
                        <Lock className="h-4 w-4" />
                        パスワードを設定
                    </>
                )}
            </Button>
        </form>
    )
}
