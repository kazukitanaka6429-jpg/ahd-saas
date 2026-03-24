'use server'

import { createClient } from '@/lib/supabase/server'

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

        // Use Standard Client (RLS Protected)
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized: No User' }

        // Fetch staff info using standard client (RLS should allow reading own record)
        const { data: staff } = await supabase
            .from('staffs')
            .select('*')
            .eq('auth_user_id', user.id)
            .single()

        if (!staff) {
            return { error: 'Unauthorized: Staff Link Missing' }
        }

        // Determine facility ID
        let facilityId = staff.facility_id

        if (staff.role === 'admin') {
            const cookieStore = await cookies()
            const facilityIdFromCookie = cookieStore.get('selected_facility_id')?.value
            facilityId = facilityIdOverride || facilityIdFromCookie || staff.facility_id
        } else if (facilityIdOverride) {
            // Validate if non-admin user is trying to access other facility
            // RLS will block the actual data fetch, but good to check here too or just let RLS fail?
            // "can_access_facility" logic in DB handles this, so we can technically rely on RLS.
            // But let's keep the override logic simple for now.
            facilityId = facilityIdOverride
        }

        if (!facilityId) return { error: '施設が選択されていません' }

        const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd')

        // 1. Fetch Audit Data & Calculate (Pass the RLS-protected client)
        const rawData = await fetchAuditData(targetDate, facilityId, supabase)
        const auditResult = calculateAudit(rawData)

        // 2. Fetch Active Staff List for Dialogs
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
