import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { CreateResidentDialog } from './create-dialog'
import { ResidentActions } from './resident-actions'
import { Resident } from '@/types'
import { Badge } from '@/components/ui/badge'

import { requireAuth, isHQ, canAccessMaster } from '@/lib/auth-helpers'

export default async function ResidentsPage() {
    const staff = await requireAuth()
    if (!staff) return <div className="p-8">職員アカウントが見つかりません。</div>

    if (!canAccessMaster(staff.role)) {
        return <div className="p-8 text-red-500">このページにアクセスする権限がありません。</div>
    }

    const facilityId = staff.facility_id
    const isSuperAdmin = isHQ(staff.role)

    const supabase = await createClient()
    let query = supabase
        .from('residents')
        .select('*, facilities(name)')
        .order('created_at', { ascending: false })

    // HQ sees ALL, others see specific facility
    if (!isSuperAdmin) {
        query = query.eq('facility_id', facilityId)
    }

    const { data: residents, error } = await query

    if (error) {
        return <div className="p-8 text-red-500">エラーが発生しました: {error.message}</div>
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_facility': return <Badge variant="default" className="bg-green-600">入所中</Badge>
            case 'hospitalized': return <Badge variant="secondary">入院中</Badge>
            case 'home_stay': return <Badge variant="outline">外泊中</Badge>
            default: return status
        }
    }

    const getFlagLabel = (val: boolean) => val ? <span className="text-green-600">あり</span> : <span className="text-gray-300">-</span>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">利用者管理</h2>
                    <p className="text-muted-foreground">
                        施設を利用する利用者の登録・編集を行います。
                    </p>
                </div>
                <CreateResidentDialog />
            </div>

            <div className="rounded-md border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="whitespace-nowrap">
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="min-w-[150px]">氏名</TableHead>
                                <TableHead>施設</TableHead>
                                <TableHead>介護度</TableHead>
                                <TableHead>状況</TableHead>
                                <TableHead>区分</TableHead>
                                <TableHead>開始日</TableHead>
                                <TableHead>口振開始</TableHead>
                                <TableHead>主保険</TableHead>
                                <TableHead>限度額</TableHead>
                                <TableHead>公費1</TableHead>
                                <TableHead>公費2</TableHead>
                                <TableHead className="text-center">別7</TableHead>
                                <TableHead className="text-center">別8</TableHead>
                                <TableHead className="text-center">呼吸器</TableHead>
                                <TableHead className="text-center">重度</TableHead>
                                <TableHead className="text-center">喀痰</TableHead>
                                <TableHead className="text-right sticky right-0 bg-white shadow-sm">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {residents?.map((resident: any) => (
                                <TableRow key={resident.id}>
                                    <TableCell className="font-medium sticky left-0 bg-white z-10">{resident.name}</TableCell>
                                    <TableCell>{resident.facilities?.name || '-'}</TableCell>
                                    <TableCell>{resident.care_level || '-'}</TableCell>
                                    <TableCell>{getStatusLabel(resident.status)}</TableCell>
                                    <TableCell>{resident.classification || '-'}</TableCell>
                                    <TableCell>{resident.start_date}</TableCell>
                                    <TableCell>{resident.direct_debit_start_date || '-'}</TableCell>
                                    <TableCell>{resident.primary_insurance || '-'}</TableCell>
                                    <TableCell>{resident.limit_application_class || '-'}</TableCell>
                                    <TableCell>{resident.public_expense_1 || '-'}</TableCell>
                                    <TableCell>{resident.public_expense_2 || '-'}</TableCell>
                                    <TableCell className="text-center">{getFlagLabel(resident.table_7)}</TableCell>
                                    <TableCell className="text-center">{getFlagLabel(resident.table_8)}</TableCell>
                                    <TableCell className="text-center">{getFlagLabel(resident.ventilator)}</TableCell>
                                    <TableCell className="text-center">{getFlagLabel(resident.severe_disability_addition)}</TableCell>
                                    <TableCell className="text-center">{getFlagLabel(resident.sputum_suction)}</TableCell>
                                    <TableCell className="text-right sticky right-0 bg-white z-10 shadow-sm">
                                        <ResidentActions id={resident.id} name={resident.name} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {residents?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={17} className="h-24 text-center">
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
