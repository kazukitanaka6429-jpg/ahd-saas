'use client'

import React, { useMemo, useState } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table'

import { Resident } from '@/types'
import { saveReportEntry } from '@/app/(dashboard)/daily-reports/actions'
import { toast } from 'sonner'

// We extend Resident type with report fields
type DailyReportRow = Resident & {
    // Report values
    meal_breakfast: boolean
    meal_lunch: boolean
    meal_dinner: boolean
    residents_activity_gh: boolean // Renamed to avoid confusion
    residents_activity_daytime: boolean
    residents_activity_other_service: string
    night_gh_stay: boolean
    night_emergency: boolean
    night_hospitalized: boolean
    night_stay_out: boolean
}

const columnHelper = createColumnHelper<DailyReportRow>()

export function DailyReportGrid({
    residents,
    date,
    title,
    className
}: {
    residents: Resident[],
    date: string,
    title?: string,
    className?: string
}) {
    const [data, setData] = useState(() => {
        return residents.map(resident => ({
            ...resident,
            // Default values - In real app these should come from DB
            meal_breakfast: false,
            meal_lunch: false,
            meal_dinner: false,
            residents_activity_gh: false,
            residents_activity_daytime: false,
            residents_activity_other_service: '',
            night_gh_stay: false,
            night_emergency: false,
            night_hospitalized: false,
            night_stay_out: false
        }))
    })

    // Handle cell updates
    const handleSave = async (residentId: string, key: string, value: string | boolean) => {
        // 1. Optimistic Update
        setData(prev => prev.map(row => {
            if (row.id === residentId) {
                return { ...row, [key]: value }
            }
            return row
        }))

        // 2. Server Action
        const valString = String(value)
        const result = await saveReportEntry(date, residentId, key, valString)

        if (result.error) {
            toast.error('保存に失敗しました')
            // Revert optimistic update if needed (omitted for simplicity)
        }
    }

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            header: 'ご利用者名',
            cell: info => <div className="font-medium px-2 py-1">{info.getValue()}</div>,
            size: 150,
        }),
        columnHelper.group({
            header: '食事',
            columns: [
                columnHelper.accessor('meal_breakfast', {
                    header: '朝食',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'meal_breakfast', checked)}
                        />
                    ),
                    size: 50,
                }),
                columnHelper.accessor('meal_lunch', {
                    header: '昼食',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'meal_lunch', checked)}
                        />
                    ),
                    size: 50,
                }),
                columnHelper.accessor('meal_dinner', {
                    header: '夕食',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'meal_dinner', checked)}
                        />
                    ),
                    size: 50,
                }),
            ]
        }),
        columnHelper.group({
            header: '日中の活動',
            columns: [
                columnHelper.accessor('residents_activity_gh', {
                    header: 'GH',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'residents_activity_gh', checked)}
                        />
                    ),
                    size: 50,
                }),
                columnHelper.accessor('residents_activity_daytime', {
                    header: '日中活動',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'residents_activity_daytime', checked)}
                        />
                    ),
                    size: 80,
                }),
                columnHelper.accessor('residents_activity_other_service', {
                    header: 'その他福祉サービス利用',
                    cell: info => (
                        <select
                            className="w-full h-full bg-transparent px-1 text-xs outline-none focus:bg-blue-50"
                            value={info.getValue()}
                            onChange={(e) => handleSave(info.row.original.id, 'residents_activity_other_service', e.target.value)}
                        >
                            <option value=""></option>
                            <option value="デイサービス">デイサービス</option>
                            <option value="訪問看護">訪問看護</option>
                        </select>
                    ),
                    size: 180,
                }),
            ]
        }),
        columnHelper.group({
            header: '夜間',
            columns: [
                columnHelper.accessor('night_gh_stay', {
                    header: 'GH泊',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'night_gh_stay', checked)}
                        />
                    ),
                    size: 50,
                }),
                columnHelper.accessor('night_emergency', {
                    header: '救急搬送',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'night_emergency', checked)}
                        />
                    ),
                    size: 80,
                }),
                columnHelper.accessor('night_hospitalized', {
                    header: '入院',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'night_hospitalized', checked)}
                        />
                    ),
                    size: 50,
                }),
                columnHelper.accessor('night_stay_out', {
                    header: '外泊',
                    cell: info => (
                        <CheckboxCell
                            checked={info.getValue()}
                            onChange={(checked) => handleSave(info.row.original.id, 'night_stay_out', checked)}
                        />
                    ),
                    size: 50,
                }),
            ]
        }),
    ], [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className={`w-full overflow-auto border rounded-sm ${className || ''}`}>
            <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100 z-10">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    colSpan={header.colSpan}
                                    className="border border-gray-300 px-2 py-1 font-medium text-gray-700 bg-gray-50 text-center h-10 text-xs"
                                    style={{ width: header.getSize() }}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-blue-50 transition-colors">
                            {row.getVisibleCells().map(cell => (
                                <td
                                    key={cell.id}
                                    className="border border-gray-300 p-0 text-center relative h-10 align-middle"
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function CheckboxCell({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) {
    return (
        <div className="flex items-center justify-center w-full h-full">
            <input
                type="checkbox"
                className="w-5 h-5 accent-green-600 cursor-pointer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
        </div>
    )
}
