'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { logOperation } from '@/lib/operation-logger'

// Get All Staffs for current context
export async function getStaffs() {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff) return { error: '認証が必要です' }

        const supabase = await createClient()

        // Query logic depends on Role
        let query = supabase.from('staffs').select(`
            *,
            facilities ( name )
        `)
            .order('created_at', { ascending: false })

        // RLS handles visibility, but explicit filtering helps performance/logic
        if (currentStaff.role === 'admin') {
            // Admin sees all in organization
            query = query.eq('organization_id', currentStaff.organization_id)
        } else {
            // Manager/Staff sees facility
            if (currentStaff.facility_id) {
                query = query.eq('facility_id', currentStaff.facility_id)
            }
        }

        const { data, error } = await query
        if (error) {
            logger.error('Error fetching staffs:', error)
            return { error: '職員情報の取得に失敗しました' }
        }
        return { data }
    } catch (e) {
        logger.error('Unexpected error in getStaffs', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function createStaff(data: {
    name: string
    role: 'admin' | 'manager' | 'staff'
    facility_id: string | null
    qualification_id: string | null
    job_types: string[]
}) {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
            return { error: '権限がありません' }
        }

        const supabase = await createClient()

        // 1. Prepare Data
        const insertData = {
            organization_id: currentStaff.organization_id,
            facility_id: data.facility_id,
            name: data.name,
            role: data.role,
            qualification_id: data.qualification_id,
            job_types: data.job_types,
            status: 'active' as const
        }

        // 2. Insert
        const { data: newStaff, error } = await supabase
            .from('staffs')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            logger.error('Error creating staff:', error)
            return { error: translateError(error.message) }
        }

        // Audit Log
        logOperation({
            organizationId: currentStaff.organization_id,
            actorId: currentStaff.id,
            targetResource: 'staff',
            actionType: 'CREATE',
            targetId: newStaff?.id,
            details: { name: data.name, role: data.role }
        })

        revalidatePath('/staffs')
        return { success: true, staff: newStaff }
    } catch (e) {
        logger.error('Unexpected error in createStaff', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function updateStaff(staffId: string, data: {
    name?: string
    role?: 'admin' | 'manager' | 'staff'
    facility_id?: string | null
    qualification_id?: string | null
    job_types?: string[]
    status?: 'active' | 'retired'
}) {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
            return { error: '権限がありません' }
        }

        const supabase = await createClient()

        const { error } = await supabase
            .from('staffs')
            .update(data)
            .eq('id', staffId)

        if (error) {
            logger.error('Error updating staff:', error)
            return { error: translateError(error.message) }
        }

        // Audit Log
        logOperation({
            organizationId: currentStaff.organization_id,
            actorId: currentStaff.id,
            targetResource: 'staff',
            actionType: 'UPDATE',
            targetId: staffId,
            details: { name: data.name, role: data.role }
        })

        revalidatePath('/staffs')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in updateStaff', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function generateInviteLink(staffId: string) {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
            return { error: '権限がありません' }
        }

        // Use Admin Client to update token (though manager should be able to update own staff via RLS, 
        // invite token generation might require bypassing some checks or robust handling)
        // Using admin client avoids RLS complexity strictly for this operation ensures it works.
        let supabaseAdmin
        try {
            supabaseAdmin = createAdminClient()
        } catch (e) {
            logger.error('System config error in generateInviteLink', e)
            return { error: 'システム設定エラー: キーが見つかりません' }
        }

        const token = crypto.randomUUID()

        const { error } = await supabaseAdmin
            .from('staffs')
            .update({ invite_token: token })
            .eq('id', staffId)

        if (error) {
            logger.error('Error generating invite link:', error)
            return { error: translateError(error.message) }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const inviteUrl = `${baseUrl}/join?token=${token}`

        revalidatePath('/staffs')
        return { success: true, url: inviteUrl }
    } catch (e) {
        logger.error('Unexpected error in generateInviteLink', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function deleteStaff(staffId: string) {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
            return { error: '権限がありません' }
        }

        const supabase = await createClient()

        // Log pre-deletion warning
        logger.warn(`削除試行: User ${currentStaff.id} is deleting Staff ${staffId}`, {
            actor: currentStaff.id,
            target: 'staff',
            targetId: staffId
        })

        // Get auth_user_id before deletion to clean up Auth User
        const { data: targetStaff } = await supabase
            .from('staffs')
            .select('auth_user_id')
            .eq('id', staffId)
            .single()

        const { error } = await supabase
            .from('staffs')
            .delete()
            .eq('id', staffId)

        if (error) {
            logger.error('Error deleting staff:', error)
            return { error: translateError(error.message) }
        }

        // Clean up Supabase Auth User if exists
        if (targetStaff?.auth_user_id) {
            try {
                const supabaseAdmin = createAdminClient()
                await supabaseAdmin.auth.admin.deleteUser(targetStaff.auth_user_id)
            } catch (e) {
                logger.error('Failed to delete auth user:', e)
                // Continue as DB record is deleted
            }
        }

        // Audit Log
        logOperation({
            organizationId: currentStaff.organization_id,
            actorId: currentStaff.id,
            targetResource: 'staff',
            actionType: 'DELETE',
            targetId: staffId
        })

        revalidatePath('/staffs')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in deleteStaff', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export type SimpleStaff = {
    id: string
    name: string
    facility_id: string
    role: string
}

export async function getStaffListForFilter() {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return []

        const supabase = await createClient()
        let query = supabase
            .from('staffs')
            .select('id, name, facility_id, role')
            .order('name')

        // If not HQ, only show staff from same facility
        if (staff.role !== 'admin') {
            query = query.eq('facility_id', staff.facility_id)
        }

        const { data, error } = await query

        if (error) {
            logger.error('Error fetching staff list:', error)
            return []
        }

        return data as SimpleStaff[]
    } catch (e) {
        logger.error('Unexpected error in getStaffListForFilter', e)
        return []
    }
}
