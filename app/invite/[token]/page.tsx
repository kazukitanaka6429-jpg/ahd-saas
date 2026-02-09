import { createAdminClient } from '@/lib/supabase/admin'
import { RegisterForm } from './register-form'
import { notFound } from 'next/navigation'

export default async function InvitePage({
    params
}: {
    params: { token: string }
}) {
    const { token } = params

    // Admin Client to bypass RLS for token lookup
    const supabase = createAdminClient()

    // 1. Find Staff by Token
    const { data: staff } = await supabase
        .from('staffs')
        .select(`
            id,
            name,
            email,
            role,
            auth_user_id,
            invite_token,
            facilities ( name )
        `)
        .eq('invite_token', token)
        .single()

    // 2. Validate
    // - Must exist
    // - Must not be already registered (auth_user_id is not null)
    // - (Optional) Expiration check if column existed

    const isValid = staff && !staff.auth_user_id

    if (!isValid) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <h1 className="text-xl font-bold text-red-600 mb-4">無効な招待リンク</h1>
                    <p className="text-gray-600 mb-6">
                        この招待リンクは無効か、すでに使用されています。<br />
                        または管理者が再発行した可能性があります。
                    </p>
                    <a href="/login" className="text-blue-500 hover:underline">ログインページへ</a>
                </div>
            </div>
        )
    }

    // Determine facility name
    // @ts-ignore - Supabase type for relation might be array or object depending on schema
    const facilityName = staff.facilities?.name || '未設定'

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">アカウント登録</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        以下の内容でアカウントを作成し、<br />
                        <strong>{facilityName}</strong> に参加します。
                    </p>
                </div>

                <div className="mb-6 bg-blue-50 p-4 rounded text-sm text-blue-800">
                    <dl className="grid grid-cols-3 gap-2">
                        <dt className="font-bold text-right">名前:</dt>
                        <dd className="col-span-2">{staff.name}</dd>
                        <dt className="font-bold text-right">権限:</dt>
                        <dd className="col-span-2">
                            {staff.role === 'manager' ? '管理者' : staff.role === 'admin' ? 'システム管理者' : '一般職員'}
                        </dd>
                    </dl>
                </div>

                <RegisterForm staff={staff} token={token} />
            </div>
        </div>
    )
}
