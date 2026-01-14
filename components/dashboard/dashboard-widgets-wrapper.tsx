'use client'

import dynamic from 'next/dynamic'
import { DocumentAlert } from '@/lib/document-types'
import { DocumentAlertsWidget } from './document-alerts-widget'

const NotificationWidget = dynamic(
    () => import('@/components/dashboard/NotificationWidget').then(mod => mod.NotificationWidget),
    { ssr: false }
)
const FacilityNotificationWidget = dynamic(
    () => import('@/components/dashboard/FacilityNotificationWidget').then(mod => mod.FacilityNotificationWidget),
    { ssr: false }
)

interface DashboardWidgetsWrapperProps {
    isHQ: boolean
    documentAlerts?: DocumentAlert[]
}

export function DashboardWidgetsWrapper({ isHQ, documentAlerts = [] }: DashboardWidgetsWrapperProps) {
    if (isHQ) {
        return (
            <div className="w-full space-y-6">
                <DocumentAlertsWidget alerts={documentAlerts} />
                <NotificationWidget />
            </div>
        )
    }

    return (
        <div className="w-full">
            <FacilityNotificationWidget />
        </div>
    )
}
