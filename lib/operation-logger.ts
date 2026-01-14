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

interface LogOperationParams {
    organizationId: string
    actorId: string
    targetResource: TargetResource
    actionType: ActionType
    targetId?: string
    details?: Record<string, any>
}

/**
 * Logs an operation to the audit trail (operation_logs).
 * Executes asynchronously and captures any errors internally to prevent blocking the main flow.
 */
export async function logOperation(params: LogOperationParams) {
    // Fire-and-forget wrapper
    (async () => {
        try {
            const supabase = await createClient()

            // Try to get IP address
            const headersList = await headers()
            const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null

            const { error } = await supabase.from('operation_logs').insert({
                organization_id: params.organizationId,
                actor_id: params.actorId,
                target_resource: params.targetResource,
                action_type: params.actionType,
                target_id: params.targetId,
                details: params.details,
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
