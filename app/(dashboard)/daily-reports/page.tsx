import { createClient } from '@/lib/supabase/server'
import React from 'react'
import { DailyRemarks } from '@/components/features/daily-report/daily-remarks'
import { DateSelector } from '@/components/features/daily-report/date-selector'
import { FeedbackSection } from '@/components/features/daily-report/feedback-section'
import { requireAuth } from '@/lib/auth-helpers'
import { headers, cookies } from 'next/headers'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

import { GlobalSaveProvider } from '@/components/providers/global-save-context'
import { ResetDailyReportButton } from '@/components/features/daily-report/reset-daily-report-button'

// Streaming Components
import { StaffShiftSection } from '@/components/features/daily-report/staff-shift-section'
import { MainContentSection } from '@/components/features/daily-report/main-content-section'

export const dynamic = 'force-dynamic'

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
    const facilityIdFromUrl = typeof sp.facility_id === 'string' ? sp.facility_id : undefined

    const cookieStore = await cookies()
    const facilityIdFromCookie = cookieStore.get('selected_facility_id')?.value

    let facilityId: string | null | undefined = staff.facility_id

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

    // If still no facility, show message
    if (!facilityId) {
        return <div className="p-8">施設を選択してください。左上のドロップダウンから選択できます。</div>
    }

    // Handle Date from URL or Default to Today
    const dateParam = sp.date
    const today = (typeof dateParam === 'string' ? dateParam : undefined) || new Date().toISOString().split('T')[0]
    const displayDate = format(new Date(today), 'yyyy年M月d日(EEE)', { locale: ja })

    // Fetch facility name for display
    const { data: facilityData } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', facilityId)
        .single()
    const facilityName = facilityData?.name || '施設未選択'

    // Feedback Comments (Lightweight, so fetch normally or could be another suspense)
    // Decided to keep it in main shell or move to its own? 
    // It's at the bottom, so lazy loading is perfect.
    // Let's create a quick wrapper for Feedback or just do it inline if simple.
    // Actually, let's just fetch it here for now as it's not the bottleneck, or move to MainContent?
    // Let's move it to a small suspense section at bottom.

    return (
        <GlobalSaveProvider>
            <div className="space-y-8 pb-20 max-w-screen-xl mx-auto">
                {/* Section A: Header (Immediate) */}
                <div className="flex items-end justify-between border-b pb-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">📓 業務日誌</h1>
                        <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded">{facilityName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <DateSelector date={today} />
                        <ResetDailyReportButton date={today} facilityId={facilityId} />
                    </div>
                </div>

                {/* Section B: Staff Shift (Suspense) */}
                <React.Suspense fallback={
                    <div className="p-4 border rounded bg-gray-50 h-[200px] flex items-center justify-center text-gray-400">
                        シフト情報を読み込み中...
                    </div>
                }>
                    <StaffShiftSection date={today} facilityId={facilityId} />
                </React.Suspense>

                {/* Section C: Main Grid & Short Stay (Suspense) */}
                <React.Suspense fallback={
                    <div className="p-4 border rounded bg-gray-50 h-[400px] flex items-center justify-center text-gray-400">
                        日誌データを読み込み中...
                    </div>
                }>
                    <MainContentSection date={today} facilityId={facilityId} />
                </React.Suspense>

                {/* Section E: Footer (Remarks) */}
                <DailyRemarks />

                {/* Extra: Feedback Section (Async Wrapper Inline or imported) */}
                <div className="mt-8 pt-8 border-t">
                    <h3 className="text-sm font-bold text-gray-500 mb-4">全体フィードバック・連絡事項</h3>
                    <React.Suspense fallback={<div className="h-20 bg-gray-50 animate-pulse rounded" />}>
                        <FeedbackSectionWrapper date={today} facilityId={facilityId} />
                    </React.Suspense>
                </div>
            </div>
        </GlobalSaveProvider>
    )
}

// Small inline wrapper for feedback to avoid another file if possible, or usually separate file
async function FeedbackSectionWrapper({ date, facilityId }: { date: string, facilityId: string }) {
    const supabase = await createClient()
    const { data: comments } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('report_date', date)
        .order('created_at', { ascending: true })

    return <FeedbackSection comments={comments || []} date={date} />
}

