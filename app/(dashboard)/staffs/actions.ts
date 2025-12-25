'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

import { getCurrentStaff } from '@/lib/auth-helpers'

export async function createStaff(formData: FormData) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '権限がありません' }
    const facilityId = staff.facility_id

    const supabase = await createClient()

    const name = formData.get('name') as string
    const role = formData.get('role') as string
    const status = 'active'

    const joinDate = formData.get('join_date') as string || null
    const leaveDate = formData.get('leave_date') as string || null
    const qualifications = formData.get('qualifications') as string || null

    // Job Types is passed as JSON string because FormData doesn't support arrays nicely
    const jobTypesJson = formData.get('job_types') as string
    const jobTypes = jobTypesJson ? JSON.parse(jobTypesJson) : []

    if (!name || !role) {
        return { error: '職員名と役割は必須です' }
    }

    const { error } = await supabase
        .from('staffs')
        .insert({
            facility_id: facilityId,
            name,
            role,
            status,
            join_date: joinDate,
            leave_date: leaveDate,
            qualifications: qualifications,
            job_types: jobTypes // Supabase can handle array if configured correctly (TEXT[])
        })

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
