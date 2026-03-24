import { createClient } from '@/lib/supabase/server'
import React from 'react'
import { requireAuth } from '@/lib/auth-helpers'
import { getUnits } from '@/app/actions/units'
import { MedicalCooperationGrid } from '@/components/features/medical-cooperation/medical-cooperation-grid'
import { MonthSelector } from '@/components/features/medical-cooperation/month-selector'
import { Metadata } from 'next'
import { cookies } from 'next/headers'

export const metadata: Metadata = {
    title: '医療連携体制加算管理 | Care SaaS',
}

export const dynamic = 'force-dynamic'

import { getMedicalCooperationMatrix } from '@/app/actions/medical-cooperation'

export default async function MedicalCooperationPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const staff = await requireAuth()
    const sp = await searchParams
    if (!staff) return <div className="p-8">権限がありません</div>

    // Staff can now access Medical IV (removed role restriction)

    const supabase = await createClient()

    // For Admins (facility_id is NULL), auto-select first available
    // OR Cookie
    const facilityIdFromUrl = typeof sp.facility_id === 'string' ? sp.facility_id : undefined

    const cookieStore = await cookies()
    const facilityIdFromCookie = cookieStore.get('selected_facility_id')?.value

    let facilityId: string | null | undefined = staff.facility_id

    // FIX: Admin with facility_id should also respect URL param
    if (staff.role === 'admin') {
        facilityId = facilityIdFromUrl || facilityIdFromCookie || staff.facility_id
    } else {
        facilityId = staff.facility_id || facilityIdFromUrl || facilityIdFromCookie
    }

    // SERVER-SIDE: If Admin with no facility selected, auto-select first available
    if (!facilityId && staff.role === 'admin' && staff.organization_id) {
        const { data: facilities } = await supabase
            .from('facilities')
            .select('id')
            .eq('organization_id', staff.organization_id)
            .limit(1)

        if (facilities && facilities.length > 0) {
            facilityId = facilities[0].id
        }
    }

    if (!facilityId) {
        return <div className="p-8">施設を選択してください。</div>
    }

    // Handle Month selection (YYYY-MM)
    const now = new Date()
    const currentMonth = sp.month as string || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [yearStr, monthStr] = currentMonth.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)

    // Fetch Matrix
    const matrixResponse = await getMedicalCooperationMatrix(year, month, facilityId)
    // If error, should handle it. For now, matching previous behavior of throwing or returning empty?
    // The previous implementation returned object with error string if failed.
    // The component might expect 'matrix' to have data.
    // Let's pass 'matrix' if success, or handle error.
    if (!matrixResponse.success) {
        return <div className="p-8 text-red-500">データ取得に失敗しました: {matrixResponse.error}</div>
    }
    const matrix = matrixResponse.data!

    // Fetch Nurses (Joined with Qualifications)
    // Only fetch staff with qualifications marked as 'is_medical_coord_iv_target'
    const { data: nurses } = await supabase
        .from('staffs')
        .select('*, qualifications!inner(*)')
        .eq('facility_id', facilityId)
        .eq('status', 'active')
        .eq('qualifications.is_medical_coord_iv_target', true)
        .order('name')

    // DEBUG: Fetch all active staff to see what's wrong
    const { data: allStaff } = await supabase
        .from('staffs')
        .select('id, name, qualifications_text, role, status')
        .eq('facility_id', facilityId)
        .eq('status', 'active')



    // Fetch Indicators for the whole month
    const { getFindingsCountByRange } = await import('@/app/actions/findings')
    const startDate = `${currentMonth}-01`
    const endObj = new Date(year, month, 0)
    const endDate = endObj.toISOString().split('T')[0]
    const indicators = await getFindingsCountByRange(startDate, endDate, 'medical')

    // Fetch units
    const { data: units } = await getUnits()

    // Fetch facility name for display
    const { data: facilityData } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', facilityId)
        .single()
    const facilityName = facilityData?.name || '施設未選択'

    return (
        <div className="space-y-6 pt-6 pb-20 px-6 max-w-[100vw] overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        🏥 医療連携体制加算Ⅳ
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        看護職員による夜間の訪問・対応記録
                    </p>
                    <div className="mt-2 text-left">
                        <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded">{facilityName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <React.Suspense fallback={<div>Loading...</div>}>
                        <MonthSelector currentMonth={currentMonth} />
                    </React.Suspense>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <MedicalCooperationGrid
                    matrix={matrix}
                    nurses={nurses || []}
                    currentDate={startDate}
                    findingsIndicators={indicators}
                    facilityId={facilityId}
                />
            </div>
        </div>
    )
}
