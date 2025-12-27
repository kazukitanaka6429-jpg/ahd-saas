'use client'

import * as React from "react"
import { format, addDays, subDays, parseISO } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function DateSelector({ date }: { date: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [open, setOpen] = React.useState(false)

    // Ensure we parse the YYYY-MM-DD string as specific date, avoiding timezone shifts
    // But basic new Date(date) usually defaults to UTC 00:00 for ISO date-only strings?
    // Actually new Date('2023-01-01') is UTC. format(d) uses local. This causes shift.
    // parseISO is safer.
    const currentDate = parseISO(date)

    const updateDate = (newDate: Date) => {
        const dateString = format(newDate, 'yyyy-MM-dd')
        const params = new URLSearchParams(searchParams.toString())
        params.set('date', dateString)

        // Use replace instead of push for smoother UX if just scanning days? 
        // Or push is fine. Let's stick to push but remove refresh.
        router.push(`${pathname}?${params.toString()}`)
        router.refresh()
    }

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return
        updateDate(newDate)
        setOpen(false)
    }

    const handlePrevDay = () => {
        const prev = subDays(currentDate, 1)
        updateDate(prev)
    }

    const handleNextDay = () => {
        const next = addDays(currentDate, 1)
        updateDate(next)
    }

    return (
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        suppressHydrationWarning
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(currentDate, "PPP", { locale: ja }) : <span>日付を選択</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={ja}
                    />
                </PopoverContent>
            </Popover>

            <Button variant="outline" size="icon" onClick={handleNextDay}>
                <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                className="text-xs text-muted-foreground"
            >
                今日へ戻る
            </Button>
        </div>
    )
}
