'use client'

import React, { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { DownloadIcon, Loader2 } from 'lucide-react'
import { getMonthlyResidentRecords } from '@/app/actions/reports/get-monthly-records'
import { MonthlyReportPDF } from '@/components/reports/MonthlyReportPDF'
import { toast } from 'sonner'

interface Props {
    residentId: string
    year: number
    month: number
    disabled?: boolean
}

export function MonthlyReportDownloadButton({ residentId, year, month, disabled }: Props) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        try {
            setLoading(true)
            toast.info('レポートを作成中...')

            // 1. Fetch Data
            const { data, error } = await getMonthlyResidentRecords(residentId, year, month)
            if (error || !data) {
                toast.error(error || 'データの取得に失敗しました')
                return
            }

            // 2. Generate PDF Blob
            const blob = await pdf(<MonthlyReportPDF data={data} />).toBlob()
            const url = URL.createObjectURL(blob)

            // 3. Trigger Download
            const link = document.createElement('a')
            link.href = url
            // Filename: yyyymm_residentName_report.pdf
            link.download = `${year}${String(month).padStart(2, '0')}_${data.resident.name}_業務日誌.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success('ダウンロード完了')
        } catch (e) {
            console.error(e)
            toast.error(`PDF作成中にエラー: ${e instanceof Error ? e.message : 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={loading || disabled}
            className="gap-2"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
            月間PDF出力
        </Button>
    )
}
