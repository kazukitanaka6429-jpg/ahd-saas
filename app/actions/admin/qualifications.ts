'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { Qualification } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * 資格一覧を取得
 */
export async function getQualifications() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('qualifications')
        .select('*')
        .order('is_medical_coord_iv_target', { ascending: false })
        .order('name')

    if (error) {
        throw new Error(error.message)
    }

    return data as Qualification[]
}

/**
 * 資格を追加・更新
 */
export async function upsertQualification(data: Partial<Qualification>) {
    const staff = await getCurrentStaff()
    if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
        throw new Error('権限がありません')
    }

    const supabase = await createClient()

    // 新規作成の場合、IDを削除してDB生成に任せるか、生成する
    // SupabaseのUUIDデフォルト設定があるので、IDなしで送信すれば生成されるはず
    const payload = {
        ...data,
        updated_at: new Date().toISOString()
    }
    if (!payload.id) delete payload.id
    if (!payload.created_at) delete payload.created_at

    const { error } = await supabase
        .from('qualifications')
        .upsert(payload)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/qualifications')
    return { success: true }
}

/**
 * 資格を削除
 */
export async function deleteQualification(id: string) {
    const staff = await getCurrentStaff()
    if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
        throw new Error('権限がありません')
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('qualifications')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/qualifications')
    return { success: true }
}
