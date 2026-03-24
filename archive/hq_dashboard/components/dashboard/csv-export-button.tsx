'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { exportMonthlyOperationsCsv } from '@/app/actions/hq/export-monthly-operations'

interface CsvExportButtonProps {
    yearMonth: string
}

export function CsvExportButton({ yearMonth }: CsvExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        try {
            setIsExporting(true)
            toast.info('CSVエクスポートを開始しました...')

            const result = await exportMonthlyOperationsCsv(yearMonth)

            if (result.error) {
                toast.error(result.error)
                return
            }

            if (result.csv) {
                // Trigger Download
                const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `monthly_operations_${yearMonth}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                toast.success('エクスポートが完了しました')
            } else {
                toast.error('データが見つかりませんでした')
            }
        } catch (e) {
            console.error(e)
            toast.error('エクスポート中にエラーが発生しました')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            月次稼働CSV出力
        </Button>
    )
}
