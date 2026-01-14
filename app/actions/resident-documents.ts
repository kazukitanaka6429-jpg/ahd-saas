'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'
import { DOCUMENT_TYPE_LABELS, DocumentAlert, AlertLevel } from '@/lib/document-types'

interface DocumentHistoryInput {
    id?: string
    residentId: string
    documentType: string
    validFrom?: string | null
    validTo?: string | null
    isRenewalCompleted?: boolean
    notes?: string | null
}

/**
 * Upsert document history record
 */
export async function upsertDocumentHistory(data: DocumentHistoryInput) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }
        if (!staff.organization_id) return { error: '組織IDが取得できませんでした' }

        const supabase = await createClient()

        const upsertData = {
            id: data.id || undefined,
            organization_id: staff.organization_id,
            resident_id: data.residentId,
            document_type: data.documentType,
            valid_from: data.validFrom || null,
            valid_to: data.validTo || null,
            is_renewal_completed: data.isRenewalCompleted ?? false,
            notes: data.notes || null
        }

        const { error } = await supabase
            .from('resident_document_history')
            .upsert(upsertData, { onConflict: 'id' })

        if (error) {
            logger.error('upsertDocumentHistory failed', error)
            return { error: translateError(error.message) }
        }

        revalidatePath('/residents')
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in upsertDocumentHistory', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * Get document history for a specific resident
 */
export async function getDocumentHistory(residentId: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です', data: [] }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from('resident_document_history')
            .select('*')
            .eq('resident_id', residentId)
            .order('document_type')
            .order('valid_to', { ascending: false, nullsFirst: false })

        if (error) {
            logger.error('getDocumentHistory failed', error)
            return { error: translateError(error.message), data: [] }
        }

        return { data: data || [] }
    } catch (e) {
        logger.error('Unexpected error in getDocumentHistory', e)
        return { error: '予期せぬエラーが発生しました', data: [] }
    }
}

/**
 * Get document alerts for dashboard
 * Returns documents expiring within 90 days or already expired
 */
export async function getDocumentAlerts(): Promise<{ data: DocumentAlert[], error?: string }> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です', data: [] }

        // Only admins can see the full alerts list
        if (staff.role !== 'admin') {
            return { data: [] }
        }

        const supabase = await createClient()

        // Calculate date thresholds
        const today = new Date()
        const threeMonthsLater = new Date(today)
        threeMonthsLater.setDate(today.getDate() + 90)

        const { data, error } = await supabase
            .from('resident_document_history')
            .select(`
                id,
                resident_id,
                document_type,
                valid_to,
                is_renewal_completed,
                residents (
                    name,
                    facilities (
                        name
                    )
                )
            `)
            .eq('is_renewal_completed', false)
            .not('valid_to', 'is', null)
            .lte('valid_to', threeMonthsLater.toISOString().split('T')[0])
            .order('valid_to', { ascending: true })

        if (error) {
            logger.error('getDocumentAlerts failed', error)
            return { error: translateError(error.message), data: [] }
        }

        // Transform data and calculate alert levels
        const alerts: DocumentAlert[] = (data || []).map((doc: any) => {
            const validTo = new Date(doc.valid_to)
            const timeDiff = validTo.getTime() - today.getTime()
            const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

            let alertLevel: AlertLevel
            let message: string

            if (daysUntilExpiry <= 30) {
                alertLevel = 'critical'
                message = '至急更新手続きをお願いします。月遅れの可能性あり'
            } else if (daysUntilExpiry <= 60) {
                alertLevel = 'warning'
                message = '更新手続きをお願いします。'
            } else {
                alertLevel = 'info'
                message = '更新手続きの準備をお願いします。案内が届いている場合は手続きを。'
            }

            return {
                id: doc.id,
                residentId: doc.resident_id,
                residentName: doc.residents?.name || '不明',
                facilityName: doc.residents?.facilities?.name || '不明',
                documentType: doc.document_type,
                documentTypeLabel: DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type,
                validTo: doc.valid_to,
                daysUntilExpiry,
                alertLevel,
                message,
                isRenewalCompleted: doc.is_renewal_completed
            }
        })

        return { data: alerts }
    } catch (e) {
        logger.error('Unexpected error in getDocumentAlerts', e)
        return { error: '予期せぬエラーが発生しました', data: [] }
    }
}

/**
 * Mark a document as renewed (completed)
 */
export async function markAsRenewed(id: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('resident_document_history')
            .update({ is_renewal_completed: true })
            .eq('id', id)

        if (error) {
            logger.error('markAsRenewed failed', error)
            return { error: translateError(error.message) }
        }

        logger.warn('Document marked as renewed', { staffId: staff.id, documentId: id })

        revalidatePath('/')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in markAsRenewed', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * Delete a document history record
 */
export async function deleteDocumentHistory(id: string) {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { error: '認証が必要です' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('resident_document_history')
            .delete()
            .eq('id', id)

        if (error) {
            logger.error('deleteDocumentHistory failed', error)
            return { error: translateError(error.message) }
        }

        logger.warn('Document history deleted', { staffId: staff.id, documentId: id })

        revalidatePath('/residents')
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in deleteDocumentHistory', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

/**
 * Get alert levels for all residents (for residents list display)
 * Returns a map of residentId -> highest alert level
 */
export async function getResidentAlertLevels(): Promise<{ data: Record<string, AlertLevel> }> {
    try {
        await protect()

        const staff = await getCurrentStaff()
        if (!staff) return { data: {} }

        const supabase = await createClient()

        const today = new Date()
        const threeMonthsLater = new Date(today)
        threeMonthsLater.setDate(today.getDate() + 90)

        const { data, error } = await supabase
            .from('resident_document_history')
            .select('resident_id, valid_to')
            .eq('is_renewal_completed', false)
            .not('valid_to', 'is', null)
            .lte('valid_to', threeMonthsLater.toISOString().split('T')[0])

        if (error) {
            logger.error('getResidentAlertLevels failed', error)
            return { data: {} }
        }

        // Calculate highest alert level per resident
        const alertMap: Record<string, AlertLevel> = {}
        const levelPriority: Record<AlertLevel, number> = { critical: 3, warning: 2, info: 1 }

        for (const doc of data || []) {
            const validTo = new Date(doc.valid_to)
            const daysUntilExpiry = Math.ceil((validTo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            let level: AlertLevel
            if (daysUntilExpiry <= 30) {
                level = 'critical'
            } else if (daysUntilExpiry <= 60) {
                level = 'warning'
            } else {
                level = 'info'
            }

            const currentLevel = alertMap[doc.resident_id]
            if (!currentLevel || levelPriority[level] > levelPriority[currentLevel]) {
                alertMap[doc.resident_id] = level
            }
        }

        return { data: alertMap }
    } catch (e) {
        logger.error('Unexpected error in getResidentAlertLevels', e)
        return { data: {} }
    }
}
