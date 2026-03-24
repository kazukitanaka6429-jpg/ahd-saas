'use server'

import { createClient } from '@/lib/supabase/server'
import { protect } from '@/lib/auth-guard'
import { getCurrentStaff } from '@/app/actions/auth'
import { getMonthlyFacilityStats, FacilityMonthlyStats } from '@/lib/analytics/aggregator'
import { format } from 'date-fns'

export interface MonthlyReportResult {
    yearMonth: string
    stats: FacilityMonthlyStats[]
}

export async function getMonthlyReportData(yearMonth?: string): Promise<MonthlyReportResult | { error: string }> {
    try {
        await protect()

        // Verify HQ Role
        const currentStaff = await getCurrentStaff()
        if (!currentStaff) return { error: 'Unauthorized' }

        // Strict Check: Must be Admin (HQ) or Manager with NULL facility (if that schema existed, but mostly Admin)
        if (currentStaff.role !== 'admin') {
            return { error: '権限がありません（本部用機能です）' }
        }

        const supabase = await createClient()
        const targetYM = yearMonth || format(new Date(), 'yyyy-MM')

        const stats = await getMonthlyFacilityStats(targetYM, supabase)

        return {
            yearMonth: targetYM,
            stats
        }
    } catch (e: any) {
        console.error("getMonthlyReportData error", e)
        return { error: e.message }
    }
}
