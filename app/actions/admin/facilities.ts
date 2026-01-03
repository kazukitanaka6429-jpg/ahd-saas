'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { Facility } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * 施設一覧を取得
 */
export async function getFacilities() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at')

    if (error) {
        throw new Error(error.message)
    }

    return data as Facility[]
}

/**
 * 施設を追加・更新
 */
export async function upsertFacility(data: Partial<Facility>) {
    const staff = await getCurrentStaff()
    if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
        throw new Error('権限がありません')
    }

    const supabase = await createClient()

    // organization_id がない場合はデフォルト法人を取得・設定
    let orgId = data.organization_id
    if (!orgId) {
        const { data: defaultOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('code', 'DEFAULT')
            .single()

        if (defaultOrg) {
            orgId = defaultOrg.id
        }
    }

    const payload = {
        ...data,
        organization_id: orgId,
        updated_at: new Date().toISOString()
    }
    if (!payload.id) delete payload.id
    if (!payload.created_at) delete payload.created_at

    const { error } = await supabase
        .from('facilities')
        .upsert(payload)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/facilities')
    return { success: true }
}

/**
 * 施設を削除
 */
export async function deleteFacility(id: string) {
    const staff = await getCurrentStaff()
    if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
        throw new Error('権限がありません')
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/facilities')
    return { success: true }
}
