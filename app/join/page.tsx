'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle, UserPlus } from 'lucide-react'
import { validateInviteToken, signUpWithToken } from '@/app/actions/invite'

function JoinContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token') || ''

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [staffName, setStaffName] = useState<string | null>(null)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // トークン検証
    useEffect(() => {
        async function validate() {
            if (!token) {
                setError('無効なリンクです')
                setLoading(false)
                return
            }

            const result = await validateInviteToken(token)

            if (result.error) {
                setError(result.error)
            } else if (result.success) {
                setStaffName(result.staffName || null)
            }

            setLoading(false)
        }

        validate()
    }, [token])

    // 登録処理
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!email || !password) {
            setError('メールアドレスとパスワードを入力してください')
            return
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください')
            return
        }

        if (password !== confirmPassword) {
            setError('パスワードが一致しません')
            return
        }

        setSubmitting(true)

        const result = await signUpWithToken(token, email, password)

        if (result.error) {
            setError(result.error)
            setSubmitting(false)
        } else if (result.success) {
            setSuccess(true)
            setTimeout(() => {
                router.push(result.redirectTo || '/')
            }, 2000)
        }
    }

    // ローディング中
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
                    <p className="mt-2 text-gray-600">確認中...</p>
                </div>
            </div>
        )
    }

    // エラー（無効なトークン）
    if (error && !staffName) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-600">無効なリンク</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-500">
                            管理者に新しい招待リンクを発行してもらってください。
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 登録完了
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <CardTitle className="text-green-600">登録完了!</CardTitle>
                        <CardDescription>
                            {staffName} さんのアカウントが作成されました。<br />
                            ダッシュボードへ移動します...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // 登録フォーム
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <UserPlus className="h-10 w-10 text-blue-500 mx-auto mb-2" />
                    <CardTitle>{staffName} さんの登録</CardTitle>
                    <CardDescription>
                        ログイン用のメールアドレスとパスワードを設定してください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                required
                                disabled={submitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="6文字以上"
                                required
                                disabled={submitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="もう一度入力"
                                required
                                disabled={submitting}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    登録中...
                                </>
                            ) : (
                                '登録して利用開始'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

// ローディングフォールバック
function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-500" />
                <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
        </div>
    )
}

export default function JoinPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <JoinContent />
        </Suspense>
    )
}
