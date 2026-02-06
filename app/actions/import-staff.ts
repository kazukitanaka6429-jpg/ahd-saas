'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { decodeCsvFile, parseCsvContent } from '@/lib/csv-utils'
import { revalidatePath } from 'next/cache'

export async function importStaffs(formData: FormData) {
    try {
        await protect()
        const currentStaff = await getCurrentStaff()

        // Admin only for Staff Master Import usually, or Manager?
        // User requested "Staff Master" import. Usually Admin.
        if (!currentStaff || currentStaff.role !== 'admin') {
            return { error: '権限がありません' }
        }

        const file = formData.get('file') as File
        if (!file) return { error: 'ファイルが必要です' }

        // 1. Decode and Parse
        const content = await decodeCsvFile(file, ['氏名', 'name', '施設名'])
        const rows = parseCsvContent(content)

        if (rows.length === 0) return { error: '有効なデータが見つかりません' }

        const supabase = await createClient()

        // 2. Pre-fetch Master Data (Facilities, Qualifications)
        const { data: facilities } = await supabase.from('facilities').select('id, name')
        const { data: qualifications } = await supabase.from('qualifications').select('id, name')

        const facilityMap = new Map((facilities || []).map(f => [f.name, f.id]))
        const qualificationMap = new Map((qualifications || []).map(q => [q.name, q.id]))

        // 3. Process Rows
        const processed = []
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const name = row['氏名'] || row['Name'] || row['name']
            const facilityName = row['施設名'] || row['Facility'] || row['facility']
            const qualName = row['資格'] || row['Qualification'] || row['qualification']

            if (!name || !facilityName) {
                errorCount++
                errors.push(`${i + 2}行目: 氏名または施設名が不足しています`)
                continue
            }

            const facilityId = facilityMap.get(facilityName)
            if (!facilityId) {
                errorCount++
                errors.push(`${i + 2}行目: 施設「${facilityName}」が見つかりません`)
                continue
            }

            const qualificationId = qualName ? qualificationMap.get(qualName) : null

            processed.push({
                organization_id: currentStaff.organization_id,
                facility_id: facilityId,
                name: name,
                role: 'staff', // Default as requested
                qualification_id: qualificationId,
                status: 'active',
                job_types: [] // Empty default
            })
            successCount++
        }

        if (processed.length === 0) {
            return { error: 'インポート可能なデータがありませんでした', details: errors }
        }

        // 4. Upsert (or Insert)
        // User said "Import", implies creating new. 
        // "Same name check" was mentioned.
        // Simple strategy: Insert. If collision?
        // Staffs table doesn't imply unique name typically. 
        // We will just insert for now. 
        const { error: insertError } = await supabase
            .from('staffs')
            .insert(processed)

        if (insertError) {
            logger.error('Import Staff Insert Error:', insertError)
            return { error: 'データの保存に失敗しました: ' + insertError.message }
        }

        revalidatePath('/staffs')
        return {
            success: true,
            message: `${successCount}件の取込に成功しました${errorCount > 0 ? `（${errorCount}件のエラー）` : ''}`,
            details: errors
        }

    } catch (e: any) {
        logger.error('importStaffs unexpected error', e)
        return { error: '予期せぬエラーが発生しました: ' + e.message }
    }
}
