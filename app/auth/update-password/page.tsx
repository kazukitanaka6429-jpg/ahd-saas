import { UpdatePasswordForm } from './update-password-form'

export default function UpdatePasswordPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">パスワード設定</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        アカウントのパスワードを設定してください。
                    </p>
                </div>

                <UpdatePasswordForm />

                <p className="text-xs text-gray-400 text-center mt-6">
                    パスワードは8文字以上で、安全なものを設定してください。
                </p>
            </div>
        </div>
    )
}
