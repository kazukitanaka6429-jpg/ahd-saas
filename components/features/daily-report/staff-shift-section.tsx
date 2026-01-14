import { createClient } from '@/lib/supabase/server'
import { StaffShiftGrid } from '@/components/features/daily-report/staff-shift-grid'
import { getDailyShift } from '@/app/actions/shift'

export async function StaffShiftSection({ date, facilityId }: { date: string, facilityId: string }) {
    const supabase = await createClient()

    const [shiftRes, { data: staffs }] = await Promise.all([
        getDailyShift(date, facilityId),
        supabase
            .from('staffs')
            .select('*')
            .eq('facility_id', facilityId)
            .eq('status', 'active')
            .order('name')
    ])

    return (
        <StaffShiftGrid
            staffs={staffs || []}
            initialData={shiftRes.data || undefined}
            date={date}
            facilityId={facilityId}
        />
    )
}
