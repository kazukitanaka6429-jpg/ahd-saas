'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { getResourceLabel, getActionLabel } from '@/lib/operation-log-labels'

export interface OperationLog {
    id: string
    organization_id: string
    actor_id: string
    actor_name?: string
    target_resource: string
    target_id?: string
    action_type: string
    details: Record<string, any>
    ip_address?: string
    created_at: string
}

export interface GetOperationLogsParams {
    startDate?: string
    endDate?: string
    actorId?: string
    targetResource?: string
    actionType?: string
    limit?: number
    offset?: number
}

export interface GetOperationLogsResult {
    logs: OperationLog[]
    total: number
    error?: string
}

export async function getOperationLogs(params: GetOperationLogsParams = {}): Promise<GetOperationLogsResult> {
    try {
        const staff = await getCurrentStaff()
        if (!staff) {
            return { logs: [], total: 0, error: '認証が必要です' }
        }

        // Check if user is admin (HQ only)
        if (staff.role !== 'admin') {
            return { logs: [], total: 0, error: 'ログは本社のみ閲覧可能です' }
        }

        const supabase = await createClient()
        const { limit = 50, offset = 0 } = params

        // Build query - simplified without JOIN
        let query = supabase
            .from('operation_logs')
            .select('*', { count: 'exact' })
            .eq('organization_id', staff.organization_id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        // Apply filters
        if (params.startDate) {
            query = query.gte('created_at', `${params.startDate}T00:00:00`)
        }
        if (params.endDate) {
            query = query.lte('created_at', `${params.endDate}T23:59:59`)
        }
        if (params.actorId) {
            query = query.eq('actor_id', params.actorId)
        }
        if (params.targetResource) {
            query = query.eq('target_resource', params.targetResource)
        }
        if (params.actionType) {
            query = query.eq('action_type', params.actionType)
        }

        const { data, count, error } = await query

        if (error) {
            console.error('Failed to fetch operation logs:', error)
            return { logs: [], total: 0, error: 'ログの取得に失敗しました' }
        }

        // Get unique actor_ids to fetch staff names
        const actorIds = [...new Set((data || []).map((log: any) => log.actor_id).filter(Boolean))]
        let staffMap: Record<string, string> = {}

        if (actorIds.length > 0) {
            const { data: staffsData } = await supabase
                .from('staffs')
                .select('id, name')
                .in('id', actorIds)

            staffMap = Object.fromEntries(
                (staffsData || []).map(s => [s.id, s.name || '不明'])
            )
        }

        // Transform data
        const logs: OperationLog[] = (data || []).map((log: any) => ({
            id: log.id,
            organization_id: log.organization_id,
            actor_id: log.actor_id,
            actor_name: staffMap[log.actor_id] || '不明',
            target_resource: log.target_resource,
            target_id: log.target_id,
            action_type: log.action_type,
            details: log.details || {},
            ip_address: log.ip_address,
            created_at: log.created_at
        }))

        return { logs, total: count || 0 }
    } catch (error) {
        console.error('Unexpected error in getOperationLogs:', error)
        return { logs: [], total: 0, error: '予期せぬエラーが発生しました' }
    }
}

export async function getStaffsForFilter(): Promise<{ id: string; name: string }[]> {
    try {
        const staff = await getCurrentStaff()
        if (!staff) return []

        const supabase = await createClient()
        const { data } = await supabase
            .from('staffs')
            .select('id, name')
            .eq('organization_id', staff.organization_id)
            .order('name')

        return (data || []).map(s => ({ id: s.id, name: s.name }))
    } catch {
        return []
    }
}

export async function exportLogsToCSV(params: GetOperationLogsParams): Promise<string> {
    const { logs } = await getOperationLogs({ ...params, limit: 10000, offset: 0 })

    const headers = ['日時', '操作者', '操作種別', '対象', '詳細', 'IPアドレス']
    const rows = logs.map(log => [
        new Date(log.created_at).toLocaleString('ja-JP'),
        log.actor_name || '',
        getActionLabel(log.action_type),
        getResourceLabel(log.target_resource),
        JSON.stringify(log.details),
        log.ip_address || ''
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csvContent
}
