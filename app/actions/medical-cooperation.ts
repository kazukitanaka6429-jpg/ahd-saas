'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { DbTables } from '@/types'

// Types
export type MedicalCooperationRow = {
    dailyId?: string
    date: string
    nurse_count: number
    calculated_units: number
    records: Record<string, string | null> // resident_id -> staff_id
}

export type MedicalCooperationMatrix = {
    residents: DbTables['residents']['Row'][]
    rows: MedicalCooperationRow[]
    targetCount: number
}

// Calculate Units Logic (Shared)
// 看護師数に応じて単位が変わる？ (仮: 常に一定なら簡単だが仕様確認が必要)
// ここではAction内で計算できるように関数化しておく
const calculateUnits = (nurseCount: number, residentCount: number): number => {
    // TODO: Implement actual logic based on Grid or Specs
    // Placeholder: If nurse >= 1, 50 units * residentCount, etc.
    // For now returning 0, will update after checking Grid.
    return 0
}

export async function getMedicalCooperationMatrix(
    year: number,
    month: number,
    facilityIdOverride?: string
): Promise<MedicalCooperationMatrix> {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')

    const supabase = await createClient()
    let facilityId = staff.facility_id

    // Admin Override Logic
    if (staff.role === 'admin' && staff.facility_id === null) {
        if (facilityIdOverride) {
            facilityId = facilityIdOverride
        } else {
            // Pick first facility
            const { data: facilities } = await supabase
                .from('facilities')
                .select('id')
                .eq('organization_id', staff.organization_id)
                .limit(1)
            if (facilities && facilities.length > 0) facilityId = facilities[0].id
        }
    }

    if (!facilityId) return { residents: [], rows: [], targetCount: 0 }

    // Date Range
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDayObj = new Date(year, month, 0)
    const daysInMonth = lastDayObj.getDate()
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`

    // Fetch Residents (In Facility)
    const { data: residents } = await supabase
        .from('residents')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('status', 'in_facility')
        .order('name')

    if (!residents || residents.length === 0) return { residents: [], rows: [], targetCount: 0 }

    // Target Count (Sputum Suction)
    const targetCount = residents.filter(r => r.sputum_suction).length

    // Fetch Daily Summary
    const { data: dailyData } = await supabase
        .from('medical_coord_v_daily')
        .select('*')
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // Fetch Records
    // Optimize: Fetch all records in range
    const { data: recordsData } = await supabase
        .from('medical_cooperation_records')
        .select('*')
        .eq('facility_id', facilityId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)

    // Construct Matrix
    const rows: MedicalCooperationRow[] = []
    const dailyMap = new Map(dailyData?.map(d => [d.date, d]) || [])

    // Group records by date -> resident_id -> staff_id
    const recordMap = new Map<string, Record<string, string | null>>()
    recordsData?.forEach(r => {
        if (!recordMap.has(r.date)) recordMap.set(r.date, {})
        recordMap.get(r.date)![r.resident_id] = r.staff_id
    })

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const daily = dailyMap.get(dateStr)

        // Build records object for this day
        const dayRecords: Record<string, string | null> = {} // Changed type
        residents.forEach(r => {
            const dateRecords = recordMap.get(dateStr)
            dayRecords[r.id] = dateRecords ? (dateRecords[r.resident_id] || null) : null
        })

        rows.push({
            dailyId: daily?.id,
            date: dateStr,
            nurse_count: daily?.nurse_count || 0,
            calculated_units: daily?.calculated_units || 0,
            records: dayRecords // Now matches updated type
        })
    }

    return { residents, rows, targetCount }
}

export async function upsertMedicalCooperationDaily(
    date: string,
    nurseCount: number,
    calculatedUnits: number,
    facilityIdOverride?: string
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    // ... Resolve Facility ID logic (Reusable func needed) ... 
    const supabase = await createClient()
    const facilityId = staff.role === 'admin' ? facilityIdOverride : staff.facility_id
    if (!facilityId) return { error: 'No Facility ID' }

    const { error } = await supabase
        .from('medical_coord_v_daily')
        .upsert({
            facility_id: facilityId,
            date,
            nurse_count: nurseCount,
            calculated_units: calculatedUnits,
            updated_at: new Date().toISOString()
        }, { onConflict: 'facility_id, date' })

    if (error) return { error: error.message }
    revalidatePath('/medical-v')
    return { success: true }
}

export async function upsertMedicalCooperationRecord(
    date: string,
    residentId: string,
    isExecuted: boolean,
    facilityIdOverride?: string
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const facilityId = staff.role === 'admin' ? facilityIdOverride : staff.facility_id
    if (!facilityId) return { error: 'No Facility ID' }

    if (isExecuted) {
        const { error } = await supabase
            .from('medical_cooperation_records')
            .upsert({
                facility_id: facilityId,
                resident_id: residentId,
                date,
                staff_id: staff.id, // Executed by current staff
                updated_at: new Date().toISOString()
            }, { onConflict: 'resident_id, date' }) // Ensure unique constraint

        if (error) return { error: error.message }
    } else {
        // Delete Record
        const { error } = await supabase
            .from('medical_cooperation_records')
            .delete()
            .eq('facility_id', facilityId)
            .eq('resident_id', residentId)
            .eq('date', date)

        if (error) return { error: error.message }
    }

    // After changing a record, we need to re-calculate the daily summary for that date
    // Fetch all records for this date to count unique staff
    const { data: dayRecords } = await supabase
        .from('medical_cooperation_records')
        .select('staff_id')
        .eq('facility_id', facilityId)
        .eq('date', date)
        .not('staff_id', 'is', null)

    const uniqueStaffIds = new Set(dayRecords?.map(r => r.staff_id).filter(Boolean))
    const nurseCount = uniqueStaffIds.size

    // Calculate Units (Placeholder Logic)
    // TODO: Define exact unit calculation rule.
    // For now, let's assume specific unit values based on specs if known, or 0.
    const calculatedUnits = 0

    const { error } = await supabase
        .from('medical_coord_v_daily')
        .upsert({
            facility_id: facilityId,
            date: date,
            nurse_count: nurseCount,
            calculated_units: calculatedUnits,
            updated_at: new Date().toISOString()
        }, { onConflict: 'facility_id, date' })

    if (error) return { error: error.message }
    revalidatePath('/medical-v')
    return { success: true }
}

// Bulk Upsert Logic
export type MedicalCooperationRecordInput = {
    residentId: string
    date: string
    staffId: string | null
}

export async function upsertMedicalCooperationRecordsBulk(
    records: MedicalCooperationRecordInput[],
    facilityIdOverride?: string
) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    const supabase = await createClient()
    const facilityId = staff.role === 'admin' ? facilityIdOverride : staff.facility_id
    if (!facilityId) return { error: 'No Facility ID' }

    // 1. Group by Date to identify which days need summary update
    const affectedDates = new Set<string>()
    const upsertPayload = records.map(r => {
        affectedDates.add(r.date)
        return {
            facility_id: facilityId,
            resident_id: r.residentId,
            date: r.date,
            staff_id: r.staffId,
            updated_at: new Date().toISOString()
        }
    })

    // 2. Upsert Records
    console.log('[MedicalCoop] Upserting payload:', JSON.stringify(upsertPayload, null, 2))
    const { data: upsertData, error: recordsError } = await supabase
        .from('medical_cooperation_records')
        .upsert(upsertPayload, { onConflict: 'resident_id, date' })
        .select()

    if (recordsError) {
        console.error('[MedicalCoop] Upsert Error:', recordsError)
        return { error: recordsError.message }
    }
    console.log('[MedicalCoop] Upsert Success, rows:', upsertData?.length)

    // 3. Update Daily Summaries (Nurse Count & Units)
    // For each affected date, re-calculate nurse count.
    for (const dateStr of Array.from(affectedDates)) {
        // Fetch all records for this date to count unique staff
        const { data: dayRecords } = await supabase
            .from('medical_cooperation_records')
            .select('staff_id')
            .eq('facility_id', facilityId)
            .eq('date', dateStr)
            .not('staff_id', 'is', null)

        const uniqueStaffIds = new Set(dayRecords?.map(r => r.staff_id).filter(Boolean))
        const nurseCount = uniqueStaffIds.size

        // Calculate Units (Placeholder Logic)
        // TODO: Define exact unit calculation rule. 
        // For now, let's assume specific unit values based on specs if known, or 0.
        const calculatedUnits = 0

        await supabase
            .from('medical_coord_v_daily')
            .upsert({
                facility_id: facilityId,
                date: dateStr,
                nurse_count: nurseCount,
                calculated_units: calculatedUnits,
                updated_at: new Date().toISOString()
            }, { onConflict: 'facility_id, date' })
    }

    revalidatePath('/medical-v')
    return { success: true }
}
