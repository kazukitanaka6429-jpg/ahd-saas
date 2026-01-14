'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { FindingComment } from '@/types'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export async function getFindingComments(
    recordId: string,
    jsonPath: string,
    recordType: 'daily' | 'medical' | 'short_stay' | 'medical_v_daily' | 'medical_v_record' | 'resident' = 'daily'
) {
    try {
        await protect()

        const supabase = await createClient()
        let query = supabase
            .from('finding_comments')
            .select('*, content:comment')
            .eq('json_path', jsonPath)
            .order('created_at', { ascending: true })

        if (recordType === 'daily') {
            query = query.eq('daily_record_id', recordId)
        } else if (recordType === 'medical') {
            query = query.eq('medical_record_id', recordId)
        } else if (recordType === 'short_stay') {
            query = query.eq('short_stay_record_id', recordId)
        } else if (recordType === 'medical_v_daily') {
            query = query.eq('medical_v_daily_id', recordId)
        } else if (recordType === 'medical_v_record') {
            query = query.eq('medical_v_record_id', recordId)
        } else if (recordType === 'resident') {
            query = query.eq('resident_id', recordId)
        }

        const { data, error } = await query

        if (error) {
            logger.error('Error fetching comments:', error)
            return []
        }
        return data as FindingComment[]
    } catch (e) {
        logger.error('Unexpected error in getFindingComments', e)
        return []
    }
}

export async function addFindingComment(
    recordId: string,
    jsonPath: string,
    content: string,
    recordType: 'daily' | 'medical' | 'short_stay' | 'medical_v_daily' | 'medical_v_record' | 'resident' = 'daily'
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) throw new Error('Unauthorized')

        const supabase = await createClient()

        const payload: {
            json_path: string
            comment: string
            author_name: string
            is_resolved: boolean
            daily_record_id?: string
            medical_record_id?: string
            short_stay_record_id?: string
            medical_v_daily_id?: string
            medical_v_record_id?: string
            resident_id?: string
        } = {
            json_path: jsonPath,
            comment: content,
            author_name: staff.name,
            is_resolved: false
        }

        if (recordType === 'daily') {
            payload.daily_record_id = recordId
        } else if (recordType === 'medical') {
            payload.medical_record_id = recordId
        } else if (recordType === 'short_stay') {
            payload.short_stay_record_id = recordId
        } else if (recordType === 'medical_v_daily') {
            payload.medical_v_daily_id = recordId
        } else if (recordType === 'medical_v_record') {
            payload.medical_v_record_id = recordId
        } else if (recordType === 'resident') {
            payload.resident_id = recordId
        }

        const { error } = await supabase
            .from('finding_comments')
            .insert(payload)

        if (error) {
            logger.error('Error adding finding:', error)
            return { error: translateError(error.message) }
        }
        revalidatePath('/daily-reports')
        revalidatePath('/medical-cooperation')
        revalidatePath('/medical-v')
        revalidatePath('/hq/daily')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in addFindingComment', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function toggleFindingResolved(commentId: string, currentStatus: boolean) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) throw new Error('Unauthorized')

        const supabase = await createClient()
        const { error } = await supabase
            .from('finding_comments')
            .update({ is_resolved: !currentStatus })
            .eq('id', commentId)

        if (error) {
            logger.error('Error toggling finding:', error)
            return { error: translateError(error.message) }
        }
        revalidatePath('/daily-reports')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in toggleFindingResolved', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

