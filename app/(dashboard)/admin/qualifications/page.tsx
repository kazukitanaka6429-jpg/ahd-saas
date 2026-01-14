import { getQualifications } from '@/app/actions/admin/qualifications'
import { QualificationsGrid } from '@/components/admin/qualifications-grid'
import { QualificationForm } from '@/components/admin/qualification-form'
import { requireAuth } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function QualificationsPage() {
    const staff = await requireAuth()
    if (!staff) redirect('/login')

    // 権限チェック
    if (staff.role !== 'admin' && staff.role !== 'manager') {
        redirect('/')
    }

    const { data: qualificationsData } = await getQualifications()
    const qualifications = qualificationsData || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">資格マスタ管理</h1>
                    <p className="text-muted-foreground">
                        スタッフの資格情報を管理します。医療連携加算の計算に使用されます。
                    </p>
                </div>
                <QualificationForm />
            </div>

            <QualificationsGrid data={qualifications} />
        </div>
    )
}
