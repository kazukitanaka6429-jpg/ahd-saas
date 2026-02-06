'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import { importResidents } from '@/app/actions/import-resident'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function ResidentImportDialog() {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<{ success?: boolean, message?: string, details?: string[] } | null>(null)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setResult(null) // Reset on close
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const file = formData.get('file') as File

        if (!file || file.size === 0) {
            toast.error('ファイルを選択してください')
            return
        }

        setIsLoading(true)
        setResult(null)

        try {
            const res = await importResidents(formData)

            if (res.error) {
                setResult({ success: false, message: res.error, details: res.details })
                toast.error('インポートに失敗しました')
            } else {
                setResult({ success: true, message: res.message, details: res.details })
                toast.success('インポートが完了しました')
                router.refresh()
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        } catch (error) {
            setResult({ success: false, message: '予期せぬエラーが発生しました' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSVインポート
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>利用者データの一括取込</DialogTitle>
                    <DialogDescription>
                        CSVファイルを選択してアップロードしてください。<br />
                        <span className="text-xs text-muted-foreground">
                            必須列: 施設名, 氏名<br />
                            任意列: ID (表示ID), ユニット, 入居日
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="resident-csv-file">CSVファイル</Label>
                        <Input
                            ref={fileInputRef}
                            id="resident-csv-file"
                            name="file"
                            type="file"
                            accept=".csv"
                            disabled={isLoading}
                        />
                    </div>

                    {result && (
                        <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "bg-green-50 border-green-200 text-green-800" : ""}>
                            {result.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4" />}
                            <AlertTitle>{result.success ? '成功' : 'エラー'}</AlertTitle>
                            <AlertDescription>
                                {result.message}
                                {result.details && result.details.length > 0 && (
                                    <div className="mt-2 text-xs max-h-[100px] overflow-y-auto bg-white/50 p-2 rounded border">
                                        <ul className="list-disc pl-4 space-y-1">
                                            {result.details.map((d, i) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? '取込中...' : 'インポート実行'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
