'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export type MedicalVDaily = {
    id: string
    date: string
    nurse_count: number
    calculated_units: number
}

export type MedicalVRecord = {
    id: string
    resident_id: string
    is_executed: boolean
}

export type MedicalVData = {
    dailyId?: string  // ID for nurse_count finding comments
    date: string
    nurse_count: number
    calculated_units: number
    records: Record<string, boolean> // resident_id -> is_executed
    recordIds?: Record<string, string> // resident_id -> record_id (for finding comments)
}

export async function getMedicalVData(year: number, month: number, facilityIdArg?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        const supabase = await createClient()
        let facilityId = staff.facility_id

        // SaaS Logic: Admin check (Allow all admins to switch)
        if (staff.role === 'admin') {
            if (facilityIdArg) {
                // Security: Check Org Membership
                const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()

                if (!facil || facil.organization_id !== staff.organization_id) {
                    return { error: '権限のない施設です' }
                }

                facilityId = facilityIdArg
            } else {
                // SERVER-SIDE: Auto-select first facility for Admin
                const { data: facilities } = await supabase
                    .from('facilities')
                    .select('id')
                    .eq('organization_id', staff.organization_id)
                    .limit(1)

                if (facilities && facilities.length > 0) {
                    facilityId = facilities[0].id
                } else {
                    return { residents: [], rows: [], targetCount: 0 }
                }
            }
        } else {
            // Staff/Manager validation
            if (facilityIdArg && facilityIdArg !== staff.facility_id) {
                logger.warn('Unauthorized facility access attempt by staff', {
                    staffId: staff.id,
                    targetFacility: facilityIdArg
                })
            }
            facilityId = staff.facility_id
        }

        if (!facilityId) return { error: '施設情報がありません' }

        // 1. Calculate Date Range
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDayObj = new Date(year, month, 0)
        const daysInMonth = lastDayObj.getDate()
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

        // 2. Fetch Residents (All active OR in_facility) - Matching other pages
        const { data: residents, error: resError } = await supabase
            .from('residents')
            .select('*')
            .eq('facility_id', facilityId)
            .neq('status', 'left') // Show all except left, to be safe. Or 'in_facility' if strict.
            // Using 'neq left' to match other pages behavior if possible, or keeping 'in_facility' if that's the requirement.
            // Previous code used 'in_facility'. Let's stick to it or broaden if "disappeared" means they are hospitalized?
            // User complained "residents disappeared". If they are not 'in_facility', they disappear.
            // Let's broaden to 'neq left' to be safe, like Medical IV.
            .neq('status', 'left')
            .order('display_id', { ascending: true, nullsFirst: false })

        if (resError) {
            logger.error('Error fetching residents:', resError)
            return { error: '利用者情報の取得に失敗しました' }
        }

        if (!residents) return { residents: [], rows: [], targetCount: 0 }

        // 3. Count Target Residents (sputum_suction = true)
        const targetCount = residents.filter(r => r.sputum_suction).length

        // 4. Fetch NEW Daily Data Structure
        // A. Fetch Execution Records (medical_coord_v_records)
        const { data: recordsData, error: recordsError } = await supabase
            .from('medical_coord_v_records')
            .select('id, date, resident_id') // Include id for finding comments
            .eq('facility_id', facilityId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .limit(10000)

        if (recordsError) {
            logger.error('Error fetching medical V records:', recordsError)
            return { error: '記録の取得に失敗しました' }
        }


        // DIAGNOSTIC LOG
        console.log('[MedicalV] Records fetched:', recordsData?.length || 0, 'for facility:', facilityId)

        // B. Fetch Daily Data (medical_coord_v_daily) for manually saved nurse counts
        const { data: dailyData, error: dailyError } = await supabase
            .from('medical_coord_v_daily')
            .select('id, date, nurse_count, calculated_units')  // Include id for finding comments
            .eq('facility_id', facilityId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .limit(10000)

        if (dailyError) {
            logger.error('Error fetching daily data:', dailyError)
        }

        console.log('[MedicalV] Daily data fetched:', dailyData?.length || 0)

        // 5. Construct Rows for each day
        const rows: MedicalVData[] = []

        // Map daily data by date
        const dailyMap = new Map<string, { id: string, nurse_count: number, calculated_units: number }>()
        dailyData?.forEach(d => {
            dailyMap.set(d.date, { id: d.id, nurse_count: d.nurse_count, calculated_units: d.calculated_units })
        })

        const dailyRecordsMap = new Map<string, Map<string, string>>() // date -> Map<resident_id, record_id>

        recordsData?.forEach(r => {
            if (!dailyRecordsMap.has(r.date)) {
                dailyRecordsMap.set(r.date, new Map())
            }
            dailyRecordsMap.get(r.date)?.set(r.resident_id, r.id)
        })

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

            // Get nurse count and calculated units from daily table (manual input)
            const daily = dailyMap.get(dateStr)
            const nurseCount = daily?.nurse_count || 0
            const calculatedUnits = daily?.calculated_units || 0

            // Reconstruct record map
            const recordMap: Record<string, boolean> = {}
            const recordIdsMap: Record<string, string> = {}
            const residentRecords = dailyRecordsMap.get(dateStr)

            residents.forEach(r => {
                if (residentRecords && residentRecords.has(r.id)) {
                    recordMap[r.id] = true
                    recordIdsMap[r.id] = residentRecords.get(r.id)!
                } else {
                    recordMap[r.id] = false
                }
            })

            rows.push({
                dailyId: daily?.id, // ID for finding comments on nurse_count
                date: dateStr,
                nurse_count: nurseCount,
                calculated_units: calculatedUnits, // From daily table
                records: recordMap,
                recordIds: recordIdsMap
            })
        }

        return {
            residents,
            rows,
            targetCount
        }
    } catch (e) {
        logger.error('Unexpected error in getMedicalVData', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
