'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { resetDailyRecords } from '@/app/actions/daily-record'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ResetDailyReportButtonProps {
    date: string
    facilityId: string
}

export function ResetDailyReportButton({ date, facilityId }: ResetDailyReportButtonProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const displayDate = format(new Date(date), 'yyyy年M月d日', { locale: ja })

    const handleReset = () => {
        startTransition(async () => {
            const result = await resetDailyRecords(date, facilityId)

            if (result.error) {
                toast.error('リセットに失敗しました', { description: result.error })
            } else {
                toast.success('データをリセットしました', {
                    description: `${displayDate}の業務日誌データを削除しました`
                })
                setOpen(false)
                router.refresh()
            }
        })
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-1" />
                    この日をリセット
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600">本当にリセットしますか？</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-muted-foreground text-sm">
                            <span className="block">
                                <strong>{displayDate}</strong> の業務日誌データがすべて削除されます。
                            </span>
                            <span className="block text-gray-500">
                                削除対象: 利用者の日次記録、出勤シフト、ショートステイ記録
                            </span>
                            <span className="block font-semibold text-red-600">
                                この操作は取り消せません。
                            </span>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleReset}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isPending ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />処理中...</>
                        ) : (
                            'リセットする'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
