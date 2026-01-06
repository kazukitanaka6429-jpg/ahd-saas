'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Activity } from 'lucide-react'

export function DebugToggle() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isDebug = searchParams.get('debug') === 'true'

    const toggleDebug = () => {
        const params = new URLSearchParams(window.location.search)
        if (isDebug) {
            params.delete('debug')
        } else {
            params.set('debug', 'true')
        }
        window.location.href = `/?${params.toString()}`
    }

    return (
        <div className="flex justify-end mt-8">
            <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1"
                onClick={toggleDebug}
            >
                <Activity className="h-3 w-3" />
                {isDebug ? 'システムステータスを隠す' : 'システムステータスを表示'}
            </Button>
        </div>
    )
}
