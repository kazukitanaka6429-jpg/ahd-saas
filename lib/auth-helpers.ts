import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Staff } from '@/types'

// Role definitions
export const ROLES = {
    HQ: 'admin',      // 本社: 全権限
    MANAGER: 'manager', // 管理者: 自施設全権限
    STAFF: 'staff'    // 一般: 自施設の一部権限（マスタ以外）
} as const

type Role = typeof ROLES[keyof typeof ROLES]

export async function getCurrentStaff() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Find staff record linked to this auth user
    const { data: staff } = await supabase
        .from('staffs')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

    if (!staff) {
        return null
    }

    return staff as Staff
}

export async function requireAuth() {
    const staff = await getCurrentStaff()
    if (!staff) {
        return null
    }
    return staff
}

// Helper to check permissions
export function canAccessMaster(role: string) {
    return role === ROLES.HQ || role === ROLES.MANAGER
}

export function isHQ(role: string) {
    return role === ROLES.HQ
}
