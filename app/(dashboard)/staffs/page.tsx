import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { CreateStaffDialog } from './create-dialog'
import { InviteDialog } from './invite-dialog'
import { StaffActions } from './staff-actions'
import { Staff } from '@/types'
import { Badge } from '@/components/ui/badge'

import { requireAuth, isHQ, canAccessMaster } from '@/lib/auth-helpers'

export default async function StaffsPage() {
    const staff = await requireAuth()
    if (!staff) return <div className="p-8">職員アカウントが見つかりません。</div>

    // General Staff cannot access this page
    if (!canAccessMaster(staff.role)) {
        return <div className="p-8 text-red-500">このページにアクセスする権限がありません。</div>
    }

    const facilityId = staff.facility_id
    const isSuperAdmin = isHQ(staff.role)

    const supabase = await createClient()
    let query = supabase
        .from('staffs')
        .select('*, facilities(name)')
        .order('created_at', { ascending: false })

    if (!isSuperAdmin) {
        query = query.eq('facility_id', facilityId)
    }

    const { data: staffs, error } = await query

    if (error) {
        return <div className="p-8 text-red-500">エラーが発生しました: {error.message}</div>
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return <Badge variant="destructive">システム管理者</Badge>
            case 'manager': return <Badge variant="default">管理者</Badge>
            default: return <Badge variant="secondary">一般職員</Badge>
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return <span className="text-green-600 text-sm">● 在籍</span>
            case 'retired': return <span className="text-gray-400 text-sm">● 退職</span>
            default: return status
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">職員管理</h2>
                    <p className="text-muted-foreground">
                        {staffs?.length || 0}名の職員が登録されています
                    </p>
                </div>
                <div className="flex gap-2">
                    <InviteDialog />
                    <CreateStaffDialog />
                </div>
            </div>

            <div className="rounded-md border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="whitespace-nowrap">
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="min-w-[150px]">氏名</TableHead>
                                <TableHead>施設</TableHead>
                                <TableHead>システム権限</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>職種</TableHead>
                                <TableHead>資格</TableHead>
                                <TableHead>入社日</TableHead>
                                <TableHead>退社日</TableHead>
                                <TableHead>登録日</TableHead>
                                <TableHead className="text-right sticky right-0 bg-white shadow-sm">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffs?.map((staff: any) => (
                                <TableRow key={staff.id}>
                                    <TableCell className="font-medium sticky left-0 bg-white z-10">{staff.name}</TableCell>
                                    <TableCell>{staff.facilities?.name || '-'}</TableCell>
                                    <TableCell>{getRoleLabel(staff.role)}</TableCell>
                                    <TableCell>{getStatusLabel(staff.status)}</TableCell>
                                    <TableCell>
                                        {staff.job_types?.map((job: string) => (
                                            <Badge key={job} variant="outline" className="mr-1">{job}</Badge>
                                        ))}
                                    </TableCell>
                                    <TableCell>{staff.qualifications || '-'}</TableCell>
                                    <TableCell>{staff.join_date || '-'}</TableCell>
                                    <TableCell>{staff.leave_date || '-'}</TableCell>
                                    <TableCell>
                                        {new Date(staff.created_at).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                    <TableCell className="text-right sticky right-0 bg-white z-10 shadow-sm">
                                        <StaffActions id={staff.id} name={staff.name} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {staffs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        データがありません。
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
