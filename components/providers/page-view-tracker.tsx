'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { recordPageView } from '@/app/actions/page-view'

/**
 * Invisible component that records page views on route changes.
 * Place this in the dashboard layout to track all page navigation.
 */
export function PageViewTracker() {
    const pathname = usePathname()
    const lastPathname = useRef<string | null>(null)

    useEffect(() => {
        // Skip if same path (prevents double-logging)
        if (pathname === lastPathname.current) return
        lastPathname.current = pathname

        // Fire-and-forget: never block UI
        recordPageView(pathname).catch(() => {})
    }, [pathname])

    return null
}
