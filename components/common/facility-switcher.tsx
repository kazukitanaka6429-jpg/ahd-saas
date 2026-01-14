'use client'

import { ChevronsUpDown, Check } from 'lucide-react'
import { useFacility } from '@/components/providers/facility-context'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'

export function FacilitySwitcher({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
    const { currentFacility, accessibleFacilities, switchFacility, isGlobalAdmin } = useFacility()

    const formatFacilityName = (name: string) => {
        if (!name) return '読み込み中...'
        const prefix = 'ABCリビング'
        if (name.startsWith(prefix) && name !== prefix) {
            return (
                <div className={cn("flex flex-col items-start leading-tight text-left", variant === 'header' ? "flex-row gap-2 items-end" : "")}>
                    <span className={cn("font-bold", variant === 'header' ? "text-lg" : "text-base")}>{prefix}</span>
                    <span className={cn("font-normal", variant === 'header' ? "text-lg" : "text-sm")}>{name.replace(prefix, '')}</span>
                </div>
            )
        }
        return <span className={cn("font-bold", variant === 'header' ? "text-lg" : "text-base")}>{name}</span>
    }

    if (!isGlobalAdmin || accessibleFacilities.length <= 1) {
        // Just show the name if not admin or only one choice
        return (
            <div className={cn(
                "text-gray-700",
                variant === 'sidebar' ? "px-2" : "",
                // For header variant, ensure it aligns with the layout even if not a dropdown
                variant === 'header' ? "px-0 py-2 border border-transparent" : ""
            )}>
                {formatFacilityName(currentFacility?.name || '')}
            </div>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={cn(
                "flex items-center justify-between gap-2 rounded-md transition-colors outline-none",
                variant === 'sidebar'
                    ? "w-full px-2 py-1 hover:bg-gray-100"
                    : "hover:bg-slate-100 px-3 py-2 border border-transparent hover:border-slate-200"
            )}>
                {formatFacilityName(currentFacility?.name || '施設を選択')}
                <ChevronsUpDown className="w-4 h-4 text-gray-500 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align={variant === 'sidebar' ? "start" : "end"} className="w-[220px]">
                {accessibleFacilities.map((facility) => (
                    <DropdownMenuItem
                        key={facility.id}
                        onClick={() => switchFacility(facility.id)}
                        className="cursor-pointer flex justify-between items-start py-2"
                    >
                        <span className="whitespace-pre-wrap">
                            {facility.name.replace('ABCリビング', 'ABCリビング\n')}
                        </span>
                        {currentFacility?.id === facility.id && (
                            <Check className="w-4 h-4 text-green-600 mt-1 shrink-0" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
