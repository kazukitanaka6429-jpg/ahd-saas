import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { RegisterForm } from './register-form'

export default async function InvitePage({
    params
}: {
    params: { token: string }
}) {
    // Await params as per Next.js 15+ changes, but using standard way usually works
    // For safety with async components in recent Checkpoint:
    const { token } = params

    const supabase = await createClient()

    // Validate Token checks
    const { data: invitation } = await supabase
        .from('invitations')
        .select('*, facilities(name)')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (!invitation) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-600 mb-4">無効な招待リンク</h1>
                    <p className="text-gray-600 mb-6">
                        この招待リンクは無効か、すでに使用されています。<br />
                        または期限切れの可能性があります。
                    </p>
                    <a href="/login" className="text-blue-500 hover:underline">ログインページへ</a>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">アカウント登録</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        以下の内容でアカウントを作成し、<br />
                        <strong>{invitation.facilities?.name}</strong> に参加します。
                    </p>
                </div>

                <div className="mb-6 bg-blue-50 p-4 rounded text-sm text-blue-800">
                    <dl className="grid grid-cols-3 gap-2">
                        <dt className="font-bold text-right">Email:</dt>
                        <dd className="col-span-2">{invitation.email}</dd>
                        <dt className="font-bold text-right">権限:</dt>
                        <dd className="col-span-2">
                            {invitation.role === 'manager' ? '管理者' : '一般職員'}
                        </dd>
                    </dl>
                </div>

                <RegisterForm invitation={invitation} />
            </div>
        </div>
    )
}
