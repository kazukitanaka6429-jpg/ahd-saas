import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'LOGOUT'
export type TargetResource =
    | 'daily_record'
    | 'medical_iv_record'
    | 'medical_v_record'
    | 'medical_iv_bulk'
    | 'medical_v_bulk'
    | 'resident'
    | 'staff'
    | 'facility'
    | 'short_stay'

interface LogOperationParams {
    organizationId: string
    actorId: string
    targetResource: TargetResource
    actionType: ActionType
    targetId?: string
    details?: Record<string, any>
    /** 変更前の値（UPDATE/DELETEの場合に使用） */
    before?: Record<string, any>
    /** 変更後の値（CREATE/UPDATEの場合に使用） */
    after?: Record<string, any>
}

/**
 * Logs an operation to the audit trail (operation_logs).
 * Executes asynchronously and captures any errors internally to prevent blocking the main flow.
 * 
 * @example
 * // 更新操作のログ
 * logOperation({
 *   organizationId: org.id,
 *   actorId: staff.id,
 *   targetResource: 'daily_record',
 *   actionType: 'UPDATE',
 *   targetId: record.id,
 *   details: { date: '2026-01-22', residentName: '山田花子' },
 *   before: { breakfast: '全量' },
 *   after: { breakfast: '半量' }
 * })
 */
export async function logOperation(params: LogOperationParams) {
    // Fire-and-forget wrapper
    (async () => {
        try {
            const supabase = await createClient()

            // Try to get IP address
            const headersList = await headers()
            const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null

            // Merge before/after into details
            const enhancedDetails = {
                ...params.details,
                ...(params.before && { before: params.before }),
                ...(params.after && { after: params.after })
            }

            const { error } = await supabase.from('operation_logs').insert({
                organization_id: params.organizationId,
                actor_id: params.actorId,
                target_resource: params.targetResource,
                action_type: params.actionType,
                target_id: params.targetId,
                details: enhancedDetails,
                ip_address: ip
            })

            if (error) {
                logger.error('Failed to insert audit log', { error, params })
            }
        } catch (e) {
            logger.error('Unexpected error in logOperation', e)
        }
    })()
}

