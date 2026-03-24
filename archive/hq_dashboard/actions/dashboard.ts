'use server'

import { createClient } from '@/lib/supabase/server'
import { protect } from '@/lib/auth-guard'
import { getCurrentStaff } from '@/app/actions/auth'
import { getDashboardKPIs, FacilityKPI } from '@/lib/analytics/kpi_calculator'
import { format } from 'date-fns'

export interface DashboardResult {
    yearMonth: string
    kpis: FacilityKPI[]
}

export async function getHqDashboardData(yearMonth?: string): Promise<DashboardResult | { error: string }> {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff) return { error: 'Unauthorized' }

        if (currentStaff.role !== 'admin') {
            return { error: '権限がありません（本部用機能です）' }
        }

        const supabase = await createClient()
        const targetYM = yearMonth || format(new Date(), 'yyyy-MM')

        const kpis = await getDashboardKPIs(targetYM, supabase)

        return {
            yearMonth: targetYM,
            kpis
        }
    } catch (e: any) {
        console.error("getHqDashboardData error", e)
        return { error: e.message }
    }
}
