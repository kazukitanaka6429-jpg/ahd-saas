'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'

// Get All Staffs for current context
export async function getStaffs() {
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
    if (error) return { error: error.message }
    return { data }
}

export async function createStaff(data: {
    name: string
    role: 'admin' | 'manager' | 'staff'
    facility_id: string | null
    qualification_id: string | null
    job_types: string[]
}) {
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

    if (error) return { error: error.message }

    revalidatePath('/staffs')
    return { success: true, staff: newStaff }
}

export async function updateStaff(staffId: string, data: {
    name?: string
    role?: 'admin' | 'manager' | 'staff'
    facility_id?: string | null
    qualification_id?: string | null
    job_types?: string[]
    status?: 'active' | 'retired'
}) {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
        return { error: 'Permission denied' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('staffs')
        .update(data)
        .eq('id', staffId)

    if (error) return { error: error.message }

    revalidatePath('/staffs')
    return { success: true }
}

export async function generateInviteLink(staffId: string) {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
        return { error: 'Permission denied' }
    }

    // Use Admin Client to update token (though manager should be able to update own staff via RLS, 
    // invite token generation might require bypassing some checks or robust handling)
    // Using admin client avoids RLS complexity strictly for this operation ensures it works.
    let supabaseAdmin
    try {
        supabaseAdmin = createAdminClient()
    } catch (e) {
        return { error: 'システム設定エラー: キーが見つかりません' }
    }

    const token = crypto.randomUUID()

    const { error } = await supabaseAdmin
        .from('staffs')
        .update({ invite_token: token })
        .eq('id', staffId)

    if (error) return { error: error.message }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/join?token=${token}`

    revalidatePath('/staffs')
    return { success: true, url: inviteUrl }
}

export async function deleteStaff(staffId: string) {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff || (currentStaff.role !== 'admin' && currentStaff.role !== 'manager')) {
        return { error: 'Permission denied' }
    }

    const supabase = await createClient()

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

    if (error) return { error: error.message }

    // Clean up Supabase Auth User if exists
    if (targetStaff?.auth_user_id) {
        try {
            const supabaseAdmin = createAdminClient()
            await supabaseAdmin.auth.admin.deleteUser(targetStaff.auth_user_id)
        } catch (e) {
            console.error('Failed to delete auth user:', e)
            // Continue as DB record is deleted
        }
    }

    revalidatePath('/staffs')
    return { success: true }
}
