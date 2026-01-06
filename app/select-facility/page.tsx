import { getMyStaffIdentities } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, User } from 'lucide-react'
import { switchFacility } from '@/app/actions/auth'

export default async function SelectFacilityPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const staffs = await getMyStaffIdentities()

    if (staffs.length === 0) {
        // No staff account found
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-xl text-red-600">
                            アカウントが見つかりません
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p>職員データが紐づいていません。管理者にお問い合わせください。</p>
                        <Button asChild variant="outline">
                            <a href="/login">ログイン画面へ戻る</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    /* 
    // Auto-redirect if only one facility (handled in auth-helpers, but good as fallback)
    if (staffs.length === 1) {
       // We can iterate and auto-switch here if needed, but usually auth-helpers handles it.
       // But since we are here, maybe we should just allow clicking.
    }
    */

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/50">
            <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">所属を選択</h1>
                    <p className="text-muted-foreground">
                        操作する施設を選択してください
                    </p>
                </div>

                <div className="grid gap-3">
                    {staffs.map((staff) => (
                        <form key={staff.id} action={switchFacility.bind(null, staff.id)}>
                            <button
                                className="w-full flex items-center justify-between p-4 bg-white border rounded-xl hover:border-primary hover:shadow-md transition-all group text-left"
                                type="submit"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-lg">
                                            {staff.facilities?.name || '不明な施設'}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            {staff.name}
                                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border">
                                                {staff.role === 'admin' ? 'システム管理者' : staff.role === 'manager' ? '管理者' : '一般職員'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </form>
                    ))}
                </div>

                <div className="text-center">
                    <Button asChild variant="link" className="text-gray-500">
                        <a href="/login">別のアカウントでログイン</a>
                    </Button>
                </div>
            </div>
        </div>
    )
}
