'use client'

import { FacilityKPI } from '@/lib/analytics/kpi_calculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Search, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FacilityStatusCardProps {
    data: FacilityKPI
    onClick?: () => void
}

export function FacilityStatusCard({ data, onClick }: FacilityStatusCardProps) {
    // Determine Status Color
    // Red: Compliance Breach or Vacancy > 10%
    // Yellow: High Overtime or Vacancy > 0%
    // Green: All Good

    let status: 'green' | 'yellow' | 'red' = 'green'
    if (data.hasComplianceBreach || data.vacancyRate > 10 || data.missedAddonRate > 5) {
        status = 'red'
    } else if (data.totalOvertimeHours > 40 || data.vacancyRate > 0 || data.missedAddonRate > 0) {
        status = 'yellow'
    }

    return (
        <Card
            className={cn(
                "cursor-pointer hover:shadow-md transition-all border-l-4",
                status === 'red' ? "border-l-red-500" :
                    status === 'yellow' ? "border-l-yellow-400" : "border-l-green-500"
            )}
            onClick={onClick}
        >
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold">{data.facilityName}</CardTitle>
                    {status === 'red' && <AlertCircle className="text-red-500 w-5 h-5" />}
                    {status === 'yellow' && <AlertTriangle className="text-yellow-500 w-5 h-5" />}
                    {status === 'green' && <CheckCircle className="text-green-500 w-5 h-5" />}
                </div>
                <div className="text-sm text-gray-500">
                    定員: {data.capacity}名 / 現員: {data.residentCount}名
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">充足率</span>
                        <span className={cn(
                            "font-bold",
                            data.placementFulfillmentRate < 90 ? "text-red-600" : "text-gray-900"
                        )}>
                            {data.placementFulfillmentRate}%
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">欠員率</span>
                        <span className={cn(
                            "font-bold",
                            data.vacancyRate > 0 ? "text-red-600" : "text-gray-900"
                        )}>
                            {data.vacancyRate}%
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">加算未取得</span>
                        <span className={cn(
                            "font-bold",
                            data.missedAddonRate > 0 ? "text-red-600" : "text-gray-900"
                        )}>
                            {data.missedAddonRate}%
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-xs">残業(月)</span>
                        <span className={cn(
                            "font-bold",
                            data.totalOvertimeHours > 45 ? "text-red-600" : "text-gray-900"
                        )}>
                            {data.totalOvertimeHours}h
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
