'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { fetchAuditData, calculateAudit, AuditResult, AuditData } from '@/lib/audit/calculator'
import { format } from 'date-fns'
import { ManualWorkRecord, ManualDeduction } from '@/types/audit'
import { DailyShift } from '@/types'
import { cookies } from 'next/headers'

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

export async function getAuditPageData(dateStr?: string, facilityIdOverride?: string): Promise<AuditPageData | { error: string }> {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        // Determine facility ID: override > cookie (for admin) > staff's facility
        let facilityId = staff.facility_id

        if (staff.role === 'admin') {
            const cookieStore = await cookies()
            const facilityIdFromCookie = cookieStore.get('selected_facility_id')?.value
            facilityId = facilityIdOverride || facilityIdFromCookie || staff.facility_id
        } else if (facilityIdOverride) {
            facilityId = facilityIdOverride
        }

        if (!facilityId) return { error: '施設が選択されていません' }

        const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd')

        // 1. Fetch Audit Data & Calculate
        const rawData = await fetchAuditData(targetDate, facilityId)
        const auditResult = calculateAudit(rawData)

        // 2. Fetch Active Staff List for Dialogs (filtered by selected facility)
        const supabase = await createClient()
        const { data: staffList } = await supabase
            .from('staffs')
            .select('id, name')
            .eq('facility_id', facilityId)
            .eq('status', 'active')
            .order('name')

        return {
            auditResult,
            staffList: staffList || [],
            facilityId: facilityId,
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
