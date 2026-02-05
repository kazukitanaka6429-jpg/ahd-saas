"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// --- Types for Prototype ---
export interface TimeSegment {
    start: string // "HH:MM"
    end: string   // "HH:MM"
    type: 'base' | 'work' | 'deduction' | 'net'
    label?: string
    color?: string
}

export interface StaffTimeline {
    staffId: string
    staffName: string
    segments: TimeSegment[]
}

interface TimelineChartProps {
    data: StaffTimeline[]
    targetDate: string
}

// Helper to convert HH:MM to minutes from 0:00
const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

export function TimelineChart({ data, targetDate }: TimelineChartProps) {
    // Audit Rules
    // Day: 5:01 (301m) - 21:59 (1319m)
    // Night: 22:00 (1320m) - 29:00 (5:00 next day) (1740m)

    // Scale: 0:00 to 30:00 (Total 1800 minutes) to cover full potential range (including previous night overlap or next morning)
    // Actually, usually we show 0:00 to 24:00 (1440m) for a single 'day' view, 
    // but night shift requires overlap. Let's stick to 0:00 - 24:00 for the main chart, 
    // maybe allow overflow viewing.

    const TOTAL_MINUTES = 1440 // 24 hours

    const hours = Array.from({ length: 25 }, (_, i) => i)

    const getSegmentStyle = (seg: TimeSegment) => {
        const startM = toMinutes(seg.start)
        const endM = toMinutes(seg.end)
        const duration = endM - startM

        const left = (startM / TOTAL_MINUTES) * 100
        const width = (duration / TOTAL_MINUTES) * 100

        // Colors
        let bgClass = "bg-blue-400"
        if (seg.type === 'deduction') bgClass = "bg-red-400/80 striped-background" // striped via css or just solid for now
        if (seg.type === 'net') bgClass = "bg-green-500"

        return {
            left: `${left}%`,
            width: `${width}%`,
            zIndex: seg.type === 'deduction' ? 20 : 10
        }
    }

    return (
        <div className="w-full overflow-x-auto bg-white border rounded-md p-4">
            <h3 className="text-lg font-bold mb-4">{targetDate} 人員配置タイムライン (プロトタイプ)</h3>

            <div className="min-w-[1000px] relative">
                {/* Header: Hours */}
                <div className="flex border-b mb-2 h-8 relative">
                    <div className="w-32 flex-shrink-0 font-bold text-sm leading-8 pl-2">スタッフ名</div>
                    <div className="flex-grow relative h-full">
                        {hours.map(h => (
                            <div key={h} className="absolute text-xs text-gray-400 border-l h-full px-1" style={{ left: `${(h * 60 / TOTAL_MINUTES) * 100}%` }}>
                                {h}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows */}
                {data.map((staff) => (
                    <div key={staff.staffId} className="flex border-b py-2 hover:bg-gray-50 relative group">
                        <div className="w-32 flex-shrink-0 font-medium text-sm pl-2 flex items-center">
                            {staff.staffName}
                        </div>
                        <div className="flex-grow relative h-12 bg-gray-50/50 rounded-sm">
                            {/* Grid Lines */}
                            {hours.map(h => (
                                <div key={h} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: `${(h * 60 / TOTAL_MINUTES) * 100}%` }}></div>
                            ))}

                            {/* Audit Zones (Draft) - Optional, mainly for debugging visual */}

                            {/* Segments */}
                            {staff.segments.map((seg, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "absolute top-2 h-8 rounded-sm text-[10px] text-white flex items-center justify-center overflow-visible whitespace-nowrap px-1 transition-all hover:brightness-110 cursor-help group/segment",
                                        (seg.type === 'base' || seg.type === 'work') && "bg-blue-500",
                                        seg.type === 'deduction' && "bg-red-500/90 z-20 border-white border", // Overlay
                                        seg.type === 'net' && "bg-green-600 h-2 top-10"
                                    )}
                                    style={getSegmentStyle(seg)}
                                >
                                    {seg.label}

                                    {/* Custom Tooltip req6 */}
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/segment:block z-50 bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap shadow-lg">
                                        <div className="font-bold">{seg.label || '区分なし'}</div>
                                        <div>{seg.start} - {seg.end}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Footer Legend */}
                <div className="mt-4 flex gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-blue-500 rounded"></div> 勤務時間(ベース)</div>
                    <div className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 rounded"></div> 控除時間(訪問看護等)</div>
                </div>
            </div>
        </div>
    )
}
