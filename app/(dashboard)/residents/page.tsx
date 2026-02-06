import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ResidentImportDialog } from './resident-import-dialog'
import { ResidentFormDialog } from './resident-form-dialog'
import { ResidentActions } from './resident-actions'
import { Resident } from '@/types'
import { Badge } from '@/components/ui/badge'
import { getCurrentStaff } from '@/app/actions/auth'
import { getResidents } from '@/app/actions/resident'
import { getResidentAlertLevels } from '@/app/actions/resident-documents'
import { redirect } from 'next/navigation'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

import { ResidentFacilityFilter } from './resident-facility-filter'
import { createClient } from '@/lib/supabase/server'
import { AlertLevel } from '@/lib/document-types'

export default async function ResidentsPage({ searchParams }: { searchParams: Promise<{ facility_id?: string }> }) {
    const staff = await getCurrentStaff()
    if (!staff) redirect('/login')

    const params = await searchParams
    const facilityIdOverride = params.facility_id === 'all' ? undefined : params.facility_id

    // Fetch facilities for Admin filter
    let facilities: any[] = []
    if (staff.role === 'admin') {
        const supabase = await createClient()
        const { data } = await supabase.from('facilities').select('*').order('name')
        if (data) facilities = data
    }

    // Fetch residents and alert levels in parallel
    const [residentsResult, alertsResult] = await Promise.all([
        getResidents(facilityIdOverride),
        getResidentAlertLevels()
    ])

    const residents = residentsResult.data
    const error = residentsResult.error
    const alertLevels = alertsResult.data

    if (error) {
        return <div className="p-8 text-red-500">エラーが発生しました: {error}</div>
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_facility': return <Badge variant="default" className="bg-green-600">入所中</Badge>
            case 'hospitalized': return <Badge variant="secondary">入院中</Badge>
            case 'home_stay': return <Badge variant="outline">外泊中</Badge>
            case 'left': return <Badge variant="destructive">退去</Badge>
            default: return status
        }
    }

    const getFlagLabel = (val: boolean) => val ? <span className="text-green-600">あり</span> : <span className="text-gray-300">-</span>

    const getAlertIcon = (level: AlertLevel | undefined) => {
        if (!level) return null
        switch (level) {
            case 'critical':
                return (
                    <span className="inline-flex items-center ml-1" title="書類の期限が切れているか、30日以内です">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </span>
                )
            case 'warning':
                return (
                    <span className="inline-flex items-center ml-1" title="書類の期限まで60日以内です">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </span>
                )
            case 'info':
                return (
                    <span className="inline-flex items-center ml-1" title="書類の期限まで90日以内です">
                        <Info className="h-4 w-4 text-blue-500" />
                    </span>
                )
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">利用者マスタ</h2>
                    <p className="text-muted-foreground">
                        施設を利用する利用者の登録・編集を行います。
                    </p>
                </div>
                {/* Only Admin/Manager can add residents usually */}
                <div className="flex items-center gap-4">
                    {staff.role === 'admin' && (
                        <ResidentFacilityFilter facilities={facilities} />
                    )}
                    {(staff.role === 'admin' || staff.role === 'manager') && (
                        <>
                            {/* Import is Admin only generally, but let's allow Manager too if they have CSV */}
                            <ResidentImportDialog />
                            <ResidentFormDialog currentStaff={staff} />
                        </>
                    )}
                </div>
            </div>

            <div className="rounded-md border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="whitespace-nowrap">
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="min-w-[80px] font-bold text-gray-700">ID</TableHead>
                                <TableHead className="min-w-[150px] font-bold text-gray-700">氏名</TableHead>
                                <TableHead>状況</TableHead>
                                <TableHead>介護度/区分</TableHead>
                                <TableHead>入居日</TableHead>
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
                            {residents?.map((resident: Resident) => (
                                <TableRow key={resident.id}>
                                    <TableCell className="font-medium sticky left-0 bg-white z-10">{resident.display_id || '-'}</TableCell>
                                    <TableCell className="font-medium bg-white z-10">
                                        <span className="inline-flex items-center">
                                            {resident.name}
                                            {getAlertIcon(alertLevels[resident.id])}
                                        </span>
                                    </TableCell>

                                    <TableCell>{getStatusLabel(resident.status)}</TableCell>
                                    <TableCell>{resident.care_level || '-'}</TableCell>
                                    <TableCell>{resident.start_date}</TableCell>
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
                                        {(staff.role === 'admin' || staff.role === 'manager') && (
                                            <ResidentActions resident={resident} currentStaff={staff} />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {residents?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={15} className="h-24 text-center">
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
