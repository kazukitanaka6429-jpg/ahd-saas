'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'
import { Resident } from '@/types'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { logOperation } from '@/lib/operation-logger'

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

        if (dailyRecords && dailyRecords.length > 0) {
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
        }

        logger.info(`Recalculated Medical V units for facility ${facilityId}: targetCount=${targetCount}`)
    } catch (e) {
        logger.error('recalculateMedicalVUnits error:', e)
    }
}

// Helper: Translate common database error messages to Japanese
// Now imported from lib/error-translator.ts, this local function is deprecated/removed.
// Keeping this comment block for diff clarity, but removing the function implementation.
// (Already handled by import above)

// CRUD for Residents

export async function getResidents(facilityIdOverride?: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: translateError('Unauthorized') }

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
        if (error) {
            logger.error('getResidents failed', error)
            return { error: translateError(error.message) }
        }

        return { data: data as Resident[] }
    } catch (e) {
        logger.error('Unexpected error in getResidents', e)
        return { error: translateError('Unexpected Error') }
    }
}

export interface ResidentInput {
    facility_id?: string
    unit_id?: string | null // NEW: Unit ID support
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
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: translateError('Unauthorized') }

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
                unit_id: data.unit_id || null, // Save Unit ID
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

        if (error) {
            logger.error('createResident failed', error)
            return { error: translateError(error.message) }
        }

        // Recalculate Medical V units for current month when resident is created
        await recalculateMedicalVUnits(facilityId, supabase)

        // Audit Log
        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'resident',
            actionType: 'CREATE',
            details: { name: data.name, facilityId }
        })

        revalidatePath('/residents')
        revalidatePath('/medical-v')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in createResident', e)
        return { error: translateError('Unexpected Error') }
    }
}

export async function updateResident(id: string, data: Partial<ResidentInput>) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: translateError('Unauthorized') }

        // Facility ID cannot be changed easily via this action usually, 
        // unless admin moves resident. For now, ignore facility_id update or handle separately.

        const supabase = await createClient()

        const { error } = await supabase
            .from('residents')
            .update({
                unit_id: data.unit_id, // Allow updating unit
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

        if (error) {
            logger.error('updateResident failed', error)
            return { error: translateError(error.message) }
        }

        // Recalculate Medical V units for current month when resident sputum_suction might have changed
        // First get the resident's facility_id
        const { data: resident } = await supabase.from('residents').select('facility_id').eq('id', id).single()
        if (resident?.facility_id) {
            await recalculateMedicalVUnits(resident.facility_id, supabase)
        }

        // Audit Log
        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'resident',
            actionType: 'UPDATE',
            targetId: id,
            details: { name: data.name }
        })

        revalidatePath('/residents')
        revalidatePath('/medical-v')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in updateResident', e)
        return { error: translateError('Unexpected Error') }
    }
}

export async function deleteResident(id: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: translateError('Unauthorized') }

        const supabase = await createClient()

        // Log pre-deletion warning
        logger.warn(`削除試行: User ${staff.id} is deleting Resident ${id}`, {
            actor: staff.id,
            target: 'resident',
            targetId: id
        })

        const { error } = await supabase
            .from('residents')
            .delete()
            .eq('id', id)

        if (error) {
            logger.error('deleteResident failed', error)
            return { error: translateError(error.message) }
        }

        // Audit Log
        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'resident',
            actionType: 'DELETE',
            targetId: id
        })

        revalidatePath('/residents')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in deleteResident', e)
        return { error: translateError('Unexpected Error') }
    }
}
