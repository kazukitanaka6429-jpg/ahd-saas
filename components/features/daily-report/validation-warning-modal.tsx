'use client'

import React from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { ValidationWarning } from '@/types'

interface ValidationWarningModalProps {
    isOpen: boolean
    warnings: ValidationWarning[]
    onCancel: () => void
    onConfirm: () => void
}

export function ValidationWarningModal({
    isOpen,
    warnings,
    onCancel,
    onConfirm
}: ValidationWarningModalProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open: boolean) => !open && onCancel()}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="w-5 h-5" />
                        確認が必要な項目があります
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3 mt-4">
                            <p className="text-gray-700">
                                以下の項目について確認してください。問題がなければ「無視して保存」を選択できます。
                            </p>
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 max-h-60 overflow-y-auto">
                                <ul className="space-y-2">
                                    {warnings.map((warning, index) => (
                                        <li key={warning.id} className="flex items-start gap-2 text-sm">
                                            <span className="text-orange-500 font-bold shrink-0">{index + 1}.</span>
                                            <div>
                                                <span className="font-bold text-gray-800">{warning.residentName}</span>
                                                <span className="text-gray-600">: {warning.message}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel} className="font-bold">
                        修正する
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-orange-500 hover:bg-orange-600 font-bold"
                    >
                        無視して保存
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
