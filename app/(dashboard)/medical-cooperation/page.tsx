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

export default async function MedicalCooperationPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const staff = await requireAuth()
    const sp = await searchParams
    if (!staff) return <div className="p-8">権限がありません</div>

    // Check master access? Wait, Manager/HQ can access. General cannot.
    // requireAuth returns staff object. Sidebar filters link. But page should also protect.
    // Assuming requireAuth is basic. 
    // We should check role if we want strict security.
    if (staff.role === 'staff') {
        return <div className="p-8">この機能を利用する権限がありません</div>
    }

    const facilityId = staff.facility_id
    const supabase = await createClient()

    // Handle Month selection (YYYY-MM)
    // Default to current month's first day
    const now = new Date()
    const currentMonth = sp.month as string || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const startDate = `${currentMonth}-01`

    // Calculate end date of month for query
    // Actually simplicity: query records >= startDate AND record < nextMonth
    // Or just filter by string match on date if we fetch all? No.
    // DB date is YYYY-MM-DD.

    // Fetch Residents (In Facility)
    const { data: residents } = await supabase
        .from('residents')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'in_facility')
        .order('name')

    // Fetch Nurses (Staffs with qualification)
    // "qualfications" column is text. We look for '看護師' or '准看護師'.
    // Supabase filter 'ilike' or 'cs' (contains) if it's array? 
    // It is defined as "string | null" in types.
    // Let's use ilike '%看護師%' which covers both 看護師 and 准看護師
    const { data: nurses } = await supabase
        .from('staffs')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'active')
        .ilike('qualifications', '%看護師%')
        .order('name')

    // Fetch Records for this month
    // We need to construct range
    const startObj = new Date(startDate)
    const endObj = new Date(startObj.getFullYear(), startObj.getMonth() + 1, 0) // Last day
    const endDate = endObj.toISOString().split('T')[0]

    const { data: records } = await supabase
        .from('medical_cooperation_records')
        .select('*')
        .eq('facility_id', facilityId)
        .gte('date', startDate)
        .lte('date', endDate)

    // Fetch Indicators for the whole month
    const { getFindingsCountByRange } = await import('@/app/actions/findings') // Dynamic import to avoid cycles if any? No, standard import is fine usually.
    // Actually standard import at top is better. But let's use what we have.
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
                    residents={residents || []}
                    nurses={nurses || []}
                    records={records || []}
                    currentDate={startDate}
                    findingsIndicators={indicators}
                />
            </div>
        </div>
    )
}
