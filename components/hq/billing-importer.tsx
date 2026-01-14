'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { importBillingCsv } from '@/app/actions/hq/import-billing-csv'

import { useRouter } from 'next/navigation'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BillingImporterProps {
    facilityId: string
    date: Date
    onSuccess?: () => void
    facilities?: { id: string, name: string }[]
}

export function BillingImporter({ facilityId, date, onSuccess, facilities = [] }: BillingImporterProps) {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [selectedFacilityId, setSelectedFacilityId] = useState(facilityId)
    const [isUploading, setIsUploading] = useState(false)

    // Sync selected if prop changes (though usually static in this usage)
    // useEffect(() => { setSelectedFacilityId(facilityId) }, [facilityId])

    const handleUpload = async () => {
        if (!file) return
        const targetFacilityId = selectedFacilityId
        if (!targetFacilityId) {
            toast.error('施設を選択してください')
            return
        }

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('facilityId', targetFacilityId)
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
        <div className="flex items-center gap-2 p-4 bg-white rounded-md border shadow-sm flex-wrap">
            <div className="bg-blue-50 p-2 rounded-full hidden sm:block">
                <FileUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-[300px]">
                <div className="flex items-baseline justify-between mb-1">
                    <p className="text-sm font-bold">請求データCSV取込</p>
                    {!facilityId && facilities.length > 0 && (
                        <span className="text-xs text-red-500 font-bold ml-2">※施設を選択してください</span>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap">
                    {!facilityId && facilities.length > 0 && (
                        <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                            <SelectTrigger className="w-[180px] h-9 text-sm">
                                <SelectValue placeholder="施設を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {facilities.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.name.replace('ABCリビング', '')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        disabled={isUploading}
                        className="h-9 text-sm w-auto grow min-w-[200px]"
                    />
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading || !selectedFacilityId}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        アップロード
                    </Button>
                </div>
            </div>
        </div>
    )
}
