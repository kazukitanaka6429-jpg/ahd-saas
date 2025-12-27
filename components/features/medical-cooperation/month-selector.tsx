'use client'

import React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export function MonthSelector({ currentMonth }: { currentMonth: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // currentMonth is 'YYYY-MM'
    // append -01 to make it parsable by parseISO (YYYY-MM is usually parsable, but let's be safe)
    // Actually parseISO handles 'YYYY-MM' fine in recent versions, but YYYY-MM-DD set to 01 is safest.
    const date = parseISO(`${currentMonth}-01`)

    const updateMonth = (newDate: Date) => {
        const monthString = format(newDate, 'yyyy-MM')
        const params = new URLSearchParams(searchParams.toString())
        params.set('month', monthString)
        router.push(`${pathname}?${params.toString()}`)
        router.refresh()
    }

    const handlePrev = () => {
        const prev = subMonths(date, 1)
        updateMonth(prev)
    }

    const handleNext = () => {
        const next = addMonths(date, 1)
        updateMonth(next)
    }

    return (
        <div className="flex items-center space-x-4 bg-white p-2 rounded border shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg min-w-[100px] text-center">
                {format(date, 'yyyy年 M月', { locale: ja })}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}