// Function to fetch all findings for a date (to show indicators on grid)
export async function getFindingsCountByRecord(
    date: string,
    recordType: 'daily' | 'medical' | 'short_stay' = 'daily'
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return {}

        const supabase = await createClient()

        let tableName = 'daily_records'
        if (recordType === 'medical') {
            tableName = 'medical_cooperation_records'
        } else if (recordType === 'short_stay') {
            tableName = 'short_stay_records'
        }

        // Step 1: Get record IDs for that date
        const { data: records } = await supabase
            .from(tableName)
            .select('id')
            .eq('facility_id', staff.facility_id)
            .eq('date', date)

        if (!records || records.length === 0) return {}

        const ids = records.map((r) => r.id)

        // Step 2: Get findings
        let query = supabase
            .from('finding_comments')
            .select('daily_record_id, medical_record_id, short_stay_record_id, json_path, is_resolved')

        if (recordType === 'daily') {
            query = query.in('daily_record_id', ids)
        } else if (recordType === 'medical') {
            query = query.in('medical_record_id', ids)
        } else if (recordType === 'short_stay') {
            query = query.in('short_stay_record_id', ids)
        }

        const { data: findings } = await query

        if (!findings) return {}

        // Aggregate
        const indicators: Record<string, string[]> = {}

        findings.forEach(f => {
            if (!f.is_resolved) {
                // Determine relevant ID based on type
                let recordId: string | undefined | null
                if (recordType === 'daily') recordId = f.daily_record_id
                else if (recordType === 'medical') recordId = f.medical_record_id
                else if (recordType === 'short_stay') recordId = f.short_stay_record_id

                if (recordId) {
                    if (!indicators[recordId]) {
                        indicators[recordId] = []
                    }
                    if (!indicators[recordId].includes(f.json_path!)) {
                        indicators[recordId].push(f.json_path!)
                    }
                }
            }
        })

        return indicators
    } catch (e) {
        logger.error('Unexpected error in getFindingsCountByRecord', e)
        return {}
    }
}
// Fetch findings for a date range (e.g. for Monthly Medical Grid)
export async function getFindingsCountByRange(
    startDate: string,
    endDate: string,
    recordType: 'daily' | 'medical' | 'short_stay' = 'daily'
) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return {}

        const supabase = await createClient()

        let tableName = 'daily_records'
        if (recordType === 'medical') {
            tableName = 'medical_cooperation_records'
        } else if (recordType === 'short_stay') {
            tableName = 'short_stay_records'
        }

        // Step 1: Get record IDs for the range
        const { data: records } = await supabase
            .from(tableName)
            .select('id')
            .eq('facility_id', staff.facility_id)
            .gte('date', startDate)
            .lte('date', endDate)

        if (!records || records.length === 0) return {}

        const ids = records.map((r) => r.id)

        // Step 2: Get findings
        let query = supabase
            .from('finding_comments')
            .select('daily_record_id, medical_record_id, short_stay_record_id, json_path, is_resolved')

        if (recordType === 'daily') {
            query = query.in('daily_record_id', ids)
        } else if (recordType === 'medical') {
            query = query.in('medical_record_id', ids)
        } else if (recordType === 'short_stay') {
            query = query.in('short_stay_record_id', ids)
        }

        const { data: findings } = await query

        if (!findings) return {}

        // Aggregate
        const indicators: Record<string, string[]> = {}

        findings.forEach(f => {
            if (!f.is_resolved) {
                let recordId: string | undefined | null
                if (recordType === 'daily') recordId = f.daily_record_id
                else if (recordType === 'medical') recordId = f.medical_record_id
                else if (recordType === 'short_stay') recordId = f.short_stay_record_id

                if (recordId) {
                    if (!indicators[recordId]) {
                        indicators[recordId] = []
                    }
                    if (!indicators[recordId].includes(f.json_path!)) {
                        indicators[recordId].push(f.json_path!)
                    }
                }
            }
        })

        return indicators
    } catch (e) {
        logger.error('Unexpected error in getFindingsCountByRange', e)
        return {}
    }
}

// Get findings paths for a single record ID (for Short Stay which passes recordId directly)
export async function getFindingsPathsByRecordId(
    recordId: string,
    recordType: 'daily' | 'medical' | 'short_stay' | 'medical_v_daily' | 'medical_v_record' = 'daily'
): Promise<Record<string, string[]>> {
    try {
        await protect()

        const supabase = await createClient()

        // Fetch findings for this specific record
        let query = supabase
            .from('finding_comments')
            .select('json_path, is_resolved')

        if (recordType === 'daily') {
            query = query.eq('daily_record_id', recordId)
        } else if (recordType === 'medical') {
            query = query.eq('medical_record_id', recordId)
        } else if (recordType === 'short_stay') {
            query = query.eq('short_stay_record_id', recordId)
        } else if (recordType === 'medical_v_daily') {
            query = query.eq('medical_v_daily_id', recordId)
        } else if (recordType === 'medical_v_record') {
            query = query.eq('medical_v_record_id', recordId)
        }

        const { data: findings, error } = await query

        if (error) {
            logger.error('getFindingsPathsByRecordId error:', error)
            return {}
        }

        if (!findings || findings.length === 0) return {}

        // Aggregate paths (only unresolved)
        const paths: string[] = []
        findings.forEach(f => {
            if (!f.is_resolved && f.json_path && !paths.includes(f.json_path)) {
                paths.push(f.json_path)
            }
        })

        return { [recordId]: paths }
    } catch (e) {
        logger.error('Unexpected error in getFindingsPathsByRecordId', e)
        return {}
    }
}
