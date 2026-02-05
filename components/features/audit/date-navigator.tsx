"use client"

import { format, addDays, subDays, parseISO } from "date-fns"
import { ja } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useRouter } from "next/navigation"

interface AuditDateNavigatorProps {
    date: string // YYYY-MM-DD
}

export function AuditDateNavigator({ date }: AuditDateNavigatorProps) {
    const router = useRouter()
    const currentDate = parseISO(date)

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            router.push(`/audit/personnel?date=${format(newDate, 'yyyy-MM-dd')}`)
        }
    }

    const handlePrevDay = () => {
        const prev = subDays(currentDate, 1)
        router.push(`/audit/personnel?date=${format(prev, 'yyyy-MM-dd')}`)
    }

    const handleNextDay = () => {
        const next = addDays(currentDate, 1)
        router.push(`/audit/personnel?date=${format(next, 'yyyy-MM-dd')}`)
    }

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(currentDate, "yyyy年M月d日 (E)", { locale: ja }) : <span>日付を選択</span>}
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
        </div>
    )
}
