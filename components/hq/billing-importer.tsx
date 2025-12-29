'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { importBillingCsv } from '@/app/actions/hq/import-billing-csv'

import { useRouter } from 'next/navigation'

interface BillingImporterProps {
    facilityId: string
    date: Date
    onSuccess?: () => void
}

export function BillingImporter({ facilityId, date, onSuccess }: BillingImporterProps) {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    const handleUpload = async () => {
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('facilityId', facilityId)
        // Format date as YYYY-MM-DD (first of month)
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        formData.append('date', dateStr)

        try {
            const result = await importBillingCsv(formData)
            if (result.success) {
                toast.success('CSVインポート完了', {
                    description: `${result.count}件のデータを読み込みました`
                })
                setFile(null)
                router.refresh()
                if (onSuccess) onSuccess()
            } else {
                toast.error('インポート失敗', {
                    description: result.error
                })
            }
        } catch (e) {
            toast.error('予期せぬエラーが発生しました')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex items-center gap-2 p-4 bg-white rounded-md border shadow-sm">
            <div className="bg-blue-50 p-2 rounded-full hidden sm:block">
                <FileUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold mb-1">請求データCSV取込</p>
                <div className="flex gap-2">
                    <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        disabled={isUploading}
                        className="h-9 text-sm"
                    />
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        アップロード
                    </Button>
                </div>
            </div>
        </div>
    )
}
