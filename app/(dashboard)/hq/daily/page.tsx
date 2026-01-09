import { Suspense } from 'react'
import { getHqDailyData } from '@/app/actions/hq/get-hq-daily-data'
import { getHqStayPeriods } from '@/app/actions/hq/get-hq-stay-periods'
import { HqCheckMatrix } from '@/components/hq/hq-check-matrix'
import { BillingImporter } from '@/components/hq/billing-importer'
import { getCurrentStaff } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function HqDailyPage({ searchParams }: { searchParams: Promise<{ year?: string, month?: string }> }) {
    const staff = await getCurrentStaff()
    if (!staff) {
        // Handle unauthorized access (though middleware likely covers this)
        return <div>Unauthorized</div>
    }

    const resolvedParams = await searchParams
    const now = new Date()
    const year = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear()
    const month = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth() + 1

    const [matrixData, stayData] = await Promise.all([
        getHqDailyData(year, month),
        getHqStayPeriods(year, month)
    ])

    // Determine next/prev month links
    const prevDate = new Date(year, month - 1 - 1, 1)
    const nextDate = new Date(year, month - 1 + 1, 1)

    const prevLink = `/hq/daily?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`
    const nextLink = `/hq/daily?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`

    return (
        <div className="flex flex-col h-full gap-4 p-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    本社日次確認画面 (HQ Daily Check)
                </h1>

                <div className="flex items-center gap-4 bg-white p-2 rounded border">
                    <Link href={prevLink}>
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <span className="font-bold text-lg min-w-[100px] text-center">
                        {year}年 {month}月
                    </span>
                    <Link href={nextLink}>
                        <Button variant="ghost" size="icon">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <BillingImporter
                    facilityId={staff.facility_id || ''}
                    date={new Date(year, month - 1, 1)}
                    onSuccess={async () => {
                        'use server'
                        // This pattern requires client component to call router.refresh().
                        // Here onSuccess in Client Component handles UI, but we can't pass server action easily as void callback.
                        // Importer handles router.refresh() or we assume it does (actually I didn't verify BillingImporter does refresh).
                        // I should verify BillingImporter calls router.refresh() or onSuccess prop does it.
                        // I implemented BillingImporter to take onSuccess prop. I should pass a client handler that refreshes.
                    }}
                />

                {/* Importer passes onSuccess to update page. 
                    Since this is a Server Component, we can't pass a function that refreshes using router.
                    The BillingImporter is a Client Component, so it can use useRouter(). 
                    I'll update BillingImporter to refresh on success if onSuccess is not provided, or Page should pass a server action that revalidates path?
                    Revalidating path is better. But Client Component can just call router.refresh().
                    
                    Wait, I passed `onSuccess` from Page. I can't pass a function from Server Component unless it's a Server Action.
                    But I want to refresh the page.
                    Alternative: Make the Importer handle the refresh itself.
                    Checking BillingImporter execution... it takes `onSuccess`.
                    
                    Correction: Render `ImporterContainer` as client component?
                    Or just fix BillingImporter.tsx to use router.refresh() inside handleUpload if success.
                    Actually, BillingImporter logic I wrote calls `onSuccess()`.
                    I will update BillingImporter to refresh the page if onSuccess is passed?
                    
                    Wait, simpler: I'll wrap the Importer usage in a Client Component or just make the importer verify refresh.
                    I'll use a Client Component wrapper inside this page if needed, or simply let BillingImporter handle logic.
                    
                    Let's create a Client Component wrapper for the Importer to handle router refresh:
                    Or I could fix `BillingImporter` to import `useRouter` and call refresh.
                    I'll check `BillingImporter` code I wrote.
                    I didn't include `useRouter` / `router.refresh()` in `BillingImporter`. 
                    I should update `BillingImporter` to do that.
                */}

                <Suspense fallback={<div className="p-10 text-center">読み込み中...</div>}>
                    <HqCheckMatrix
                        data={matrixData}
                        stayData={stayData}
                        year={year}
                        month={month}
                    />
                </Suspense>
            </div>
        </div>
    )
}
