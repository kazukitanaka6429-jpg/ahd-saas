'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { Qualification } from '@/types'
import { revalidatePath } from 'next/cache'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

/**
 * 資格一覧を取得
 */
export async function getQualifications() {
    try {
        await protect()

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('qualifications')
            .select('*')
            .order('is_medical_coord_iv_target', { ascending: false })
            .order('name')

        if (error) {
            logger.error('Error fetching qualifications:', error)
            return { error: '資格情報の取得に失敗しました' }
        }

        return { data: data as Qualification[] }
    } catch (e) {
        logger.error('Unexpected error in getQualifications', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * 資格を追加・更新
 */
export async function upsertQualification(data: Partial<Qualification>) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
            return { error: '権限がありません' }
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
            logger.error('Error adding/updating qualification:', error)
            return { error: translateError(error.message) }
        }

        revalidatePath('/admin/qualifications')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertQualification', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * 資格を削除
 */
export async function deleteQualification(id: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff || (staff.role !== 'admin' && staff.role !== 'manager')) {
            return { error: '権限がありません' }
        }

        const supabase = await createClient()

        // Log pre-deletion warning
        logger.warn(`削除試行: User ${staff.id} is deleting Qualification ${id}`, {
            actor: staff.id,
            target: 'qualification',
            targetId: id
        })

        const { error } = await supabase
            .from('qualifications')
            .delete()
            .eq('id', id)

        if (error) {
            logger.error('Error deleting qualification:', error)
            return { error: translateError(error.message) }
        }

        revalidatePath('/admin/qualifications')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in deleteQualification', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}
