'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

import { getCurrentStaff } from '@/lib/auth-helpers'

export async function upsertStaff(formData: FormData) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '権限がありません' }
    const facilityId = staff.facility_id

    const inputFacilityId = formData.get('facility_id') as string || null

    // システム管理者・管理者の場合、指定されたfacility_idがあればそれを使う
    let targetFacilityId = facilityId
    if ((staff.role === 'admin' || staff.role === 'manager') && inputFacilityId) {
        targetFacilityId = inputFacilityId
    }

    const supabase = await createClient()

    const id = formData.get('id') as string // 編集時はIDが存在する
    const name = formData.get('name') as string
    const role = formData.get('role') as string
    const status = 'active' // TODO: ステータス変更対応時はフォームから受け取る

    const joinDate = formData.get('join_date') as string || null
    const leaveDate = formData.get('leave_date') as string || null
    const qualificationId = formData.get('qualification_id') as string || null
    const qualificationsText = formData.get('qualifications_text') as string || null // マスタ選択時の名称など

    // Job Types is passed as JSON string because FormData doesn't support arrays nicely
    const jobTypesJson = formData.get('job_types') as string
    const jobTypes = jobTypesJson ? JSON.parse(jobTypesJson) : []

    if (!name || !role) {
        return { error: '職員名と役割は必須です' }
    }

    const dataToSave = {
        facility_id: targetFacilityId,
        organization_id: staff.organization_id,
        name,
        role,
        status,
        join_date: joinDate,
        leave_date: leaveDate,
        // qualification_id: qualificationId, // DBにカラムがないため除外
        qualifications: qualificationsText, // DBカラム名は qualifications
        job_types: jobTypes,
        updated_at: new Date().toISOString()
    }

    let error;

    if (id) {
        // Update
        const result = await supabase
            .from('staffs')
            .update(dataToSave)
            .eq('id', id)
        error = result.error
    } else {
        // Insert
        const result = await supabase
            .from('staffs')
            .insert(dataToSave)
        error = result.error
    }

    if (error) {
        console.error(error)
        return { error: error.message }
    }

    revalidatePath('/staffs')
    return { success: true }
}

export async function deleteStaff(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('staffs')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/staffs')
    return { success: true }
}

export async function createInvitation(formData: FormData) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '権限がありません' }
    const facilityId = staff.facility_id

    const email = formData.get('email') as string
    const role = formData.get('role') as string

    if (!email || !role) return { error: '必須項目が未入力です' }

    const supabase = await createClient()

    // Check if already invited
    const { data: existing } = await supabase
        .from('invitations')
        .select('token')
        .eq('email', email)
        .is('used_at', null)
        .single()

    if (existing) {
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${existing.token}`
        return { success: true, link: inviteLink, isResend: true }
    }

    const token = randomUUID()
    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
        .from('invitations')
        .insert({
            email,
            role,
            facility_id: facilityId,
            token,
            expires_at: expiresAt
        })

    if (error) return { error: error.message }

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
    return { success: true, link: inviteLink }
}
