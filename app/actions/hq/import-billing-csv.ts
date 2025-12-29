'use server'

import { createClient } from '@/lib/supabase/server'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'

export async function importBillingCsv(formData: FormData) {
    const file = formData.get('file') as File
    const facilityId = formData.get('facilityId') as string
    const dateStr = formData.get('date') as string // YYYY-MM-DD (typically first of month)

    if (!file || !facilityId || !dateStr) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        // Attempt to decode as Shift_JIS (common for Japanese CSVs), fallback to UTF-8 if needed logic could be added
        // but typically billing software uses Shift_JIS.
        const content = iconv.decode(buffer, 'Shift_JIS')

        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
        })

        if (!records || records.length === 0) {
            return { success: false, error: 'No records found in CSV' }
        }

        // CSV Header Mapping (Based on user requirement)
        // B列: 利用者名 -> assumes header name is "利用者名"
        // AB列: 利用料項目名 -> assumes header name is "利用料項目名"
        // AD列: 数量 -> assumes header name is "数量"
        // We need to ensure these headers exist.

        // Debug first row to check headers if needed
        const firstRow = records[0]
        if (!('利用者名' in firstRow) || !('利用料項目名' in firstRow) || !('数量' in firstRow)) {
            // Fallback: try column index if headers are variable? 
            // But 'columns: true' relies on header row. 
            // If headers are missing, we might need to parse without columns: true and use indices.
            // Given the unpredictable nature, let's assume standard headers or check if keys exist.
            // If headers are different, we might fail. 
            // Let's assume the user provided headers in image are correct.
            console.error("Missing expected headers", Object.keys(firstRow))
            return { success: false, error: 'CSV format invalid: Missing 利用者名, 利用料項目名, or 数量' }
        }

        const supabase = await createClient()

        // Prepare data for insertion
        const importsToInsert = records.map((row: any) => {
            const quantity = parseInt(row['数量'] || '0', 10)
            const amount = parseInt(row['金額'] || '0', 10) // Optional, using 0 if not present

            // Mapping Logic (Filtering relevant items)
            // We only care about: 朝食, 昼食, 夕食, 日中活動, 夜勤加配
            // But we store everything or filter? 
            // The requirement says "CSVの項目名と...紐付けて集計".
            // It's safer to store cleaned item name.

            return {
                facility_id: facilityId,
                target_month: dateStr,
                resident_name: row['利用者名'],
                item_name: row['利用料項目名'],
                quantity: isNaN(quantity) ? 0 : quantity,
                amount: isNaN(amount) ? 0 : amount
            }
        }).filter((item: any) => item.resident_name && item.item_name)

        if (importsToInsert.length === 0) {
            return { success: false, error: 'No valid data extracted' }
        }

        // Wash-Replace Strategy
        // 1. Delete existing for this month/facility
        const { error: deleteError } = await supabase
            .from('external_billing_imports')
            .delete()
            .match({ facility_id: facilityId, target_month: dateStr })

        if (deleteError) {
            console.error('Delete error', deleteError)
            throw new Error('Failed to clear old data')
        }

        // 2. Insert new
        const { error: insertError } = await supabase
            .from('external_billing_imports')
            .insert(importsToInsert)

        if (insertError) {
            console.error('Insert error', insertError)
            throw new Error('Failed to insert new data')
        }

        return { success: true, count: importsToInsert.length }

    } catch (e: any) {
        console.error('CSV Import Error', e)
        return { success: false, error: e.message }
    }
}
