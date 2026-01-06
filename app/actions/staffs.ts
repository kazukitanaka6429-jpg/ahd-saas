'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'

export type SimpleStaff = {
    id: string
    name: string
    facility_id: string
    role: string
}

export async function getStaffListForFilter() {
    const staff = await getCurrentStaff()
    if (!staff) return []

    const supabase = await createClient()
    let query = supabase
        .from('staffs')
        .select('id, name, facility_id, role')
        .order('name')

    // If not HQ, only show staff from same facility
    if (staff.role !== 'admin') {
        query = query.eq('facility_id', staff.facility_id)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching staff list:', error)
        return []
    }

    return data as SimpleStaff[]
}
