'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers' // Check if this is the correct path, heavily used in this project
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { protect, requireRole } from '@/lib/auth-guard'

export type Unit = {
    id: string
    organization_id: string
    facility_id: string
    name: string
    display_order: number
    created_at: string
}

export async function getUnits(facilityId?: string) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff) return { error: 'Unauthorized' }

        const supabase = await createClient()

        let query = supabase
            .from('units')
            .select('*')
            .eq('organization_id', staff.organization_id)

        if (facilityId) {
            query = query.eq('facility_id', facilityId)
        }

        const { data, error } = await query.order('display_order', { ascending: true })

        if (error) {
            logger.error('getUnits failed', error)
            return { error: 'ユニットの取得に失敗しました' }
        }

        return { data: data as Unit[] }
    } catch (e) {
        logger.error('getUnits unexpected error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}



// ...

export async function upsertUnit(prevState: any, formData: FormData) {
    try {
        // Require Admin or Manager role
        const staff = await requireRole(['admin', 'manager'])

        // ... (staff is already defined)

        const unitId = formData.get('id') as string | null
        const name = formData.get('name') as string
        const displayOrder = parseInt(formData.get('display_order') as string || '0')
        const facilityId = formData.get('facility_id') as string | null

        if (!name) return { error: 'ユニット名は必須です' }
        if (!facilityId) return { error: '施設IDは必須です' }

        const supabase = await createClient()

        const payload: any = {
            organization_id: staff.organization_id,

            facility_id: facilityId,
            name,
            display_order: displayOrder,
            // updated_at: new Date().toISOString() // Column does not exist
        }

        if (unitId) {
            payload.id = unitId
        }

        const { error } = await supabase
            .from('units')
            .upsert(payload)

        if (error) {
            logger.error('upsertUnit failed', error)
            return { error: `ユニットの保存に失敗しました: ${error.message}` }
        }

        revalidatePath('/admin/facilities')
        revalidatePath('/daily-reports')
        revalidatePath('/medical-cooperation')
        revalidatePath('/medical-v')

        return { success: true, message: 'ユニットを保存しました' }
    } catch (e) {
        logger.error('upsertUnit unexpected error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function deleteUnit(baseState: any, formData: FormData) {
    try {
        const staff = await requireRole(['admin', 'manager'])

        const unitId = formData.get('id') as string
        if (!unitId) return { error: 'IDが必要です' }

        const supabase = await createClient()

        // Check if residents exist
        const { count, error: countError } = await supabase
            .from('residents')
            .select('id', { count: 'exact', head: true })
            .eq('unit_id', unitId)

        if (countError) {
            logger.error('deleteUnit check failed', countError)
            return { error: '削除前の確認に失敗しました' }
        }

        if (count && count > 0) {
            return { error: '利用者が所属しているユニットは削除できません。先に利用者の所属を変更してください。' }
        }

        const { error } = await supabase
            .from('units')
            .delete()
            .eq('id', unitId)
            .eq('organization_id', staff.organization_id) // Safety check

        if (error) {
            logger.error('deleteUnit failed', error)
            return { error: '削除に失敗しました' }
        }

        revalidatePath('/settings/units')
        revalidatePath('/daily-reports')
        return { success: true, message: 'ユニットを削除しました' }
    } catch (e) {
        logger.error('deleteUnit unexpected error', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
