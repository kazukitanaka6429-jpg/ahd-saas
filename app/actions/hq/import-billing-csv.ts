'use server'

import { createClient } from '@/lib/supabase/server'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'
import { protect, requireRole } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { z } from 'zod'

const BillingCsvRowSchema = z.object({
    '利用者名': z.string().min(1, { message: '利用者名は必須です' }),
    '利用料項目名': z.string().min(1, { message: '利用料項目名は必須です' }),
    '数量': z.coerce.number({ invalid_type_error: '数量は数値である必要があります' }).int().nonnegative().optional().default(0),
    '金額': z.coerce.number().optional().default(0)
}).strip() // Remove extra columns

export async function importBillingCsv(formData: FormData) {
    try {
        await requireRole(['admin']) // HQ/Admin only

        const file = formData.get('file') as File
        const facilityId = formData.get('facilityId') as string
        const dateStr = formData.get('date') as string // YYYY-MM-DD (typically first of month)

        if (!file || !facilityId || !dateStr) {
            return { success: false, error: 'Missing required fields' }
        }


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

        // Validate using Zod
        // We validate individual rows to report specific errors if needed, 
        // or validate all at once. For bulk import, safeParse on array is good.
        // But to give friendly error line number, map parse might be better.

        const validRows: z.infer<typeof BillingCsvRowSchema>[] = []
        const errors: string[] = []

        records.forEach((row: unknown, index: number) => {
            const result = BillingCsvRowSchema.safeParse(row)
            if (result.success) {
                // Filter logic: Check if name and item exist (Validation covered it basically, but we need both)
                // Schema requires name and item min(1).
                validRows.push(result.data)
            } else {
                const errorMsg = result.error.errors.map(e => e.message).join(', ')
                errors.push(`Row ${index + 1}: ${errorMsg}`)
            }
        })

        if (errors.length > 0) {
            // If strictly ensuring integrity, fail on any error?
            // Or log warning? "3 integrity risks" -> Strict is better.
            logger.warn('CSV Validation Errors', errors)
            return { success: false, error: `CSV形式エラー(${errors.length}件): ${errors[0]} ...` }
        }

        if (validRows.length === 0) {
            return { success: false, error: '有効なデータがありません' }
        }

        const supabase = await createClient()

        // Prepare data for insertion (Typos fixed, types safe)
        const importsToInsert = validRows.map(row => {
            return {
                facility_id: facilityId,
                target_month: dateStr,
                resident_name: row['利用者名'],
                item_name: row['利用料項目名'],
                quantity: row['数量'],
                amount: row['金額']
            }
        })

        // Wash-Replace Strategy
        // 1. Delete existing for this month/facility
        const { error: deleteError } = await supabase
            .from('external_billing_imports')
            .delete()
            .match({ facility_id: facilityId, target_month: dateStr })

        if (deleteError) {
            logger.error('Delete error', deleteError)
            return { success: false, error: 'Failed to clear old data' }
        }

        // 2. Insert new
        const { error: insertError } = await supabase
            .from('external_billing_imports')
            .insert(importsToInsert)

        if (insertError) {
            logger.error('Insert error', insertError)
            return { success: false, error: 'Failed to insert new data' }
        }

        return { success: true, count: importsToInsert.length }

    } catch (e: any) {
        logger.error('CSV Import Error', e)
        return { success: false, error: e.message }
    }
}
