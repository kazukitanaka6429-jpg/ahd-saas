import { Suspense } from 'react'
import { OperationLogsClient } from './client'
import { getOperationLogs, getStaffsForFilter } from '@/app/actions/admin/get-operation-logs'

export const dynamic = 'force-dynamic'

export default async function AnalysisPage() {
    // Initial data fetch
    const [logsResult, staffs] = await Promise.all([
        getOperationLogs({ limit: 50, offset: 0 }),
        getStaffsForFilter()
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">ログ分析</h1>
                <p className="mt-1 text-sm text-gray-500">
                    システム操作ログを確認できます
                </p>
            </div>

            <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
                <OperationLogsClient
                    initialLogs={logsResult.logs}
                    initialTotal={logsResult.total}
                    staffs={staffs}
                />
            </Suspense>
        </div>
    )
}
