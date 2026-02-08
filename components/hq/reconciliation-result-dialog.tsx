'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react'
import type { ReconciliationResult, ReconciliationItem } from '@/app/actions/hq/reconcile-billing-csv'

interface ReconciliationResultDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    result: ReconciliationResult | null
    year: number
    month: number
}

export function ReconciliationResultDialog({
    open,
    onOpenChange,
    result,
    year,
    month
}: ReconciliationResultDialogProps) {
    if (!result) return null

    const mismatchItems = result.items.filter(i => i.status === 'mismatch')
    const noCsvItems = result.items.filter(i => i.status === 'no_csv_data')

    const handleExportCsv = () => {
        // CSVエクスポート
        const headers = ['利用者ID', '利用者名', '項目', 'Yorisol値', 'CSV値', 'ステータス']
        const rows = result.items.map(item => [
            item.residentId,
            item.residentName,
            item.itemType,
            item.yorisolValue.toString(),
            item.csvValue.toString(),
            item.status === 'match' ? '一致' : item.status === 'mismatch' ? '不一致' : 'CSVデータなし'
        ])

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `突合結果_${result.csvType}_${year}${String(month).padStart(2, '0')}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        突合結果 - {result.csvType}
                        <Badge variant="outline">{year}年{month}月</Badge>
                    </DialogTitle>
                </DialogHeader>

                {!result.success ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-md">
                        エラー: {result.error}
                    </div>
                ) : (
                    <>
                        {/* サマリー */}
                        <div className="grid grid-cols-3 gap-4 py-4">
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div>
                                    <div className="text-2xl font-bold text-green-700">{result.matchCount}</div>
                                    <div className="text-xs text-green-600">一致</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <div>
                                    <div className="text-2xl font-bold text-red-700">{result.mismatchCount}</div>
                                    <div className="text-xs text-red-600">不一致</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                <div>
                                    <div className="text-2xl font-bold text-yellow-700">{result.noCsvDataCount}</div>
                                    <div className="text-xs text-yellow-600">CSVなし</div>
                                </div>
                            </div>
                        </div>

                        {/* 不一致詳細 */}
                        {mismatchItems.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-bold text-red-700 flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    不一致詳細
                                </h3>
                                <ScrollArea className="h-[200px] border rounded-md">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left">利用者</th>
                                                <th className="p-2 text-left">項目</th>
                                                <th className="p-2 text-right">Yorisol</th>
                                                <th className="p-2 text-right">CSV</th>
                                                <th className="p-2 text-right">差分</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mismatchItems.map((item, idx) => (
                                                <tr key={idx} className="border-b hover:bg-red-50">
                                                    <td className="p-2">{item.residentName}</td>
                                                    <td className="p-2">{item.itemType}</td>
                                                    <td className="p-2 text-right font-mono">{item.yorisolValue}</td>
                                                    <td className="p-2 text-right font-mono">{item.csvValue}</td>
                                                    <td className="p-2 text-right font-mono text-red-600">
                                                        {item.yorisolValue - item.csvValue > 0 ? '+' : ''}
                                                        {item.yorisolValue - item.csvValue}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </div>
                        )}

                        {/* CSVデータなし */}
                        {noCsvItems.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-bold text-yellow-700 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    CSVにデータなし（Yorisolに値あり）
                                </h3>
                                <ScrollArea className="h-[100px] border rounded-md">
                                    <div className="p-2 text-sm text-gray-600">
                                        {noCsvItems
                                            .filter(i => i.yorisolValue > 0)
                                            .map((item, idx) => (
                                                <span key={idx} className="inline-block bg-yellow-100 px-2 py-1 rounded mr-2 mb-1">
                                                    {item.residentName} / {item.itemType}: {item.yorisolValue}
                                                </span>
                                            ))}
                                        {noCsvItems.filter(i => i.yorisolValue > 0).length === 0 && (
                                            <span className="text-gray-400">該当なし（両方0のため問題なし）</span>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={handleExportCsv} disabled={!result.success}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV出力
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
