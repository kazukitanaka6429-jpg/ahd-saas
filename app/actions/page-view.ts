'use server'

import { createClient } from '@/lib/supabase/server'
import { logOperation } from '@/lib/operation-logger'
import { logger } from '@/lib/logger'

/**
 * Records a page view event for audit purposes.
 * Called from the client-side layout or page components.
 * Fire-and-forget: errors are logged but never block the UI.
 */
export async function recordPageView(pathname: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: staff } = await supabase
            .from('staffs')
            .select('id, organization_id')
            .eq('auth_user_id', user.id)
            .limit(1)
            .single()

        if (staff) {
            logOperation({
                organizationId: staff.organization_id,
                actorId: staff.id,
                targetResource: 'page_view',
                actionType: 'READ',
                details: { pathname }
            })
        }
    } catch (e) {
        logger.error('Failed to record page view', e)
    }
}
