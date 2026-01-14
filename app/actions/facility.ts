'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/app/actions/auth'
import { revalidatePath } from 'next/cache'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export async function getFacilities() {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff) return { error: '認証が必要です' }

        // RLS will handle visibility, but usually only Admin accesses this master list
        // Manager might see their own facility info elsewhere.

        const supabase = await createClient()
        const { data: facilities, error } = await supabase
            .from('facilities')
            .select('*')
            .order('created_at')

        if (error) {
            logger.error('getFacilities failed', error)
            return { error: translateError(error.message) }
        }
        return { data: facilities }
    } catch (e) {
        logger.error('Unexpected error in getFacilities', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function createFacility(data: {
    name: string
    code: string
    provider_number?: string
    settings?: any // jsonb
}) {
    try {
        await protect()

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
            logger.error('createFacility failed', error)
            if (error.code === '23505') return { error: '施設コードが既に存在します' }
            return { error: translateError(error.message) }
        }

        revalidatePath('/facilities') // Adjust path as needed
        revalidatePath('/settings/facilities')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in createFacility', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function updateFacility(id: string, data: {
    name?: string
    code?: string
    provider_number?: string
    settings?: any
}) {
    try {
        await protect()

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
            logger.error('updateFacility failed', error)
            if (error.code === '23505') return { error: '施設コードが既に存在します' }
            return { error: translateError(error.message) }
        }

        revalidatePath('/facilities')
        revalidatePath('/settings/facilities')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in updateFacility', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function deleteFacility(id: string) {
    try {
        await protect()

        const currentStaff = await getCurrentStaff()
        if (!currentStaff || currentStaff.role !== 'admin') {
            return { error: 'Permission denied' }
        }

        const supabase = await createClient()

        // Log pre-deletion warning
        logger.warn(`削除試行: User ${currentStaff.id} is deleting Facility ${id}`, {
            actor: currentStaff.id,
            target: 'facility',
            targetId: id
        })

        const { error } = await supabase
            .from('facilities')
            .delete()
            .eq('id', id)

        if (error) {
            logger.error('deleteFacility failed', error)
            return { error: translateError(error.message) }
        }

        revalidatePath('/facilities')
        revalidatePath('/settings/facilities')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in deleteFacility', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
