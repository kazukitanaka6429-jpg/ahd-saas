'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logOperation } from '@/lib/operation-logger'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

/* --- Manual Work --- */
export async function upsertManualWork(data: {
    id?: string,
    staff_id: string,
    target_date: string,
    start_time: string,
    end_time: string,
    note?: string
}) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff || !staff.facility_id) return { error: 'Unauthorized' }

        const supabase = await createClient()

        const payload: any = {
            staff_id: data.staff_id,
            target_date: data.target_date,
            start_time: data.start_time,
            end_time: data.end_time,
            note: data.note,
            facility_id: staff.facility_id,
            updated_at: new Date().toISOString()
        }
        if (data.id) {
            payload.id = data.id
        }

        const { data: inserted, error } = await supabase
            .from('manual_work_records')
            .upsert(payload)
            .select()
            .single()

        if (error) {
            console.error('Supabase Error Details:', JSON.stringify(error, null, 2))
            throw error
        }

        // Audit Log
        if (inserted) {
            logOperation({
                organizationId: staff.organization_id,
                actorId: staff.id,
                targetResource: 'manual_record',
                actionType: data.id ? 'UPDATE' : 'CREATE',
                targetId: inserted.id,
                details: { ...payload, facilityId: staff.facility_id }
            })
        }

        revalidatePath('/audit/personnel')
        return { success: true }
    } catch (e: any) {
        console.error('upsertManualWork Exception:', e)
        return { error: `Save Failed: ${e.message} (Code: ${e.code || 'N/A'}, Hint: ${e.hint || 'N/A'})` }
    }
}

export async function deleteManualWork(id: string) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('manual_work_records')
            .delete()
            .eq('id', id)

        if (error) throw error

        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'manual_record',
            actionType: 'DELETE',
            targetId: id,
            details: { facilityId: staff.facility_id }
        })

        revalidatePath('/audit/personnel')
        return { success: true }
    } catch (e: any) {
        return { error: 'Failed to delete' }
    }
}

/* --- Manual Deduction --- */
export async function upsertManualDeduction(data: {
    id?: string,
    staff_id: string,
    target_date: string,
    start_time: string,
    end_time: string,
    reason?: string
}) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff || !staff.facility_id) return { error: 'Unauthorized' }

        const supabase = await createClient()

        const payload: any = {
            staff_id: data.staff_id,
            target_date: data.target_date,
            start_time: data.start_time,
            end_time: data.end_time,
            reason: data.reason,
            facility_id: staff.facility_id,
            updated_at: new Date().toISOString()
        }
        if (data.id) {
            payload.id = data.id
        }

        const { data: inserted, error } = await supabase
            .from('manual_deductions')
            .upsert(payload)
            .select()
            .single()

        if (error) throw error

        if (inserted) {
            logOperation({
                organizationId: staff.organization_id,
                actorId: staff.id,
                targetResource: 'manual_deduction',
                actionType: data.id ? 'UPDATE' : 'CREATE',
                targetId: inserted.id,
                details: { ...payload, facilityId: staff.facility_id }
            })
        }

        revalidatePath('/audit/personnel')
        return { success: true }
    } catch (e: any) {
        logger.error('upsertManualDeduction error', e)
        return { error: 'Failed to save deduction record' }
    }
}

export async function deleteManualDeduction(id: string) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('manual_deductions')
            .delete()
            .eq('id', id)

        if (error) throw error

        logOperation({
            organizationId: staff.organization_id,
            actorId: staff.id,
            targetResource: 'manual_deduction',
            actionType: 'DELETE',
            targetId: id,
            details: { facilityId: staff.facility_id }
        })

        revalidatePath('/audit/personnel')
        return { success: true }
    } catch (e: any) {
        return { error: 'Failed to delete' }
    }
}
