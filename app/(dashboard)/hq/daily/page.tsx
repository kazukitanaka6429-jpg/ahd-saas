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
import { createClient } from '@/lib/supabase/server'
import type { ResidentMatrixData } from '@/types'

// Helper: Extract counts from matrix data for reconciliation
function extractYorisolData(matrixData: ResidentMatrixData[]) {
    const mealData: {
        residentId: string
        residentName: string
        breakfastCount: number
        lunchCount: number
        dinnerCount: number
    }[] = []

    const additionData: {
        residentId: string
        residentName: string
        dayActivityCount: number
        nightShiftCount: number
        medicalIV1Count: number
        medicalIV2Count: number
        medicalIV3Count: number
    }[] = []

    for (const item of matrixData) {
        const { resident, rows } = item

        // Count true values in dailyValues array
        const countTrues = (row: { key: string; dailyValues: boolean[] } | undefined) => {
            if (!row) return 0
            return row.dailyValues.filter(v => v === true).length
        }

        const breakfastRow = rows.find(r => r.key === 'meal_breakfast')
        const lunchRow = rows.find(r => r.key === 'meal_lunch')
        const dinnerRow = rows.find(r => r.key === 'meal_dinner')

        mealData.push({
            residentId: String(resident.display_id ?? ''),
            residentName: resident.name,
            breakfastCount: countTrues(breakfastRow),
            lunchCount: countTrues(lunchRow),
            dinnerCount: countTrues(dinnerRow),
        })

        const dayActivityRow = rows.find(r => r.key === 'daytime_activity')
        const nightShiftRow = rows.find(r => r.key === 'is_night_shift')
        const iv1Row = rows.find(r => r.key === 'medical_iv_1')
        const iv2Row = rows.find(r => r.key === 'medical_iv_2')
        const iv3Row = rows.find(r => r.key === 'medical_iv_3')

        additionData.push({
            residentId: String(resident.display_id ?? ''),
            residentName: resident.name,
            dayActivityCount: countTrues(dayActivityRow),
            nightShiftCount: countTrues(nightShiftRow),
            medicalIV1Count: countTrues(iv1Row),
            medicalIV2Count: countTrues(iv2Row),
            medicalIV3Count: countTrues(iv3Row),
        })
    }

    return { mealData, additionData }
}

export default async function HqDailyPage({ searchParams }: { searchParams: Promise<{ year?: string, month?: string }> }) {
    const staff = await getCurrentStaff()
    if (!staff) {
        return <div>Unauthorized</div>
    }

    const resolvedParams = await searchParams
    const now = new Date()
    const year = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear()
    const month = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth() + 1

    // Explicitly do NOT use facility_id from params to force "All Facilities" view
    const facilityId = undefined

    const [matrixResponse, stayData] = await Promise.all([
        getHqDailyData(year, month, facilityId),
        getHqStayPeriods(year, month, facilityId)
    ])

    const matrixData = matrixResponse.success ? (matrixResponse.data || []) : []
    if (!matrixResponse.success) {
        console.error('HQ Daily Data fetch failed:', matrixResponse.error)
    }

    // Extract Yorisol data for reconciliation
    const { mealData, additionData } = extractYorisolData(matrixData)

    // Fetch facilities for BillingImporter
    const supabase = await createClient()
    const { data: facilities } = await supabase
        .from('facilities')
        .select('id, name')
        .eq('organization_id', staff.organization_id)
        .order('name')

    // Determine next/prev month links
    const prevDate = new Date(year, month - 1 - 1, 1)
    const nextDate = new Date(year, month - 1 + 1, 1)

    const prevLink = `/hq/daily?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`
    const nextLink = `/hq/daily?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`

    return (
        <div className="flex flex-col h-full gap-4 p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        📒 一覧確認
                    </h1>
                </div>

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
                    facilities={facilities || []}
                    yorisolMealData={mealData}
                    yorisolAdditionData={additionData}
                />

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

