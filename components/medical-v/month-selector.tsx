'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface MonthSelectorProps {
    year: number
    month: number
}

export function MonthSelector({ year, month }: MonthSelectorProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleMonthChange = (offset: number) => {
        const currentDate = new Date(year, month - 1, 1) // 1st day of target month
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1)

        const params = new URLSearchParams(searchParams)
        params.set('year', newDate.getFullYear().toString())
        params.set('month', (newDate.getMonth() + 1).toString())

        router.push(`${pathname}?${params.toString()}`)
    }

    // Current Date for display
    const displayDate = new Date(year, month - 1, 1)

    return (
        <div className="flex items-center gap-2 bg-white rounded-md border p-1 shadow-sm">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange(-1)}
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-lg font-bold text-gray-900 min-w-[120px] text-center select-none">
                {format(displayDate, 'yyyy年 M月', { locale: ja })}
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange(1)}
                className="h-8 w-8 text-gray-500 hover:text-gray-900"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}
