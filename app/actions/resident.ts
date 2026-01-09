'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'
import { Resident } from '@/types'

// Helper: Recalculate Medical V units for the entire current month
// Called when sputum_suction flag changes for any resident
async function recalculateMedicalVUnits(facilityId: string, supabase: any) {
    try {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

        // Count target residents (with sputum_suction = true)
        const { data: residents } = await supabase
            .from('residents')
            .select('id, sputum_suction')
            .eq('facility_id', facilityId)
            .eq('status', 'in_facility')

        const targetCount = (residents || []).filter((r: any) => r.sputum_suction).length
        if (targetCount <= 0) return // No calculation needed if no targets

        // Get all daily records for this month
        const { data: dailyRecords } = await supabase
            .from('medical_coord_v_daily')
            .select('id, date, nurse_count')
            .eq('facility_id', facilityId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (!dailyRecords || dailyRecords.length === 0) return

        // Recalculate units for each day
        for (const daily of dailyRecords) {
            const nurseCount = daily.nurse_count || 0
            const calculatedUnits = Math.floor((500 * nurseCount) / targetCount)

            await supabase
                .from('medical_coord_v_daily')
                .update({
                    calculated_units: calculatedUnits,
                    updated_at: new Date().toISOString()
                })
                .eq('id', daily.id)
        }

        console.log(`Recalculated Medical V units for facility ${facilityId}: targetCount=${targetCount}`)
    } catch (e) {
        console.error('recalculateMedicalVUnits error:', e)
    }
}

// Helper: Translate common database error messages to Japanese
function translateError(errorMessage: string): string {
    const translations: Record<string, string> = {
        'duplicate key value violates unique constraint': 'この表示IDは既に使用されています',
        'idx_residents_org_display_id': '同じ法人内で重複する表示IDは登録できません',
        'violates foreign key constraint': '関連するデータが存在するため削除できません',
        'null value in column': '必須項目が入力されていません',
        'invalid input syntax for type': '入力形式が正しくありません',
        'value too long for type': '入力値が長すぎます',
        'Unauthorized': '認証が必要です',
        'permission denied': 'この操作を行う権限がありません',
    }

    for (const [eng, jpn] of Object.entries(translations)) {
        if (errorMessage.includes(eng)) {
            return jpn
        }
    }

    // If no specific translation, return a generic Japanese message with original for debugging
    return `エラー: ${errorMessage}`
}

// CRUD for Residents

export async function getResidents(facilityIdOverride?: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '認証が必要です' }

    const supabase = await createClient()

    let query = supabase
        .from('residents')
        .select('*')
        .order('display_id', { ascending: true, nullsFirst: false }) // Sort by display_id (user-defined)

    // Filter Logic
    if (staff.role === 'admin') {
        // Admin can see all, or filter by specific facility if provided
        if (facilityIdOverride) {
            query = query.eq('facility_id', facilityIdOverride)
        }
    } else {
        // Manager/Staff restricted to own facility
        // (RLS enforces this too, but explicit query is better)
        if (staff.facility_id) {
            query = query.eq('facility_id', staff.facility_id)
        }
    }

    const { data, error } = await query
    if (error) return { error: error.message }

    return { data: data as Resident[] }
}

export interface ResidentInput {
    facility_id?: string
    display_id?: number // User-defined display ID
    name: string
    status: 'in_facility' | 'hospitalized' | 'home_stay' | 'left'
    care_level?: string
    primary_insurance?: string
    public_expense_1?: string
    public_expense_2?: string
    limit_application_class?: string
    sputum_suction: boolean
    severe_disability_addition: boolean
    ventilator: boolean
    table_7: boolean
    table_8: boolean
    start_date?: string
    end_date?: string
}

export async function createResident(data: ResidentInput) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: 'Unauthorized' }

    // Resolve Facility ID
    let facilityId = staff.facility_id
    if (staff.role === 'admin') {
        if (data.facility_id) {
            facilityId = data.facility_id
        } else {
            return { error: '管理者は施設を選択してください' }
        }
    }

    if (!facilityId) return { error: '施設の選択が必要です' }

    const supabase = await createClient()

    const { error } = await supabase
        .from('residents')
        .insert({
            facility_id: facilityId,
            organization_id: staff.organization_id, // For org-level uniqueness of display_id
            display_id: data.display_id || null,
            name: data.name,
            status: data.status,
            care_level: data.care_level || null,
            primary_insurance: data.primary_insurance || null,
            public_expense_1: data.public_expense_1 || null,
            public_expense_2: data.public_expense_2 || null,
            limit_application_class: data.limit_application_class || null,
            sputum_suction: data.sputum_suction,
            severe_disability_addition: data.severe_disability_addition,
            ventilator: data.ventilator,
            table_7: data.table_7,
            table_8: data.table_8,
            start_date: data.start_date || null,
            end_date: data.end_date || null
        })

    if (error) return { error: translateError(error.message) }

    // Recalculate Medical V units for current month when resident is created
    await recalculateMedicalVUnits(facilityId, supabase)

    revalidatePath('/residents')
    revalidatePath('/medical-v')
    return { success: true }
}

export async function updateResident(id: string, data: Partial<ResidentInput>) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: translateError('Unauthorized') }

    // Facility ID cannot be changed easily via this action usually, 
    // unless admin moves resident. For now, ignore facility_id update or handle separately.

    const supabase = await createClient()

    const { error } = await supabase
        .from('residents')
        .update({
            display_id: data.display_id,
            name: data.name,
            status: data.status,
            care_level: data.care_level,
            primary_insurance: data.primary_insurance,
            public_expense_1: data.public_expense_1,
            public_expense_2: data.public_expense_2,
            limit_application_class: data.limit_application_class,
            sputum_suction: data.sputum_suction,
            severe_disability_addition: data.severe_disability_addition,
            ventilator: data.ventilator,
            table_7: data.table_7,
            table_8: data.table_8,
            start_date: data.start_date,
            end_date: data.end_date,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) return { error: translateError(error.message) }

    // Recalculate Medical V units for current month when resident sputum_suction might have changed
    // First get the resident's facility_id
    const { data: resident } = await supabase.from('residents').select('facility_id').eq('id', id).single()
    if (resident?.facility_id) {
        await recalculateMedicalVUnits(resident.facility_id, supabase)
    }

    revalidatePath('/residents')
    revalidatePath('/medical-v')
    return { success: true }
}

export async function deleteResident(id: string) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: translateError('Unauthorized') }

    const supabase = await createClient()

    const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', id)

    if (error) return { error: translateError(error.message) }

    revalidatePath('/residents')
    return { success: true }
}
