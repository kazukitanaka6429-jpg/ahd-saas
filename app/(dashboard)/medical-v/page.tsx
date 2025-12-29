import { getMedicalVData } from '@/app/actions/medical-v/get-medical-v-data'
import { MedicalVTable } from '@/components/medical-v/medical-v-table'
import { MonthSelector } from '@/components/medical-v/month-selector'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function MedicalVPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const sp = await searchParams
    const today = new Date()
    const year = sp.year ? parseInt(sp.year as string) : today.getFullYear()
    const month = sp.month ? parseInt(sp.month as string) : today.getMonth() + 1

    // Construct a date string for the selector (1st of month)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-01`

    const { residents, rows, targetCount } = await getMedicalVData(year, month)

    // Calculate Monthly Total Units
    const totalUnits = rows.reduce((sum, r) => sum + r.calculated_units, 0)

    return (
        <div className="space-y-6 pt-6 pb-20 px-6 max-w-[100vw] overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        🏥 医療連携体制加算Ⅴ (集計・記録)
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        指導看護師数と実施記録を入力し、請求単位数を自動計算します。
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Summary Cards */}
                    <div className="bg-red-50 border border-red-200 rounded-md p-2 flex flex-col items-center min-w-[120px]">
                        <span className="text-xs text-red-600 font-bold">喀痰吸引対象者数</span>
                        <span className="text-xl font-bold text-red-700">{targetCount}名</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 flex flex-col items-center min-w-[120px]">
                        <span className="text-xs text-blue-600 font-bold">月間合計単位数</span>
                        <span className="text-xl font-bold text-blue-700">{totalUnits.toLocaleString()}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <MonthSelector year={year} month={month} />
                    </div>
                </div>
            </div>

            <MedicalVTable
                data={rows}
                residents={residents}
                targetCount={targetCount}
                year={year}
                month={month}
            />
        </div>
    )
}
