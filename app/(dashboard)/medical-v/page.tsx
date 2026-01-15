import { getMedicalVData } from '@/app/actions/medical-v/get-medical-v-data'
import { getUnits } from '@/app/actions/units'
import { requireAuth } from '@/lib/auth-helpers'
import { MedicalVGrid } from '@/components/features/medical-v/medical-v-grid'
import { MonthSelector } from '@/components/medical-v/month-selector'
import { FacilitySwitcher } from '@/components/common/facility-switcher'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'

// ... existing imports ...

export default async function MedicalVPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sp = await searchParams
    const staff = await requireAuth()

    // Cookie Store can't be awaited inside a sync parameter destructing context, wait... 
    // This is async function component. OK.

    const today = new Date()
    const year = sp.year ? parseInt(sp.year as string) : today.getFullYear()
    const month = sp.month ? parseInt(sp.month as string) : today.getMonth() + 1

    // Determine Facility ID
    const facilityIdFromUrl = typeof sp.facility_id === 'string' ? sp.facility_id : undefined

    // Cookie
    const cookieStore = await cookies()
    const facilityIdFromCookie = cookieStore.get('selected_facility_id')?.value

    let facilityId: string | null | undefined = staff?.facility_id

    if (staff?.role === 'admin') {
        facilityId = facilityIdFromUrl || facilityIdFromCookie || staff.facility_id
    } else {
        facilityId = staff?.facility_id || facilityIdFromUrl || facilityIdFromCookie
    }

    const [data, unitsRes] = await Promise.all([
        getMedicalVData(year, month, facilityId || undefined),
        getUnits()
    ])
    const { residents, rows, targetCount } = data

    // Verify facility Logic (Reuse from before or rely on action)
    // The action `getMedicalVData` already validates and returns data.
    // If residents exist, we infer facilityId was valid.

    // We strictly need facilityId for the Grid for updates.
    // Ideally pass the one resolved by action?
    // The action doesn't return resolved ID explicitly but we can infer from residents[0].facility_id if needed.
    // Or simpler: Use the same logic here or trust the param if admin provided.

    let resolvedFacilityId = facilityId
    // If admin and no param, action selected first.
    if (!resolvedFacilityId && residents && residents.length > 0) {
        resolvedFacilityId = residents[0].facility_id
    }

    return (
        <div className="space-y-6 pt-6 pb-20 px-6 max-w-[100vw] overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        🏥 医療連携体制加算Ⅴ
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        指導看護師数と実施記録を入力し、請求単位数を自動計算します。
                    </p>
                    <div className="mt-2 text-left">
                        <FacilitySwitcher variant="header" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                        <MonthSelector year={year} month={month} />
                    </div>
                </div>
            </div>

            <MedicalVGrid
                residents={residents || []}
                rows={rows || []}
                targetCount={targetCount || 0}
                currentDate={`${year}-${String(month).padStart(2, '0')}-01`}
                facilityId={resolvedFacilityId || undefined}
                units={unitsRes.data || []}
            />
        </div>
    )
}
