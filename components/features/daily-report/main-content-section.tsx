import { getDailyMatrix } from '@/app/actions/daily-record'
import { getShortStayRecord } from '@/app/actions/short-stay'
import { getUnits } from '@/app/actions/units'
import { getFindingsCountByRecord } from '@/app/actions/findings'
import { DailyReportGrid } from '@/components/features/daily-report/daily-report-grid'
import { ShortStayGrid } from '@/components/features/daily-report/short-stay-grid'
import { DailyReportMobileList } from '@/components/features/daily-report/daily-report-mobile'
import { headers } from 'next/headers'

export async function MainContentSection({
    date,
    facilityId
}: {
    date: string,
    facilityId: string
}) {
    const [
        matrixRes,
        indicators,
        shortStayRes,
        unitsRes
    ] = await Promise.all([
        getDailyMatrix(date, facilityId),
        getFindingsCountByRecord(date),
        getShortStayRecord(date, facilityId),
        getUnits(facilityId)
    ])

    const residents = matrixRes.data?.residents || []
    const dailyRecordsMap = matrixRes.data?.records || {}
    const dailyRecords = Object.values(dailyRecordsMap)
    const shortStayRecord = shortStayRes.data

    // Mobile Detection
    const headersList = headers()
    const userAgent = (await headersList).get('user-agent') || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

    return (
        <>
            {/* Section C: Main Grid */}
            {isMobile ? (
                <DailyReportMobileList
                    residents={residents}
                    date={date}
                />
            ) : (
                <DailyReportGrid
                    residents={residents}
                    defaultRecords={dailyRecords as any}
                    date={date}
                    findingsIndicators={indicators}
                    units={unitsRes.data || []}
                />
            )}

            {/* Section D: Short Stay */}
            {!isMobile && (
                <ShortStayGrid
                    residents={residents}
                    record={shortStayRecord}
                    date={date}
                    facilityId={facilityId}
                    key={`short-${date}`}
                />
            )}
        </>
    )
}
