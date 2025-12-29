'use client'

import { ResidentStayData } from '@/types'
import { cn } from '@/lib/utils'

interface HqStayManagementProps {
    data: ResidentStayData[]
}

export function HqStayManagement({ data }: HqStayManagementProps) {
    // Fixed 10 slots
    const slots = Array.from({ length: 10 }, (_, i) => i)

    return (
        <div className="overflow-auto flex-1 relative border rounded-md">
            <table className="border-collapse w-full text-xs min-w-[max-content]">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 shadow-sm font-bold">
                    <tr>
                        <th className="border p-2 sticky left-0 z-30 bg-gray-100 w-[120px] min-w-[120px]">施設名</th>
                        <th className="border p-2 sticky left-[120px] z-30 bg-gray-100 w-[120px] min-w-[120px]">利用者名</th>
                        <th className="border p-2 sticky left-[240px] z-30 bg-gray-100 w-[80px] min-w-[80px] text-center">
                            今月の<br />在籍日数
                        </th>

                        {slots.map((i) => (
                            <th key={i} className="border p-1 min-w-[100px] text-center bg-gray-50">
                                入院・外泊 {i + 1}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={row.residentId} className="group hover:bg-gray-50 transition-colors bg-white">
                            {/* Facility - only show if logic grouping were here, but usually flat list. 
                                However, if multiple residents belong to same facility, we might want to group?
                                Requirement said "Left side fixed... Facility Name: (Rowspan)".
                                Since functionality is for HQ (multiple facilities?), we need to handle grouping if sorting allows.
                                Assuming data is sorted by Facility then Name, or we just render flat.
                                The prompt image implies simple row based table.
                                Wait, prompt said "Facility Name: (Rowspan)".
                                My current `getHqStayPeriods` fetches for *logged in staff's facility*.
                                So usually there is only 1 facility in the list.
                                So I can just rowspan the whole thing or just repeat.
                                If `getHqStayPeriods` only gets current facility data (checked code: it filters by staff.facility_id), 
                                then effectively all rows have same facility.
                            */}

                            {rowIndex === 0 && (
                                <td
                                    rowSpan={data.length}
                                    className="border p-2 sticky left-0 z-10 bg-white font-medium align-top"
                                >
                                    <div className="writing-mode-vertical-rl h-full flex items-center justify-center text-gray-700 font-bold whitespace-nowrap min-h-[100px]">
                                        {row.facilityName}
                                    </div>
                                </td>
                            )}

                            <td className="border p-2 sticky left-[120px] z-10 bg-white font-bold align-middle border-b-gray-200">
                                {row.residentName}
                            </td>

                            <td className="border p-2 sticky left-[240px] z-10 bg-white text-center font-bold text-lg align-middle border-r-2 border-r-gray-300">
                                {row.enrollmentDays}日
                            </td>

                            {slots.map((i) => {
                                const period = row.periods[i]
                                return (
                                    <td key={i} className="border p-2 text-center align-middle h-10">
                                        {period ? (
                                            <div className="flex items-center justify-center gap-1 text-sm bg-gray-50 border rounded px-2 py-1 shadow-sm">
                                                <span className="font-bold">
                                                    {period.start || <span className="text-gray-400 text-xs">(前月)</span>}
                                                </span>
                                                <span className="text-gray-400">~</span>
                                                <span className="font-bold">
                                                    {period.end || <span className="text-gray-400 text-xs">継続</span>}
                                                </span>
                                                <span className={cn(
                                                    "ml-1 text-[10px] px-1 rounded text-white font-normal",
                                                    period.type === 'hospitalization' ? "bg-red-400" : "bg-blue-400"
                                                )}>
                                                    {period.type === 'hospitalization' ? '入院' : '外泊'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-200">-</span>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={13} className="p-8 text-center text-gray-500">
                                データがありません
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
