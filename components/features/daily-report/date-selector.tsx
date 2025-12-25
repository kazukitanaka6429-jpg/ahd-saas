'use client'

import * as React from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

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
    const [open, setOpen] = React.useState(false)
    const currentDate = new Date(date)

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return

        // Adjust for timezone offset to avoid previous day selection issue
        // Or simply use format which uses local time
        const dateString = format(newDate, 'yyyy-MM-dd')

        router.push(`?date=${dateString}`)
        router.refresh()
        setOpen(false)
    }

    const handlePrevDay = () => {
        const d = new Date(date)
        d.setDate(d.getDate() - 1)
        const newDate = format(d, 'yyyy-MM-dd')
        router.push(`?date=${newDate}`)
        router.refresh()
    }

    const handleNextDay = () => {
        const d = new Date(date)
        d.setDate(d.getDate() + 1)
        const newDate = format(d, 'yyyy-MM-dd')
        router.push(`?date=${newDate}`)
        router.refresh()
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
