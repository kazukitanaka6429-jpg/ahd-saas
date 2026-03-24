import { getHqDashboardData } from '@/app/actions/hq/dashboard'
import { DashboardClient } from './dashboard-client'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'HQ Dashboard | Infrared',
}

export default async function HqDashboardPage() {
    // Fetch initial data (current month)
    const result = await getHqDashboardData()

    if ('error' in result) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold">Error</h2>
                <p>{result.error}</p>
            </div>
        )
    }

    return <DashboardClient initialData={result} />
}
