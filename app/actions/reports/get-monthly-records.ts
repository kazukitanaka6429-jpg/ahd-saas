'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth' // Assuming auth exists here or lib/auth-helpers
import { logger } from '@/lib/logger'
import { protect } from '@/lib/auth-guard'

export interface DailyRecordForReport {
    date: string
    data: Record<string, any> // JSONB data
    // Add extension columns if needed in report
}

export interface MonthlyReportData {
    resident: {
        id: string
        name: string
        date_of_birth: string | null
    }
    facility: {
        name: string
    }
    records: Record<string, DailyRecordForReport>
    year: number
    month: number
}

export async function getMonthlyResidentRecords(
    residentId: string,
    year: number,
    month: number
): Promise<{ data?: MonthlyReportData; error?: string }> {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        const supabase = await createClient()

        // 1. Fetch Resident & Verify Access
        const { data: resident, error: resError } = await supabase
            .from('residents')
            .select(`
                id, name, date_of_birth, facility_id,
                facilities ( name, organization_id )
            `)
            .eq('id', residentId)
            .single()

        if (resError || !resident) return { error: '利用者が見つかりません' }

        // Access Check
        // If staff is not admin, must belong to same facility
        if (staff.role !== 'admin' && staff.facility_id !== resident.facility_id) {
            return { error: '権限がありません' }
        }
        // If staff is admin, must belong to same organization
        // @ts-ignore: joined table type inference
        if (staff.role === 'admin' && resident.facilities?.organization_id !== staff.organization_id) {
            return { error: '権限がありません' }
        }

        // 2. Date Range
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

        // 3. Fetch Records
        const { data: records, error: recError } = await supabase
            .from('daily_records')
            .select('date, data')
            .eq('resident_id', residentId)
            .gte('date', startDate)
            .lte('date', endDate)

        if (recError) {
            logger.error('getMonthlyResidentRecords fetch error', recError)
            return { error: '記録の取得に失敗しました' }
        }

        // 4. Transform Map
        const recordMap: Record<string, DailyRecordForReport> = {}
        records?.forEach(r => {
            recordMap[r.date] = {
                date: r.date,
                data: r.data as Record<string, any>
            }
        })

        return {
            data: {
                resident: {
                    id: resident.id,
                    name: resident.name,
                    date_of_birth: resident.date_of_birth
                },
                facility: {
                    // @ts-ignore
                    name: resident.facilities?.name || '不明な施設'
                },
                records: recordMap,
                year,
                month
            }
        }

    } catch (e) {
        logger.error('getMonthlyResidentRecords unexpected error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
