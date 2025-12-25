import { createClient } from '@/lib/supabase/server'
import { DailyReportGrid } from '@/components/features/daily-report/daily-report-grid'
import { StaffAttendance } from '@/components/features/daily-report/staff-attendance'
import { DailyRemarks } from '@/components/features/daily-report/daily-remarks'
import { DateSelector } from '@/components/features/daily-report/date-selector'
import { FeedbackSection } from '@/components/features/daily-report/feedback-section'
import { DailyReportMobileList } from '@/components/features/daily-report/daily-report-mobile'
import { requireAuth } from '@/lib/auth-helpers'
import { ShortStayGrid } from '@/components/features/daily-report/short-stay-grid'

export default async function DailyReportsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    // ... auth checks and fetches ...
    const staff = await requireAuth()
    if (!staff) return <div className="p-8">職員アカウントが見つかりません。システム管理者に問い合わせてください。</div>
    const facilityId = staff.facility_id
    const supabase = await createClient()

    // Handle Date from URL or Default to Today
    const dateParam = searchParams.date
    const today = typeof dateParam === 'string' ? dateParam : new Date().toISOString().split('T')[0]

    // Fetch Residents (Filtered by Facility)
    // For main grid, we want ONLY 'in_facility'
    const { data: residents } = await supabase
        .from('residents')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'in_facility')
        .order('name')

    // For Short Stay selector, we might want ALL residents or specific ones. 
    // Let's fetch ALL residents regardless of status for the selector (or assume short stay pool is same)
    // If short stay users are different, we should query them. 
    // For now, let's just reuse residents or fetch all including 'short_stay' status.
    // Let's fetch ALL for short stay selector.
    const { data: allResidents } = await supabase
        .from('residents')
        .select('*')
        .eq('facility_id', facilityId)
        .order('name')

    // ... fetch comments, staffs, dailyShift ...
    const { data: comments } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('report_date', today)
        .order('created_at', { ascending: true })

    const { data: staffs } = await supabase
        .from('staffs')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'active')
        .order('name')

    const { data: dailyShift } = await supabase
        .from('daily_shifts')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('date', today)
        .single()

    return (
        <div className="h-full flex flex-col space-y-4 pb-8">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">業務日誌</h2>
                    <p className="text-muted-foreground text-sm">
                        {new Date(today).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <DateSelector date={today} />
                </div>
            </div>

            <StaffAttendance
                staffs={staffs || []}
                initialData={dailyShift || undefined}
                date={today}
                key={today}
            />

            {/* Main Grid: Desktop */}
            <div className="hidden md:block">
                <DailyReportGrid residents={residents || []} date={today} key={`grid-${today}`} />
            </div>

            {/* Main List: Mobile */}
            <div className="md:hidden block">
                <DailyReportMobileList residents={residents || []} date={today} />
            </div>

            {/* Short Stay Grid */}
            <div className="hidden md:block">
                <ShortStayGrid residents={allResidents || []} date={today} key={`short-${today}`} />
            </div>

            {/* Bottom Section: Feedback & Remarks (Full Width now) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeedbackSection comments={comments || []} date={today} />
                <DailyRemarks />
            </div>
        </div>
    )
}
