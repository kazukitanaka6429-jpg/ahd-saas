import { createClient } from '@/lib/supabase/server'
import React from 'react'
import { requireAuth } from '@/lib/auth-helpers'
import { MedicalCooperationGrid } from '@/components/features/medical-cooperation/medical-cooperation-grid'
import { MonthSelector } from '@/components/features/medical-cooperation/month-selector'
import { Metadata } from 'next'

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

    if (staff.role === 'staff') {
        return <div className="p-8">この機能を利用する権限がありません</div>
    }

    const supabase = await createClient()

    // For Admins (facility_id is NULL), auto-select first available
    const facilityIdFromUrl = typeof sp.facility_id === 'string' ? sp.facility_id : undefined
    let facilityId = staff.facility_id || facilityIdFromUrl

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
    const matrix = await getMedicalCooperationMatrix(year, month, facilityId)

    // Fetch Nurses
    const { data: nurses } = await supabase
        .from('staffs')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'active')
        .ilike('qualifications', '%看護師%')
        .order('name')

    // Fetch Indicators for the whole month
    const { getFindingsCountByRange } = await import('@/app/actions/findings')
    const startDate = `${currentMonth}-01`
    const endObj = new Date(year, month, 0)
    const endDate = endObj.toISOString().split('T')[0]
    const indicators = await getFindingsCountByRange(startDate, endDate, 'medical')

    return (
        <div className="h-full flex flex-col space-y-4 pb-8">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">医療連携体制加算 (医療連携IV)</h2>
                    <p className="text-muted-foreground text-sm">
                        看護職員による夜間の訪問・対応記録
                    </p>
                </div>
                <div>
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
