import { createClient } from '@/lib/supabase/server'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { StaffImportDialog } from './staff-import-dialog'
import { StaffFormDialog } from './staff-form-dialog'
import { InviteDialog } from './invite-dialog'
import { InviteLinkButton } from './invite-link-button'
import { StaffActions } from './staff-actions'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import { getCurrentStaff } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { StaffWithRelations } from '@/types'

export default async function StaffsPage() {
    const staff = await getCurrentStaff()
    if (!staff) redirect('/login')

    const isHQ = staff.role === 'admin'
    const isManager = staff.role === 'manager'

    // General Staff cannot access this page
    if (!isHQ && !isManager) {
        return <div className="p-8 text-red-500">このページにアクセスする権限がありません。</div>
    }

    const supabase = await createClient()

    // Fetch Staffs with Facility and Qualification names
    // RLS will apply, but let's filter explicitly for clarity/performance logic if needed.
    // Admin sees filtered by their org_id typically implicitly via RLS.

    // Note: 'qualifications' here refers to the TABLE relation, not the old text column.
    // Supabase TS types might need 'qualifications!left(name)' or similar hint if using joining.
    // Assuming simple left join works.
    let query = supabase
        .from('staffs')
        .select(`
            *,
            facilities ( name ),
            qualifications ( name )
        `)
        .order('created_at', { ascending: false })

    if (!isHQ) {
        // Manager sees only own facility (redundant if RLS works, but safe)
        if (staff.facility_id) {
            query = query.eq('facility_id', staff.facility_id)
        }
    } else {
        // Admin: Show all in Org (RLS handles this)
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
        <div className="space-y-6 pt-6 pb-20 px-6 max-w-[100vw] overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-4 gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        👥 職員マスタ
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {staffs?.length || 0}名の職員が登録されています
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Only Admin allows import presumably, or managers? User said Staff Master is for Admin usually. 
                        Let's allow it for whoever sees this page, but action checks permissions. 
                        Actually only Admin should see Import maybe? 
                        The import action checks for 'admin'. So let's hide button if not admin.
                    */}
                    {isHQ && <StaffImportDialog />}
                    <InviteDialog />
                    <StaffFormDialog currentStaff={staff} />
                </div>
            </div>

            <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="whitespace-nowrap">
                        <TableHeader className="bg-[#Fdfbf9]">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="min-w-[150px] font-bold text-gray-700 h-12">氏名</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">施設</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">システム権限</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">ステータス</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">職種</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">資格</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">入社日</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">退社日</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">登録日</TableHead>
                                <TableHead className="font-bold text-gray-700 h-12">アカウント</TableHead>
                                <TableHead className="text-right sticky right-0 bg-[#Fdfbf9] shadow-sm font-bold text-gray-700 h-12">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffs?.map((s: any) => (
                                <TableRow key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="font-medium sticky left-0 bg-white z-10 text-gray-800 h-14">{s.name}</TableCell>
                                    <TableCell>
                                        {!s.facility_id ? (
                                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">本社</Badge>
                                        ) : (
                                            (s as StaffWithRelations).facilities?.name || '-'
                                        )}
                                    </TableCell>
                                    <TableCell>{getRoleLabel(s.role)}</TableCell>
                                    <TableCell>{getStatusLabel(s.status)}</TableCell>
                                    <TableCell>
                                        {s.job_types?.map((job: string) => (
                                            <Badge key={job} variant="outline" className="mr-1">{job}</Badge>
                                        ))}
                                    </TableCell>
                                    <TableCell className="h-14">
                                        <div className="flex flex-col gap-1 items-start">
                                            {s.qualifications ? (
                                                <span className="font-medium">{(s as StaffWithRelations).qualifications?.name}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                            {s.qualifications_text && (
                                                <span className="text-[10px] text-gray-500">({s.qualifications_text})</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 h-14">{s.join_date || '-'}</TableCell>
                                    <TableCell className="text-gray-600 h-14">{s.leave_date || '-'}</TableCell>
                                    <TableCell className="text-gray-600 h-14">
                                        {new Date(s.created_at).toLocaleDateString('ja-JP')}
                                    </TableCell>
                                    <TableCell className="h-14">
                                        {s.auth_user_id ? (
                                            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 border-green-200">
                                                <CheckCircle className="h-3 w-3" />
                                                登録済み
                                            </Badge>
                                        ) : s.invite_token ? (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-orange-700 border-orange-200 bg-orange-50">
                                                    招待済み
                                                </Badge>
                                                <InviteLinkButton
                                                    staffId={s.id}
                                                    staffName={s.name}
                                                />
                                            </div>
                                        ) : (
                                            <InviteLinkButton
                                                staffId={s.id}
                                                staffName={s.name}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right sticky right-0 bg-white z-10 shadow-sm h-14">
                                        <StaffActions staff={s} currentStaff={staff} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {staffs?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">
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
