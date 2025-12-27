'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { FindingComment } from '@/types'

export async function getFindingComments(
    recordId: string,
    jsonPath: string,
    recordType: 'daily' | 'medical' = 'daily'
) {
    const supabase = await createClient()
    let query = supabase
        .from('finding_comments')
        .select('*, content:comment')
        .eq('json_path', jsonPath)
        .order('created_at', { ascending: true })

    if (recordType === 'daily') {
        query = query.eq('daily_record_id', recordId)
    } else {
        query = query.eq('medical_record_id', recordId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching findings:', error)
        return []
    }
    return data as FindingComment[]
}

export async function addFindingComment(
    recordId: string,
    jsonPath: string,
    content: string,
    recordType: 'daily' | 'medical' = 'daily'
) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')

    const supabase = await createClient()

    const payload: any = {
        json_path: jsonPath,
        comment: content,
        author_name: staff.name,
        is_resolved: false
    }

    if (recordType === 'daily') {
        payload.daily_record_id = recordId
    } else {
        payload.medical_record_id = recordId
    }

    const { error } = await supabase
        .from('finding_comments')
        .insert(payload)

    if (error) {
        console.error('Error adding finding:', error)
        return { error: error.message }
    }
    revalidatePath('/daily-reports')
    revalidatePath('/medical-cooperation')
    return { success: true }
}

export async function toggleFindingResolved(commentId: string, currentStatus: boolean) {
    const staff = await getCurrentStaff()
    if (!staff) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase
        .from('finding_comments')
        .update({ is_resolved: !currentStatus })
        .eq('id', commentId)

    if (error) {
        console.error('Error toggling finding:', error)
        return { error: error.message }
    }
    revalidatePath('/daily-reports')
    return { success: true }
}

// Function to fetch all findings for a date (to show indicators on grid)
export async function getFindingsCountByRecord(
    date: string,
    recordType: 'daily' | 'medical' = 'daily'
) {
    const staff = await getCurrentStaff()
    if (!staff) return {}

    const supabase = await createClient()

    let tableName = 'daily_records'
    if (recordType === 'medical') {
        tableName = 'medical_cooperation_records'
    }

    // Step 1: Get record IDs for that date
    const { data: records } = await supabase
        .from(tableName)
        .select('id')
        .eq('facility_id', staff.facility_id)
        .eq('date', date)

    if (!records || records.length === 0) return {}

    const ids = records.map((r: any) => r.id)

    // Step 2: Get findings
    let query = supabase
        .from('finding_comments')
        .select('daily_record_id, medical_record_id, json_path, is_resolved')

    if (recordType === 'daily') {
        query = query.in('daily_record_id', ids)
    } else {
        query = query.in('medical_record_id', ids)
    }

    const { data: findings } = await query

    if (!findings) return {}

    // Aggregate
    const indicators: Record<string, string[]> = {}

    findings.forEach(f => {
        if (!f.is_resolved) {
            // Determine relevant ID based on type
            const recordId = recordType === 'daily' ? f.daily_record_id : f.medical_record_id

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
}
// Fetch findings for a date range (e.g. for Monthly Medical Grid)
export async function getFindingsCountByRange(
    startDate: string,
    endDate: string,
    recordType: 'daily' | 'medical' = 'daily'
) {
    const staff = await getCurrentStaff()
    if (!staff) return {}

    const supabase = await createClient()

    let tableName = 'daily_records'
    if (recordType === 'medical') {
        tableName = 'medical_cooperation_records'
    }

    // Step 1: Get record IDs for the range
    const { data: records } = await supabase
        .from(tableName)
        .select('id')
        .eq('facility_id', staff.facility_id)
        .gte('date', startDate)
        .lte('date', endDate)

    if (!records || records.length === 0) return {}

    const ids = records.map((r: any) => r.id)

    // Step 2: Get findings
    // Chunking might be needed if IDs are too many (e.g. 30 days x 50 residents = 1500 records).
    // Supabase 'in' filter limit is usually high enough, but good to be safe.
    // For now assuming < 65535 parameters logic of Postgres applies, 1500 is fine.

    let query = supabase
        .from('finding_comments')
        .select('daily_record_id, medical_record_id, json_path, is_resolved')

    if (recordType === 'daily') {
        query = query.in('daily_record_id', ids)
    } else {
        query = query.in('medical_record_id', ids)
    }

    const { data: findings } = await query

    if (!findings) return {}

    // Aggregate
    const indicators: Record<string, string[]> = {}

    findings.forEach(f => {
        if (!f.is_resolved) {
            const recordId = recordType === 'daily' ? f.daily_record_id : f.medical_record_id
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
}
