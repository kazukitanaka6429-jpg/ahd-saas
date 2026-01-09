import { getFacilities } from '@/app/actions/facility'
import { FacilitiesGrid } from '@/components/admin/facilities-grid'
import { FacilityForm } from '@/components/admin/facility-form'
import { requireAuth } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function FacilitiesPage() {
    const staff = await requireAuth()
    if (!staff) redirect('/login')

    // 権限チェック
    if (staff.role !== 'admin' && staff.role !== 'manager') {
        redirect('/')
    }

    const result = await getFacilities()
    const facilities = result.data || []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">施設マスタ管理</h1>
                    <p className="text-muted-foreground">
                        施設の登録・編集を行います。
                    </p>
                </div>
                <FacilityForm />
            </div>

            <FacilitiesGrid data={facilities} />
        </div>
    )
}
