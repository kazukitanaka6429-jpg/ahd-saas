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
        <div className="space-y-6 pt-6 pb-20 px-6 max-w-[100vw] overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        🎓 資格マスタ管理
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        スタッフの資格情報を管理します。医療連携加算の計算に使用されます。
                    </p>
                </div>
                <QualificationForm />
            </div>

            <QualificationsGrid data={qualifications} />
        </div>
    )
}
