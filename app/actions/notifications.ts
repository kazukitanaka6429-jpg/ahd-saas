'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentStaff } from '@/lib/auth-helpers'

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

export type GroupedNotifications = {
    [facilityName: string]: FacilityNotification[]
}

export async function createNotification(formData: FormData) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Get current staff (considering multi-tenancy)
    const staff = await getCurrentStaff()

    if (!staff || !staff.facility_id) {
        return { error: 'Facility not found for user' }
    }

    const content = formData.get('content') as string
    const priority = formData.get('priority') as Priority || 'normal'

    if (!content) {
        return { error: 'Content is required' }
    }

    const { error } = await supabase
        .from('facility_notifications') // Correct table name
        .insert({
            facility_id: staff.facility_id,
            created_by: staff.id,
            content,
            priority,
            status: 'open'
        })

    if (error) {
        console.error('Error creating notification:', error)
        return { error: `Failed to create notification: ${error.message} (${error.code})` }
    }

    revalidatePath('/')
    return { success: true }
}

export async function getUnresolvedNotifications() {
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
        console.error('Error fetching notifications:', error)
        return []
    }

    return data as unknown as (FacilityNotification & { created_staff?: { name: string } | null })[]
}

export async function resolveNotification(id: string) {
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
        console.error('Error resolving notification:', error)
        return { error: 'Failed to resolve notification' }
    }

    revalidatePath('/')
    return { success: true }
}

export async function getFacilityNotifications() {
    const supabase = await createClient()

    // Get current staff (considering multi-tenancy)
    const staff = await getCurrentStaff()

    if (!staff || !staff.facility_id) {
        return []
    }

    const { data, error } = await supabase
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
        .limit(20)

    if (error) {
        console.error('Error fetching facility notifications:', error)
        return []
    }

    return data as unknown as (FacilityNotification & { resolved_staff?: { name: string } | null, created_staff?: { name: string } | null })[]
}

// HQ: Get resolved notifications history
export async function getResolvedNotifications() {
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
      ),
      resolved_staff:resolved_by (
        name
      )
    `)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(50) // Limit to recent 50 for performance

    if (error) {
        console.error('Error fetching resolved notifications:', error)
        return []
    }

    return data as unknown as (FacilityNotification & { created_staff?: { name: string } | null, resolved_staff?: { name: string } | null })[]
}
