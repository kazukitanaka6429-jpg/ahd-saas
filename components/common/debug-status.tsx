'use client'

import { useSearchParams } from 'next/navigation'

type DebugStatusProps = {
    user: any
    staff: any
    isHQ: boolean
}

export function DebugStatus({ user, staff, isHQ }: DebugStatusProps) {
    const searchParams = useSearchParams()
    const isDebug = searchParams.get('debug') === 'true'

    if (!isDebug) return null

    return (
        <div className="p-6 border rounded-lg shadow-sm bg-white border-red-200">
            <h2 className="text-lg font-semibold mb-2 text-red-600">デバッグモード (System Status)</h2>
            <p className="text-gray-600">システムは正常に稼働しています。</p>
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 font-mono">
                Debug Info:<br />
                UID: {user?.id}<br />
                Staff Role: {staff?.role || 'null'}<br />
                Is HQ: {isHQ ? 'Yes' : 'No'}
            </div>
        </div>
    )
}
