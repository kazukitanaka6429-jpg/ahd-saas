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

export function FacilitySwitcher() {
    const { currentFacility, accessibleFacilities, switchFacility, isGlobalAdmin } = useFacility()

    if (!isGlobalAdmin || accessibleFacilities.length <= 1) {
        // Just show the name if not admin or only one choice
        return (
            <div className="font-bold text-lg px-2 text-gray-700">
                {currentFacility?.name || '読み込み中...'}
            </div>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 font-bold text-lg px-2 hover:bg-gray-100 rounded-md transition-colors outline-none">
                {currentFacility?.name || '施設を選択'}
                <ChevronsUpDown className="w-4 h-4 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
                {accessibleFacilities.map((facility) => (
                    <DropdownMenuItem
                        key={facility.id}
                        onClick={() => switchFacility(facility.id)}
                        className="cursor-pointer flex justify-between"
                    >
                        {facility.name}
                        {currentFacility?.id === facility.id && (
                            <Check className="w-4 h-4 text-green-600" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
