'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SimpleStaff } from "@/app/actions/staffs"
import { useEffect, useState } from "react"

export type FilterValues = {
    year: string
    month: string
    created_by: string
    resolved_by: string
}

type DashboardFilterProps = {
    onFilterChange: (filters: FilterValues) => void
    staffList: SimpleStaff[]
    showResolvedBy?: boolean
    defaultFilters?: Partial<FilterValues>
}

export function DashboardFilter({ onFilterChange, staffList, showResolvedBy = true, defaultFilters }: DashboardFilterProps) {
    const currentYear = new Date().getFullYear().toString()
    const currentMonth = (new Date().getMonth() + 1).toString()

    const [filters, setFilters] = useState<FilterValues>({
        year: defaultFilters?.year || '',
        month: defaultFilters?.month || '',
        created_by: defaultFilters?.created_by || 'all',
        resolved_by: defaultFilters?.resolved_by || 'all'
    })

    const handleChange = (key: keyof FilterValues, value: string) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())
    const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString())

    return (
        <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-2 rounded-md border border-dashed mb-4">
            <span className="text-xs font-bold text-gray-500 mr-1">絞り込み:</span>

            {/* Year */}
            <Select value={filters.year} onValueChange={(v) => handleChange('year', v)}>
                <SelectTrigger className="w-[80px] h-8 text-xs bg-white">
                    <SelectValue placeholder="年" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {years.map(y => <SelectItem key={y} value={y}>{y}年</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Month */}
            <Select value={filters.month} onValueChange={(v) => handleChange('month', v)}>
                <SelectTrigger className="w-[60px] h-8 text-xs bg-white">
                    <SelectValue placeholder="月" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {months.map(m => <SelectItem key={m} value={m}>{m}月</SelectItem>)}
                </SelectContent>
            </Select>

            <div className="h-4 w-px bg-gray-300 mx-1" />

            {/* Created By */}
            <Select value={filters.created_by} onValueChange={(v) => handleChange('created_by', v)}>
                <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
                    <SelectValue placeholder="作成者" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">作成者: 全て</SelectItem>
                    {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Resolved By - Optional */}
            {showResolvedBy && (
                <Select value={filters.resolved_by} onValueChange={(v) => handleChange('resolved_by', v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
                        <SelectValue placeholder="確認者" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">確認者: 全て</SelectItem>
                        {staffList.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {(filters.year !== '' || filters.month !== '' || filters.created_by !== 'all' || (showResolvedBy && filters.resolved_by !== 'all')) && (
                <button
                    onClick={() => {
                        const cleared = { year: '', month: '', created_by: 'all', resolved_by: 'all' }
                        setFilters(cleared)
                        onFilterChange(cleared)
                    }}
                    className="text-xs text-red-500 hover:text-red-700 ml-auto px-2"
                >
                    クリア
                </button>
            )}
        </div>
    )
}
