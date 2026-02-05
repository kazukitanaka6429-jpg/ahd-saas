import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TimelineChart } from "@/components/features/audit/timeline-chart"
import { ManualWorkDialog } from "@/components/features/audit/manual-work-dialog"
import { ManualDeductionDialog } from "@/components/features/audit/manual-deduction-dialog"
import { CsvImportDialog } from "@/components/features/audit/csv-import-dialog"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { getAuditPageData } from "@/app/actions/audit/fetch"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { AuditDateNavigator } from "@/components/features/audit/date-navigator"
import { PdfPrintButton } from "@/components/features/audit/pdf-print-button"
import { FacilitySwitcher } from "@/components/common/facility-switcher"

// This is a Server Component
export default async function PersonnelAuditPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    // Resolve searchParams (Next.js 15+)
    const params = await searchParams
    const dateArg = params?.date

    // Fetch Data
    const data = await getAuditPageData(dateArg)

    if ('error' in data) {
        return <div className="p-10 text-red-500">Error: {data.error}</div>
    }

    const { auditResult, staffList, date, dailyShifts, manualWorks, manualDeductions } = data

    // Formatting for display
    const dateDisplay = format(new Date(date), "yyyy年M月d日 (E)", { locale: ja })

    return (
        <div className="container mx-auto py-6 space-y-6 print:space-y-4 print:py-2">
            <div className="flex flex-col gap-4 print:hidden">
                <h1 className="text-2xl font-bold tracking-tight">人員配置チェック</h1>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-[260px]">
                            <FacilitySwitcher />
                        </div>
                        <AuditDateNavigator date={date} />
                    </div>
                    <div className="flex gap-2">
                        <PdfPrintButton />
                        <CsvImportDialog />
                        <ManualWorkDialog
                            targetDate={date}
                            staffList={staffList}
                            manualWorks={manualWorks}
                            dailyShifts={dailyShifts}
                        />
                        <ManualDeductionDialog
                            targetDate={date}
                            staffList={staffList}
                            manualDeductions={manualDeductions}
                        />
                    </div>
                </div>
            </div>

            {/* Print Only Header */}
            <div className="hidden print:block text-center mb-4 border-b pb-2">
                <h1 className="text-xl font-bold">人員配置チェック - {dateDisplay}</h1>
                <p className="text-sm">判定: {auditResult.results.every(r => r.status === 'ok') ? '適合' : '不適合'}</p>
            </div>

            {/* Global Alert Banner */}
            {auditResult.results.some(r => r.status === 'ng') ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 print:border-red-500 print:text-black">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold">違反が検出されました:</span>
                    <span className="ml-2">詳細は下部の「配置状況」を確認してください。</span>
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2 print:border-green-500 print:text-black">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-bold">適合:</span>
                    <span className="ml-2">全ての人員配置基準を満たしています。</span>
                </div>
            )}

            <Card className="print:shadow-none print:border-gray-300">
                <CardHeader>
                    <CardTitle>勤務・配置タイムライン</CardTitle>
                </CardHeader>
                <CardContent>
                    <TimelineChart
                        data={auditResult.timelines.map(t => ({
                            staffId: t.staffName,
                            staffName: t.staffName,
                            segments: t.segments
                        }))}
                        targetDate={date}
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
                <StatusCard result={auditResult.results[0]} title="配置状況 (0:00 - 5:00)" sub="夜間 / 前日夜勤+当日早番" />
                <StatusCard result={auditResult.results[1]} title="配置状況 (5:01 - 21:59)" sub="日中 / 当日稼働" />
                <StatusCard result={auditResult.results[2]} title="配置状況 (22:00 - 23:59)" sub="夜間 / 当日夜勤" />
            </div>
        </div>
    )
}

function StatusCard({ result, title, sub }: { result: any, title: string, sub: string }) {
    const isOk = result.status === 'ok'
    return (
        <Card className={`${isOk ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"} print:shadow-none print:break-inside-avoid`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
                <p className="text-xs text-muted-foreground">{sub}</p>
            </CardHeader>
            <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li>基準: <span className="font-semibold">{result.required}名以上</span></li>
                    {isOk ? (
                        <>
                            <li>NG区間: なし</li>
                            <li>判定: <span className="text-green-600 font-bold border border-green-600 px-2 py-0.5 rounded text-xs print:text-black print:border-black">適合</span></li>
                        </>
                    ) : (
                        <>
                            <li><span className="text-red-600 font-bold print:text-black">NG区間</span>:
                                <span className="ml-1 text-red-600 font-semibold print:text-black">{result.ngSegments.join(", ")}</span>
                            </li>
                            <li>判定: <span className="text-red-600 font-bold border border-red-600 px-2 py-0.5 rounded text-xs bg-red-50 print:bg-transparent print:text-black print:border-black">不適合</span></li>
                        </>
                    )}
                    <li className="text-xs text-muted-foreground mt-2">最小配置数: {result.minCount}名</li>
                </ul>
            </CardContent>
        </Card>
    )
}
