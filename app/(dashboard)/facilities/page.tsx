import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { FacilityFormDialog } from './facility-form-dialog'
import { Facility } from '@/types'
import { FacilityActions } from './facility-actions'
import { getCurrentStaff } from '@/app/actions/auth'
import { getFacilities } from '@/app/actions/facility'
import { redirect } from 'next/navigation'

export default async function FacilitiesPage() {
    const staff = await getCurrentStaff()
    if (!staff || staff.role !== 'admin') {
        // Admin only page
        redirect('/')
    }

    const { data: facilities, error } = await getFacilities()

    if (error) {
        return <div className="p-8 text-red-500">エラーが発生しました: {error}</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">施設管理</h2>
                    <p className="text-muted-foreground">
                        システムに登録されている施設の一覧です。
                    </p>
                </div>
                <FacilityFormDialog />
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>施設名</TableHead>
                            <TableHead>施設コード</TableHead>
                            <TableHead>事業所番号</TableHead>
                            <TableHead>登録日</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {facilities?.map((facility: Facility) => (
                            <TableRow key={facility.id}>
                                <TableCell className="font-medium">{facility.name}</TableCell>
                                <TableCell>{facility.code}</TableCell>
                                <TableCell>{facility.provider_number || '-'}</TableCell>
                                <TableCell>
                                    {new Date(facility.created_at).toLocaleDateString('ja-JP')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <FacilityActions facility={facility} />
                                </TableCell>
                            </TableRow>
                        ))}
                        {facilities?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    データがありません。
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
