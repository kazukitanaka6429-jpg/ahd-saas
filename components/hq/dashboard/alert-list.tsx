'use client'

import { FacilityKPI } from '@/lib/analytics/kpi_calculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, FileWarning } from 'lucide-react'

interface AlertListProps {
    kpis: FacilityKPI[]
}

export function AlertList({ kpis }: AlertListProps) {
    // Filter for alerts
    const complianceBreaches = kpis.filter(k => k.hasComplianceBreach)
    const highOvertime = kpis.filter(k => k.totalOvertimeHours > 45)

    if (complianceBreaches.length === 0 && highOvertime.length === 0) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 flex items-center gap-2 text-green-700">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium">現在、対応が必要な重大なアラートはありません。</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-red-100 bg-red-50/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                    <AlertCircle className="w-5 h-5" />
                    要対応アラート ({complianceBreaches.length + highOvertime.length}件)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {complianceBreaches.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1">
                            <FileWarning className="w-4 h-4" />
                            加算要件未達・コンプライアンスリスク
                        </h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1 ml-1">
                            {complianceBreaches.map(k => (
                                <li key={k.facilityId}>
                                    <span className="font-bold">{k.facilityName}</span>:
                                    加算要件を満たしていない日が {k.missedAddonDays}日 あります（未取得率 {k.missedAddonRate}%）
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {highOvertime.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-orange-800 mb-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            36協定超過リスク (残業 &gt; 45h)
                        </h4>
                        <ul className="list-disc list-inside text-sm text-orange-700 space-y-1 ml-1">
                            {highOvertime.map(k => (
                                <li key={k.facilityId}>
                                    <span className="font-bold">{k.facilityName}</span>:
                                    月間残業 {k.totalOvertimeHours}時間
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
