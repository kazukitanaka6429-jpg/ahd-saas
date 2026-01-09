'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'

export async function getFacilities() {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff) return { error: '認証が必要です' }

    // RLS will handle visibility, but usually only Admin accesses this master list
    // Manager might see their own facility info elsewhere.

    const supabase = await createClient()
    const { data: facilities, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at')

    if (error) return { error: error.message }
    return { data: facilities }
}

export async function createFacility(data: {
    name: string
    code: string
    provider_number?: string
    settings?: any // jsonb
}) {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff || currentStaff.role !== 'admin') {
        return { error: '権限がありません' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('facilities')
        .insert({
            organization_id: currentStaff.organization_id, // Inherit Org
            name: data.name,
            code: data.code,
            provider_number: data.provider_number || null,
            settings: data.settings || {}
        })

    if (error) {
        if (error.code === '23505') return { error: '施設コードが既に存在します' }
        return { error: error.message }
    }

    revalidatePath('/facilities') // Adjust path as needed
    revalidatePath('/settings/facilities')
    return { success: true }
}

export async function updateFacility(id: string, data: {
    name?: string
    code?: string
    provider_number?: string
    settings?: any
}) {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff || currentStaff.role !== 'admin') {
        return { error: 'Permission denied' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('facilities')
        .update({
            name: data.name,
            code: data.code,
            provider_number: data.provider_number,
            settings: data.settings,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) {
        if (error.code === '23505') return { error: '施設コードが既に存在します' }
        return { error: error.message }
    }

    revalidatePath('/facilities')
    revalidatePath('/settings/facilities')
    return { success: true }
}

export async function deleteFacility(id: string) {
    const currentStaff = await getCurrentStaff()
    if (!currentStaff || currentStaff.role !== 'admin') {
        return { error: 'Permission denied' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/facilities')
    revalidatePath('/settings/facilities')
    return { success: true }
}
