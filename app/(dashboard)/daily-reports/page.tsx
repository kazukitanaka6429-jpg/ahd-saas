import { createClient } from '@/lib/supabase/server'
import React from 'react'
import { DailyReportGrid } from '@/components/features/daily-report/daily-report-grid'
import { StaffShiftGrid } from '@/components/features/daily-report/staff-shift-grid'
import { DailyRemarks } from '@/components/features/daily-report/daily-remarks'
import { DateSelector } from '@/components/features/daily-report/date-selector'
import { FeedbackSection } from '@/components/features/daily-report/feedback-section'
import { DailyReportMobileList } from '@/components/features/daily-report/daily-report-mobile'
import { requireAuth } from '@/lib/auth-helpers'
import { ShortStayGrid } from '@/components/features/daily-report/short-stay-grid'
import { getFindingsCountByRecord } from '@/app/actions/findings'
import { headers } from 'next/headers'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function DailyReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const staff = await requireAuth()
    const sp = await searchParams
    if (!staff) return <div className="p-8">職員アカウントが見つかりません。システム管理者に問い合わせてください。</div>
    const facilityId = staff.facility_id
    const supabase = await createClient()

    // Handle Date from URL or Default to Today
    const dateParam = sp.date
    const today = (typeof dateParam === 'string' ? dateParam : undefined) || new Date().toISOString().split('T')[0]
    const displayDate = format(new Date(today), 'yyyy年M月d日(EEE)', { locale: ja })

    // 1. Get Residents
    const { data: allResidents } = await supabase
        .from('residents')
        .select('*')
        .eq('facility_id', staff.facility_id)
        .order('name')

    // 2. Get Daily Records (JSONB)
    const { data: dailyRecords } = await supabase
        .from('daily_records')
        .select('*')
        .eq('facility_id', staff.facility_id)
        .eq('date', today)

    // 3. Get Finding Indicators
    const indicators = await getFindingsCountByRecord(today)

    // 4. Get Global Feedback Comments
    const { data: comments } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('facility_id', staff.facility_id)
        .eq('report_date', today)
        .order('created_at', { ascending: true })

    // 5. Get Staffs (for attendance)
    const { data: staffs } = await supabase
        .from('staffs')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'active')
        .order('name')

    // 6. Get Daily Shift
    const { data: dailyShift } = await supabase
        .from('daily_shifts')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('date', today)
        .single()

    // Mobile Detection
    const headersList = headers()
    const userAgent = (await headersList).get('user-agent') || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

    return (
        <div className="space-y-8 pb-20 max-w-screen-xl mx-auto">
            {/* Section A: Header */}
            <div className="flex items-end justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">業務日誌</h1>
                    <p className="text-lg font-bold mt-2 text-gray-700">
                        {staff?.facility_id ? 'ABCリビング' : '未設定'}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-2xl font-bold text-gray-800">
                        {format(new Date(today), 'yyyy年 M月', { locale: ja })}
                    </span>
                    <DateSelector date={today} />
                    <div className="text-sm text-gray-500 font-bold">{displayDate}</div>
                </div>
            </div>

            {/* Section B: Staff Shift */}
            <StaffShiftGrid
                staffs={staffs || []}
                initialData={dailyShift || undefined}
                date={today}
            />

            {/* Section C: Main Grid */}
            {isMobile ? (
                <DailyReportMobileList
                    residents={allResidents || []}
                    date={today}
                />
            ) : (
                <DailyReportGrid
                    residents={allResidents || []}
                    defaultRecords={dailyRecords || []}
                    date={today}
                    findingsIndicators={indicators}
                />
            )}

            {/* Section D: Short Stay */}
            {!isMobile && (
                <ShortStayGrid
                    residents={allResidents || []}
                    defaultRecords={dailyRecords || []}
                    date={today}
                    key={`short-${today}`}
                />
            )}

            {/* Section E: Footer (Remarks) */}
            <DailyRemarks />

            {/* Extra: Feedback Section (Kept as supplementary) */}
            <div className="mt-8 pt-8 border-t">
                <h3 className="text-sm font-bold text-gray-500 mb-4">全体フィードバック・連絡事項</h3>
                <FeedbackSection comments={comments || []} date={today} />
            </div>
        </div>
    )
}
