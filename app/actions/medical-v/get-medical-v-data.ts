'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'

export type MedicalVDaily = {
    id: string
    date: string
    nurse_count: number
    calculated_units: number
}

export type MedicalVRecord = {
    resident_id: string
    is_executed: boolean
}

export type MedicalVData = {
    dailyId?: string
    date: string
    nurse_count: number
    calculated_units: number
    records: Record<string, boolean> // resident_id -> is_executed
}

export async function getMedicalVData(year: number, month: number, facilityIdArg?: string) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')

    const supabase = await createClient()
    let facilityId = staff.facility_id

    // SaaS Logic: Admin check
    if (staff.role === 'admin' && staff.facility_id === null) {
        if (facilityIdArg) {
            // Security: Check Org Membership
            const { data: facil } = await supabase.from('facilities').select('organization_id').eq('id', facilityIdArg).single()

            if (!facil || facil.organization_id !== staff.organization_id) {
                throw new Error('Unauthorized Facility Access')
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
            console.warn('Unauthorized facility access attempt by staff')
        }
        facilityId = staff.facility_id
    }

    if (!facilityId) throw new Error('Facility ID missing')

    // 1. Calculate Date Range (String based to avoid timezone shift)
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`

    // Get last day of month
    // new Date(year, month, 0) handles month rollover correctly. 
    // e.g. year=2025, month=12 -> new Date(2025, 12, 0) is Dec 31, 2025.
    const lastDayObj = new Date(year, month, 0)
    const daysInMonth = lastDayObj.getDate()
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

    // 2. Fetch Residents (All active)
    const { data: residents } = await supabase
        .from('residents')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'in_facility')
        .order('display_id', { ascending: true, nullsFirst: false })

    if (!residents) return { residents: [], rows: [], targetCount: 0 }

    // 3. Count Target Residents (sputum_suction = true)
    // Note: Assuming 'sputum_suction' corresponds to the requirement "当月喀痰吸引が必要な利用者数"
    // Ideally this should check historical status, but using current status as baseline.
    const targetCount = residents.filter(r => r.sputum_suction).length

    // 4. Fetch Daily Data
    const { data: dailyData } = await supabase
        .from('medical_coord_v_daily')
        .select(`
            *,
            medical_coord_v_records (
                resident_id,
                is_executed
            )
        `)
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // 5. Construct Rows for each day
    const rows: MedicalVData[] = []

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const existingDaily = dailyData?.find(d => d.date === dateStr)

        const recordMap: Record<string, boolean> = {}
        if (existingDaily && existingDaily.medical_coord_v_records) {
            existingDaily.medical_coord_v_records.forEach((r: any) => {
                recordMap[r.resident_id] = r.is_executed
            })
        }

        rows.push({
            dailyId: existingDaily?.id,
            date: dateStr,
            nurse_count: existingDaily ? existingDaily.nurse_count : 0,
            calculated_units: existingDaily ? existingDaily.calculated_units : 0,
            records: recordMap
        })
    }

    return {
        residents,
        rows,
        targetCount
    }
}
