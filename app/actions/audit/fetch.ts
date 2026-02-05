'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { fetchAuditData, calculateAudit, AuditResult, AuditData } from '@/lib/audit/calculator'
import { format } from 'date-fns'
import { ManualWorkRecord, ManualDeduction } from '@/types/audit'
import { DailyShift } from '@/types'

export interface AuditPageData {
    auditResult: AuditResult
    staffList: { id: string, name: string }[]
    facilityId: string
    date: string
    // Raw data for dialogs
    dailyShifts: DailyShift[]
    manualWorks: ManualWorkRecord[]
    manualDeductions: ManualDeduction[]
}

export async function getAuditPageData(dateStr?: string): Promise<AuditPageData | { error: string }> {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff || !staff.facility_id) return { error: 'Unauthorized' }

        const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd')

        // 1. Fetch Audit Data & Calculate
        const rawData = await fetchAuditData(targetDate, staff.facility_id)
        const auditResult = calculateAudit(rawData)

        // 2. Fetch Active Staff List for Dialogs
        const supabase = await createClient()
        const { data: staffList } = await supabase
            .from('staffs')
            .select('id, name')
            .eq('facility_id', staff.facility_id)
            .eq('status', 'active')
            .order('name')

        return {
            auditResult,
            staffList: staffList || [],
            facilityId: staff.facility_id,
            date: targetDate,
            dailyShifts: rawData.dailyShifts.filter(d => d.date === targetDate),
            manualWorks: rawData.manualWorks.filter(m => m.target_date === targetDate),
            manualDeductions: rawData.manualDeductions.filter(d => d.target_date === targetDate)
        }
    } catch (e: any) {
        console.error("getAuditPageData error", e)
        return { error: e.message }
    }
}
