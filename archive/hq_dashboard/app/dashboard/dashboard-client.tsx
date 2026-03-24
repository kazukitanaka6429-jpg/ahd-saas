'use client'

import { DashboardResult } from '@/app/actions/hq/dashboard'
import { FacilityStatusCard } from '@/components/hq/dashboard/facility-status-card'
import { AlertList } from '@/components/hq/dashboard/alert-list'
import { KpiBenchmarkChart } from '@/components/hq/dashboard/kpi-benchmark-chart'
import { CsvExportButton } from '@/components/hq/dashboard/csv-export-button'
import { useState } from 'react'

interface DashboardClientProps {
    initialData: DashboardResult
}

export function DashboardClient({ initialData }: DashboardClientProps) {
    const { kpis, yearMonth } = initialData

    // Sort logic for cards: Problematic ones first
    const sortedKpis = [...kpis].sort((a, b) => {
        // Red > Yellow > Green
        const scoreA = (a.hasComplianceBreach ? 1000 : 0) + (a.missedAddonRate * 10) + a.vacancyRate
        const scoreB = (b.hasComplianceBreach ? 1000 : 0) + (b.missedAddonRate * 10) + b.vacancyRate
        return scoreB - scoreA
    })

    return (
        <div className="space-y-6 container mx-auto p-6 max-w-7xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        HQ Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {yearMonth} 運営状況サマリー ({kpis.length}施設)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton yearMonth={yearMonth} />
                    {/* Month Picker could go here */}
                </div>
            </div>

            {/* 1. Alerts Section */}
            <AlertList kpis={kpis} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2. Benchmark Chart (Takes up 2 cols on large) */}
                <div className="lg:col-span-2">
                    <KpiBenchmarkChart data={kpis} />
                </div>

                {/* 3. Summary Stats or Mini Widget (Takes up 1 col) */}
                <div className="space-y-4">
                    {/* Summary Card Logic */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">全社平均: 加算未取得率</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {Math.round(kpis.reduce((acc, k) => acc + k.missedAddonRate, 0) / (kpis.length || 1))}%
                        </div>
                        <p className="text-xs text-red-500 mt-1">※売上機会損失の可能性</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">総残業時間 (全施設)</h3>
                        <div className="text-2xl font-bold text-gray-900">
                            {kpis.reduce((acc, k) => acc + k.totalOvertimeHours, 0)}h
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Facility Grid */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-800">施設別状況一覧</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedKpis.map(kpi => (
                        <FacilityStatusCard
                            key={kpi.facilityId}
                            data={kpi}
                            onClick={() => {
                                // Navigate to facility dashboard? or Drill down?
                                // For now just log or do nothing.
                                console.log("Clicked facility", kpi.facilityName)
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
