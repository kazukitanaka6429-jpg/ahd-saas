'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { decodeCsvFile, parseCsvContent } from '@/lib/csv-utils'
import { revalidatePath } from 'next/cache'

export async function importResidents(formData: FormData) {
    try {
        await protect()
        const currentStaff = await getCurrentStaff()

        // Admin only usually.
        if (!currentStaff || currentStaff.role !== 'admin') {
            return { error: '権限がありません' }
        }

        const file = formData.get('file') as File
        if (!file) return { error: 'ファイルが必要です' }

        // 1. Decode and Parse
        const content = await decodeCsvFile(file, ['氏名', 'name', '施設名', 'ID'])
        const rows = parseCsvContent(content)

        if (rows.length === 0) return { error: '有効なデータが見つかりません' }

        const supabase = await createClient()

        // 2. Pre-fetch Master Data (Facilities, Units)
        const { data: facilities } = await supabase.from('facilities').select('id, name')
        const { data: units } = await supabase.from('units').select('id, name, facility_id')

        const facilityMap = new Map((facilities || []).map(f => [f.name, f.id]))
        // Unit requires facility context. Map: "FacilityID:UnitName" -> UnitID
        const unitMap = new Map((units || []).map(u => [`${u.facility_id}:${u.name}`, u.id]))

        // 3. Process Rows
        const processed = []
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const name = row['氏名'] || row['Name'] || row['name']
            const facilityName = row['施設名'] || row['Facility'] || row['facility']
            const displayId = row['ID'] || row['id']
            const unitName = row['ユニット'] || row['Unit'] || row['unit']
            const moveInDateRaw = row['入居日'] || row['MoveIn'] || row['move_in_date']

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

            // Unit Matching (Ignore if not found)
            let unitId = null
            if (unitName) {
                unitId = unitMap.get(`${facilityId}:${unitName}`) || null
                // If not found, we just ignore it as requested.
            }

            // Date Parsing
            let moveInDate = null
            if (moveInDateRaw) {
                // Try simple parse
                const d = new Date(moveInDateRaw)
                if (!isNaN(d.getTime())) {
                    moveInDate = d.toISOString().split('T')[0]
                }
            }

            // ID Handling: If displayId is empty, we don't set it (let DB default or null?)
            // display_id is nullable text typically.

            processed.push({
                facility_id: facilityId,
                name: name,
                display_id: displayId || null,
                unit_id: unitId,
                move_in_date: moveInDate,
                status: 'in_facility' // Default status
            })
            successCount++
        }

        if (processed.length === 0) {
            return { error: 'インポート可能なデータがありませんでした', details: errors }
        }

        // 4. Insert
        const { error: insertError } = await supabase
            .from('residents')
            .insert(processed)

        if (insertError) {
            logger.error('Import Resident Insert Error:', insertError)
            return { error: 'データの保存に失敗しました: ' + insertError.message }
        }

        revalidatePath('/residents')
        return {
            success: true,
            message: `${successCount}件の取込に成功しました${errorCount > 0 ? `（${errorCount}件のエラー）` : ''}`,
            details: errors
        }

    } catch (e: any) {
        logger.error('importResidents unexpected error', e)
        return { error: '予期せぬエラーが発生しました: ' + e.message }
    }
}
