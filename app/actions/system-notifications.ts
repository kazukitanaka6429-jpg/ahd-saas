'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'

export type SystemNotification = {
    id: string
    facility_id: string | null
    user_id: string | null
    title: string
    content: string | null
    type: 'info' | 'warning' | 'urgent'
    created_at: string
    is_read: boolean
}

export async function getMyNotifications() {
    try {
        await protect()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return []

        // Get current staff to check facility_id
        const staff = await getCurrentStaff()
        const facilityId = staff?.facility_id

        // Fetch notifications
        // Logic:
        // 1. Where facility_id is NULL (Global) OR facility_id matches user's facility
        // 2. OR user_id matches user's ID
        let query = supabase
            .from('notifications')
            .select(`
                *,
                notification_reads (
                    id
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50)

        // RLS should handle the filtering automatically based on the policy we created:
        // "Users can view facility notifications" -> (facility_id matches) OR (user_id matches) OR (global)
        // So we just select *

        const { data, error } = await query

        if (error) {
            logger.error('Error fetching system notifications:', error)
            return []
        }

        // Map read status
        // Since we join notification_reads with user_id=auth.uid() implicitly via RLS?
        // Wait, RLS on notification_reads is "Users can view THEIR OWN".
        // So simply joining 'notification_reads' will return the record IF it exists for this user.
        // We need to explicitly filter the join if we want to be sure, duplicate read check etc.
        // But `notification_reads` table has unique(notification_id, user_id).

        // Supabase join syntax `notification_reads!inner` or left join?
        // By default it's left join.
        // We need to make sure we join ON the user_id.
        // Since we can't easily filter the JOIN condition in basic Supabase syntax without foreign key mapping specifics or using raw SQL,
        // we rely on RLS of `notification_reads` to only show MY read records.

        const notifications: SystemNotification[] = (data || []).map((n: any) => ({
            id: n.id,
            facility_id: n.facility_id,
            user_id: n.user_id,
            title: n.title,
            content: n.content,
            type: n.type,
            created_at: n.created_at,
            is_read: n.notification_reads && n.notification_reads.length > 0
        }))

        return notifications

    } catch (e) {
        logger.error('Unexpected error in getMyNotifications', e)
        return []
    }
}

export async function markAsRead(notificationId: string) {
    try {
        await protect()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        const { error } = await supabase
            .from('notification_reads')
            .insert({
                notification_id: notificationId,
                user_id: user.id
            })
            // Ignore unique violation (already read)
            .select()
        // In pure PG we would do ON CONFLICT DO NOTHING.
        // Supabase/PostgREST `upsert` or simple custom RPC?
        // Actually standard insert will fail if exists. We can use upsert or ignore error.

        if (error) {
            // PostgreSQL unique violation code 23505
            if (error.code === '23505') {
                return { success: true } // Already read
            }
            logger.error('Error marking notification as read:', error)
            return { error: 'Failed to mark as read' }
        }

        revalidatePath('/')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in markAsRead', e)
        return { error: 'Unexpected error' }
    }
}

// Admin Helper to create notification (Useful for testing)
export async function createSystemNotification(
    title: string,
    content: string,
    type: 'info' | 'warning' | 'urgent' = 'info',
    targetFacilityId?: string | null, // null for global
    targetUserId?: string | null
) {
    try {
        await protect()
        const supabase = await createClient()

        const { error } = await supabase
            .from('notifications')
            .insert({
                title,
                content,
                type,
                facility_id: targetFacilityId,
                user_id: targetUserId
            })

        if (error) {
            logger.error('Create Notification Error:', error)
            return { error: error.message }
        }

        return { success: true }
    } catch (e) {
        return { error: 'Unexpected error' }
    }
}

// Notify all organization admins
export async function notifyOrganizationAdmins(
    organizationId: string,
    title: string,
    content: string,
    type: 'info' | 'warning' | 'urgent' = 'info',
    excludeUserId?: string | null
) {
    try {
        await protect()
        const supabase = await createClient()

        // 1. Find all admin users in the organization
        const { data: adminStaffs, error: staffError } = await supabase
            .from('staffs')
            .select('auth_user_id')
            .eq('organization_id', organizationId)
            .eq('role', 'admin')

        if (staffError || !adminStaffs) {
            logger.error('Error fetching admin staffs:', staffError)
            return { error: 'Failed to fetch admins' }
        }

        // 2. Filter out excluded user (e.g. the sender)
        const targetUserIds = adminStaffs
            .map(s => s.auth_user_id)
            .filter(uid => uid && uid !== excludeUserId)

        if (targetUserIds.length === 0) return { success: true }

        // 3. Insert notifications
        const notifications = targetUserIds.map(uid => ({
            title,
            content,
            type,
            user_id: uid,
            facility_id: null // Global notification for that user
        }))

        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications)

        if (insertError) {
            logger.error('Error sending admin notifications:', insertError)
            return { error: insertError.message }
        }

        return { success: true }
    } catch (e) {
        logger.error('notifyOrganizationAdmins error:', e)
        return { error: 'Unexpected error' }
    }
}
