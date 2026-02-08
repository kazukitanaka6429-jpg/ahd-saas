'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, FileSpreadsheet, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReconciliationResultDialog } from './reconciliation-result-dialog'
import {
    detectCsvType,
    reconcileSSK02,
    reconcileCKDCSV002,
    type ReconciliationResult
} from '@/app/actions/hq/reconcile-billing-csv'

interface BillingImporterProps {
    facilityId: string
    date: Date
    onSuccess?: () => void
    facilities?: { id: string, name: string }[]
    // Yorisol data for reconciliation
    yorisolMealData?: {
        residentId: string
        residentName: string
        breakfastCount: number
        lunchCount: number
        dinnerCount: number
    }[]
    yorisolAdditionData?: {
        residentId: string
        residentName: string
        dayActivityCount: number
        nightShiftCount: number
        medicalIV1Count: number
        medicalIV2Count: number
        medicalIV3Count: number
    }[]
}

export function BillingImporter({
    facilityId,
    date,
    onSuccess,
    facilities = [],
    yorisolMealData = [],
    yorisolAdditionData = []
}: BillingImporterProps) {
    const router = useRouter()
    const [selectedFacilityId, setSelectedFacilityId] = useState(facilityId)

    // SSK02
    const [ssk02File, setSsk02File] = useState<File | null>(null)
    const [isSsk02Processing, setIsSsk02Processing] = useState(false)

    // CKDCSV002
    const [ckdFile, setCkdFile] = useState<File | null>(null)
    const [isCkdProcessing, setIsCkdProcessing] = useState(false)

    // Result dialog
    const [resultDialogOpen, setResultDialogOpen] = useState(false)
    const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null)

    const handleReconcileSSK02 = async () => {
        if (!ssk02File) return

        setIsSsk02Processing(true)
        try {
            const formData = new FormData()
            formData.append('file', ssk02File)
            formData.append('yorisolData', JSON.stringify(yorisolMealData))

            const result = await reconcileSSK02(formData)

            setReconciliationResult(result)
            setResultDialogOpen(true)

            if (result.success) {
                if (result.mismatchCount === 0) {
                    toast.success('突合完了：全件一致', {
                        description: `${result.matchCount}件が一致しました`
                    })
                } else {
                    toast.warning('突合完了：不一致あり', {
                        description: `${result.mismatchCount}件の不一致があります`
                    })
                }
            } else {
                toast.error('突合エラー', { description: result.error })
            }
        } catch (e: any) {
            toast.error('予期せぬエラーが発生しました')
        } finally {
            setIsSsk02Processing(false)
        }
    }

    const handleReconcileCKD = async () => {
        if (!ckdFile) return

        setIsCkdProcessing(true)
        try {
            const formData = new FormData()
            formData.append('file', ckdFile)
            formData.append('yorisolData', JSON.stringify(yorisolAdditionData))
            formData.append('targetYear', date.getFullYear().toString())
            formData.append('targetMonth', (date.getMonth() + 1).toString())

            const result = await reconcileCKDCSV002(formData)

            setReconciliationResult(result)
            setResultDialogOpen(true)

            if (result.success) {
                if (result.mismatchCount === 0) {
                    toast.success('突合完了：全件一致', {
                        description: `${result.matchCount}件が一致しました`
                    })
                } else {
                    toast.warning('突合完了：不一致あり', {
                        description: `${result.mismatchCount}件の不一致があります`
                    })
                }
            } else {
                toast.error('突合エラー', { description: result.error })
            }
        } catch (e: any) {
            toast.error('予期せぬエラーが発生しました')
        } finally {
            setIsCkdProcessing(false)
        }
    }

    return (
        <>
            <div className="p-4 bg-white rounded-md border shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-50 p-2 rounded-full">
                        <Scale className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-bold">請求データ突合</p>
                        <p className="text-xs text-gray-500">CSVファイルをアップロードしてYorisolデータと比較</p>
                    </div>
                </div>

                {/* 施設選択（管理者向け） */}
                {!facilityId && facilities.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">施設:</span>
                        <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                            <SelectTrigger className="w-[200px] h-9 text-sm">
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
                    </div>
                )}

                {/* SSK02（食事） */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-wrap">
                    <div className="flex items-center gap-2 min-w-[120px]">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">SSK02</span>
                        <span className="text-xs text-gray-500">（食事）</span>
                    </div>
                    <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setSsk02File(e.target.files?.[0] || null)}
                        disabled={isSsk02Processing}
                        className="h-9 text-sm flex-1 min-w-[200px]"
                    />
                    <Button
                        onClick={handleReconcileSSK02}
                        disabled={!ssk02File || isSsk02Processing || yorisolMealData.length === 0}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSsk02Processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4 mr-1" />}
                        突合
                    </Button>
                </div>

                {/* CKDCSV002（加算） */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-wrap">
                    <div className="flex items-center gap-2 min-w-[120px]">
                        <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium">CKDCSV002</span>
                        <span className="text-xs text-gray-500">（加算）</span>
                    </div>
                    <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCkdFile(e.target.files?.[0] || null)}
                        disabled={isCkdProcessing}
                        className="h-9 text-sm flex-1 min-w-[200px]"
                    />
                    <Button
                        onClick={handleReconcileCKD}
                        disabled={!ckdFile || isCkdProcessing || yorisolAdditionData.length === 0}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isCkdProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4 mr-1" />}
                        突合
                    </Button>
                </div>

                {/* データなし警告 */}
                {yorisolMealData.length === 0 && yorisolAdditionData.length === 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        ⚠️ 突合対象のYorisolデータがありません。業務日誌を確定してください。
                    </p>
                )}
            </div>

            <ReconciliationResultDialog
                open={resultDialogOpen}
                onOpenChange={setResultDialogOpen}
                result={reconciliationResult}
                year={date.getFullYear()}
                month={date.getMonth() + 1}
            />
        </>
    )
}
