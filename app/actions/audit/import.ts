'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { parseAttendanceCsv, parseSpotJobCsv, parseNursingCsv } from '@/lib/audit/csv-parser'
import { parseNursingExcel } from '@/lib/audit/excel-parser'
import { revalidatePath } from 'next/cache'

import iconv from 'iconv-lite'

// Helper to handle encoding (Shift-JIS vs UTF-8)
async function decodeCsvFile(file: File, expectedKeywords: string[]): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Try UTF-8 first (standard)
    const utf8Content = iconv.decode(buffer, 'utf-8')
    if (expectedKeywords.some(k => utf8Content.includes(k))) {
        return utf8Content
    }

    // 2. Try Shift-JIS (Excel Japan default)
    const sjisContent = iconv.decode(buffer, 'Shift_JIS')
    if (expectedKeywords.some(k => sjisContent.includes(k))) {
        return sjisContent
    }

    // 3. Fallback to UTF-8 if neither matches strongly, or maybe it was UTF-8 but keywords missing
    return utf8Content
}

/**
 * Import Attendance CSV (Kintai)
 */
export async function importAttendance(formData: FormData) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff || !staff.facility_id) return { error: 'Unauthorized' }

        const file = formData.get('file') as File
        if (!file) return { error: 'File required' }

        const content = await decodeCsvFile(file, ['日付', 'date'])
        const records = parseAttendanceCsv(content, staff.facility_id)

        if (records.length === 0) return { error: 'No valid records found' }

        const supabase = await createClient()

        // Strategy: Upsert
        const { error } = await supabase
            .from('attendance_records')
            .upsert(records, {
                onConflict: 'facility_id, staff_name, work_date, start_time'
            })

        if (error) {
            logger.error('importAttendance failed', error)
            return { error: 'Import failed: ' + error.message }
        }

        revalidatePath('/audit/personnel')
        return { success: true, count: records.length }
    } catch (e: any) {
        logger.error('importAttendance internal error', e)
        return { error: e.message }
    }
}

/**
 * Import Spot Job CSV (Kaitekku)
 */
export async function importSpotJob(formData: FormData) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff || !staff.facility_id) return { error: 'Unauthorized' }

        const file = formData.get('file') as File
        if (!file) return { error: 'File required' }

        const content = await decodeCsvFile(file, ['応募', '案件', 'job'])
        const records = parseSpotJobCsv(content, staff.facility_id)

        if (records.length === 0) return { error: 'No valid records found' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('spot_job_records')
            .upsert(records, {
                onConflict: 'facility_id, job_apply_id'
            })

        if (error) {
            logger.error('importSpotJob failed', error)
            return { error: 'Import failed: ' + error.message }
        }

        revalidatePath('/audit/personnel')
        return { success: true, count: records.length }
    } catch (e: any) {
        logger.error('importSpotJob internal error', e)
        return { error: e.message }
    }
}

/**
 * Import Visiting Nursing Data (Excel/CSV)
 */
export async function importNursing(formData: FormData) {
    try {
        await protect()
        const staff = await getCurrentStaff()
        if (!staff || !staff.facility_id) return { error: 'Unauthorized' }

        const file = formData.get('file') as File
        if (!file) return { error: 'File required' }

        let records = []

        // Determine parser based on extension
        // Note: file.name is from client, trustworthy enough for parsing choice
        if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            const buffer = await file.arrayBuffer()
            records = parseNursingExcel(buffer, staff.facility_id)
        } else {
            // Fallback to CSV
            const content = await decodeCsvFile(file, ['訪問日', 'date'])
            records = parseNursingCsv(content, staff.facility_id)
        }

        if (records.length === 0) return { error: 'No valid records found' }

        const supabase = await createClient()

        // Strategy: Delete existing records for the months present
        const months = new Set(records.map(r => r.visit_date.substring(0, 7))) // YYYY-MM
        const monthList = Array.from(months)

        for (const month of monthList) {
            const startOfMonth = `${month}-01`
            const endOfMonth = `${month}-31`

            const { error: delError } = await supabase
                .from('visiting_nursing_records')
                .delete()
                .eq('facility_id', staff.facility_id)
                .gte('visit_date', startOfMonth)
                .lte('visit_date', endOfMonth)

            if (delError) throw delError
        }

        const { error } = await supabase
            .from('visiting_nursing_records')
            .insert(records)

        if (error) {
            logger.error('importNursing failed', error)
            return { error: 'Import failed: ' + error.message }
        }

        revalidatePath('/audit/personnel')
        return { success: true, count: records.length }
    } catch (e: any) {
        logger.error('importNursing internal error', e)
        return { error: e.message }
    }
}
