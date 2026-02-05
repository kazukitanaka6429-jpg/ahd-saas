"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload } from "lucide-react"
import { importAttendance, importSpotJob, importNursing } from '@/app/actions/audit/import'
import { toast } from "sonner"

export function CsvImportDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState("kintai")

    const [file, setFile] = useState<File | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleImport = () => {
        if (!file) {
            toast.error("ファイルを選択してください")
            return
        }

        const formData = new FormData()
        formData.append('file', file)

        startTransition(async () => {
            let result
            if (activeTab === 'kintai') {
                result = await importAttendance(formData)
            } else if (activeTab === 'spot') {
                result = await importSpotJob(formData)
            } else if (activeTab === 'nursing') {
                result = await importNursing(formData)
            }

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(`インポート成功 (${result?.count}件)`)
                setOpen(false)
                setFile(null)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" /> インポート
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>データインポート</DialogTitle>
                    <DialogDescription>
                        外部システムのデータをインポートして、勤務表に反映させます。
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setFile(null); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="kintai">勤怠</TabsTrigger>
                        <TabsTrigger value="spot">カイテク</TabsTrigger>
                        <TabsTrigger value="nursing">訪問看護</TabsTrigger>
                    </TabsList>

                    <TabsContent value="kintai" className="space-y-4 py-4">
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 mb-4">
                            <strong>勤怠システム (Kintai)</strong><br />
                            ※「氏名」が完全一致するスタッフに自動紐付けされます。
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="kintai-file">CSVファイル</Label>
                            <Input id="kintai-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isPending} />
                        </div>
                    </TabsContent>

                    <TabsContent value="spot" className="space-y-4 py-4">
                        <div className="bg-orange-50 p-3 rounded text-xs text-orange-700 mb-4">
                            <strong>カイテク</strong><br />
                            ※「ワーカー名」を基にスタッフを検索・紐付けします。
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="spot-file">CSVファイル</Label>
                            <Input id="spot-file" type="file" accept=".csv" onChange={handleFileChange} disabled={isPending} />
                        </div>
                    </TabsContent>

                    <TabsContent value="nursing" className="space-y-4 py-4">
                        <div className="bg-pink-50 p-3 rounded text-xs text-pink-700 mb-4">
                            <strong>訪問看護実績 (Excel/CSV)</strong><br />
                            ※以前ご提示のExcelデータ形式に対応しました。
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="nursing-file">ファイル選択</Label>
                            <Input id="nursing-file" type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} disabled={isPending} />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>キャンセル</Button>
                    <Button onClick={handleImport} disabled={!file || isPending}>
                        {isPending ? 'インポート中...' : 'インポート実行'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
