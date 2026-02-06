'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

export type Priority = 'high' | 'normal' | 'low'

export type FacilityNotification = {
    id: string
    facility_id: string
    created_by: string
    content: string
    priority: Priority
    status: 'open' | 'resolved'
    created_at: string
    resolved_at: string | null
    resolved_by: string | null
    facilities: {
        name: string
    } | null
}

// Extended types for joined queries
export type NotificationWithCreatedStaff = FacilityNotification & {
    created_staff?: { name: string } | null
}

export type NotificationWithStaff = FacilityNotification & {
    created_staff?: { name: string } | null
    resolved_staff?: { name: string } | null
}

export type GroupedNotifications = {
    [facilityName: string]: FacilityNotification[]
}

export async function createNotification(formData: FormData) {
    try {
        await protect()

        const supabase = await createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: '認証が必要です' }
        }

        // Get current staff (considering multi-tenancy)
        const staff = await getCurrentStaff()



        if (!staff || !staff.facility_id) {

            return { error: '施設情報が見つかりません' }
        }

        const content = formData.get('content') as string
        const priority = formData.get('priority') as Priority || 'normal'

        if (!content) {
            return { error: '内容を入力してください' }
        }

        const insertPayload = {
            facility_id: staff.facility_id,
            created_by: staff.id,
            content,
            priority,
            status: 'open'
        }


        const { error } = await supabase
            .from('facility_notifications') // Correct table name
            .insert(insertPayload)

        if (error) {

            logger.error('Error creating notification:', error)
            return { error: `通知の作成に失敗しました: ${translateError(error.message)}` }
        }


        revalidatePath('/')
        return { success: true }
    } catch (e) {

        logger.error('Unexpected error in createNotification', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function getUnresolvedNotifications() {
    try {
        await protect()

        const supabase = await createClient()

        const { data, error } = await supabase
            .from('facility_notifications')
            .select(`
          *,
          facilities (
            name
          ),
          created_staff:created_by (
            name
          )
        `)
            .eq('status', 'open')
            .order('created_at', { ascending: false })

        if (error) {
            logger.error('Error fetching notifications:', error)
            return []
        }

        // Supabase returns typed data based on select query
        return (data ?? []) as NotificationWithCreatedStaff[]
    } catch (e) {
        logger.error('Unexpected error in getUnresolvedNotifications', e)
        return []
    }
}

export async function resolveNotification(id: string) {
    try {
        await protect()

        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: 'Unauthorized' }
        }

        // Get current staff (considering multi-tenancy)
        const staff = await getCurrentStaff()

        if (!staff || !staff.facility_id) {
            return { error: 'Facility not found for user' }
        }

        const { error } = await supabase
            .from('facility_notifications')
            .update({
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: staff.id
            })
            .eq('id', id)

        if (error) {
            logger.error('Error resolving notification:', error)
            return { error: '通知の解決に失敗しました' }
        }

        revalidatePath('/')
        return { success: true }
    } catch (e) {
        logger.error('Unexpected error in resolveNotification', e)
        return { error: '予期せぬエラーが発生しました' }
    }
}

export async function getFacilityNotifications(filters?: NotificationFilters) {
    try {
        await protect()

        const supabase = await createClient()

        // Get current staff (considering multi-tenancy)
        const staff = await getCurrentStaff()

        if (!staff || !staff.facility_id) {
            return []
        }

        let query = supabase
            .from('facility_notifications')
            .select(`
          *,
          resolved_staff:resolved_by (
            name
          ),
          created_staff:created_by (
            name
          )
        `)
            .eq('facility_id', staff.facility_id)
            .order('created_at', { ascending: false })

        if (filters) {
            if (filters.year && filters.month) {
                const startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`
                const nextMonth = filters.month === '12' ? '01' : String(Number(filters.month) + 1).padStart(2, '0')
                const nextYear = filters.month === '12' ? String(Number(filters.year) + 1) : filters.year
                const endDate = `${nextYear}-${nextMonth}-01`

                // For facility view, filtering by created_at makes more sense? Or resolved_at?
                // Usually facility cares about when they SENT it.
                query = query.gte('created_at', startDate).lt('created_at', endDate)
            }
            if (filters.created_by && filters.created_by !== 'all') {
                query = query.eq('created_by', filters.created_by)
            }
            if (filters.resolved_by && filters.resolved_by !== 'all') {
                query = query.eq('resolved_by', filters.resolved_by)
            }
        }

        query = query.limit(50)

        const { data, error } = await query

        if (error) {
            logger.error('Error fetching facility notifications:', error)
            return []
        }

        return (data ?? []) as NotificationWithStaff[]
    } catch (e) {
        logger.error('Unexpected error in getFacilityNotifications', e)
        return []
    }
}

// HQ: Get resolved notifications history
export type NotificationFilters = {
    year?: string
    month?: string
    created_by?: string
    resolved_by?: string
}

// HQ: Get resolved notifications history
export async function getResolvedNotifications(filters?: NotificationFilters) {
    try {
        await protect()

        const supabase = await createClient()

        let query = supabase
            .from('facility_notifications')
            .select(`
          *,
          facilities (
            name
          ),
          created_staff:created_by (
            name
          ),
          resolved_staff:resolved_by (
            name
          )
        `)
            .eq('status', 'resolved')
            .order('resolved_at', { ascending: false })

        if (filters) {
            if (filters.year && filters.month) {
                const startDate = `${filters.year}-${filters.month.padStart(2, '0')}-01`
                // Calculate end date (start of next month)
                const nextMonth = filters.month === '12' ? '01' : String(Number(filters.month) + 1).padStart(2, '0')
                const nextYear = filters.month === '12' ? String(Number(filters.year) + 1) : filters.year
                const endDate = `${nextYear}-${nextMonth}-01`

                query = query.gte('resolved_at', startDate).lt('resolved_at', endDate)
            }
            if (filters.created_by && filters.created_by !== 'all') {
                query = query.eq('created_by', filters.created_by)
            }
            if (filters.resolved_by && filters.resolved_by !== 'all') {
                query = query.eq('resolved_by', filters.resolved_by)
            }
        }

        query = query.limit(50) // Limit to recent 50 for performance

        const { data, error } = await query

        if (error) {
            logger.error('Error fetching resolved notifications:', error)
            return []
        }

        return (data ?? []) as NotificationWithStaff[]
    } catch (e) {
        logger.error('Unexpected error in getResolvedNotifications', e)
        return []
    }
}
