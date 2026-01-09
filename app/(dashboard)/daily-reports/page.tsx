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
import { getDailyMatrix } from '@/app/actions/daily-record'
import { getDailyShift } from '@/app/actions/shift'
import { getShortStayRecord } from '@/app/actions/short-stay'

export const dynamic = 'force-dynamic'

import { GlobalSaveProvider } from '@/components/providers/global-save-context'

export default async function DailyReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const staff = await requireAuth()
    const sp = await searchParams
    if (!staff) return <div className="p-8">職員アカウントが見つかりません。システム管理者に問い合わせてください。</div>

    const supabase = await createClient()

    // For Admins (facility_id is NULL), use facility_id from URL params
    // For regular staff, use their assigned facility_id
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

    // If still no facility, show message
    if (!facilityId) {
        return <div className="p-8">施設を選択してください。左上のドロップダウンから選択できます。</div>
    }

    // Handle Date from URL or Default to Today
    const dateParam = sp.date
    const today = (typeof dateParam === 'string' ? dateParam : undefined) || new Date().toISOString().split('T')[0]
    const displayDate = format(new Date(today), 'yyyy年M月d日(EEE)', { locale: ja })

    // Parallel Fetching - Use facilityId (not staff.facility_id!)
    const [
        matrixRes,
        indicators,
        { data: comments },
        { data: staffs },
        shiftRes,
        shortStayRes
    ] = await Promise.all([
        // 1. Get Residents & Records (Matrix)
        getDailyMatrix(today, facilityId),

        // 2. Get Finding Indicators
        getFindingsCountByRecord(today),

        // 3. Get Global Feedback Comments
        supabase
            .from('feedback_comments')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('report_date', today)
            .order('created_at', { ascending: true }),

        // 4. Get Staffs (for attendance)
        supabase
            .from('staffs')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('status', 'active')
            .order('name'),

        // 5. Get Daily Shift
        getDailyShift(today, facilityId),

        // 6. Get Short Stay Record
        getShortStayRecord(today, facilityId)
    ])

    // Extract Matrix Data
    const residents = matrixRes.data?.residents || []
    const dailyRecordsMap = matrixRes.data?.records || {}
    const dailyRecords = Object.values(dailyRecordsMap)

    // Extract Shift Data
    const dailyShift = shiftRes.data

    // Extract Short Stay Data
    const shortStayRecord = shortStayRes

    // Mobile Detection
    const headersList = headers()
    const userAgent = (await headersList).get('user-agent') || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

    return (
        <GlobalSaveProvider>
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
                        residents={residents}
                        date={today}
                    />
                ) : (
                    <DailyReportGrid
                        residents={residents}
                        defaultRecords={dailyRecords}
                        date={today}
                        findingsIndicators={indicators}
                    />
                )}

                {/* Section D: Short Stay */}
                {!isMobile && (
                    <ShortStayGrid
                        residents={residents}
                        record={shortStayRecord}
                        date={today}
                        facilityId={facilityId}
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
        </GlobalSaveProvider>
    )
}
