'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Facility } from '@/types'

interface Props {
    facilities: Facility[]
}

export function ResidentFacilityFilter({ facilities }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentFacilityId = searchParams.get('facility_id') || 'all'

    const handleValueChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'all') {
            params.delete('facility_id')
        } else {
            params.set('facility_id', value)
        }
        router.push(`/residents?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium">施設絞り込み:</span>
            <Select value={currentFacilityId} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[200px] bg-white">
                    <SelectValue placeholder="施設を選択" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">全ての施設</SelectItem>
                    {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                            {f.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
