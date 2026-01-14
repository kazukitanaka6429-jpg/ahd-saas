'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Copy, Check } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// Global Error components must include html and body tags
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const [copied, setCopied] = useState(false)
    const [showDebug, setShowDebug] = useState(false)

    useEffect(() => {
        // Log to console as well
        console.error('Global Error caught:', error)
        // Send to Sentry
        Sentry.captureException(error)
    }, [error])

    const errorInfo = {
        name: error.name,
        message: error.message,
        digest: error.digest,
        stack: error.stack,
    }

    const copyToClipboard = () => {
        const text = JSON.stringify(errorInfo, null, 2)
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="w-full max-w-md space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="rounded-full bg-red-100 p-3">
                                <AlertCircle className="h-10 w-10 text-red-600" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                エラーが発生しました
                            </h1>
                            <p className="text-gray-500">
                                予期せぬエラーが発生しました。時間をおいて再読み込みするか、管理者にお問い合わせください。
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Button
                                onClick={() => reset()}
                                className="w-full sm:w-auto"
                            >
                                再読み込み
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/'}
                                className="w-full sm:w-auto"
                            >
                                トップへ戻る
                            </Button>
                        </div>

                        <div className="mt-8 border-t pt-6 text-left">
                            <button
                                onClick={() => setShowDebug(!showDebug)}
                                className="text-xs text-gray-400 hover:text-gray-600 mb-2 underline decoration-dotted"
                            >
                                {showDebug ? 'デバッグ情報を隠す' : '開発者用デバッグ情報を表示'}
                            </button>

                            {showDebug && (
                                <div className="relative rounded-lg border bg-gray-900 p-4 text-xs font-mono text-gray-100 shadow-sm overflow-hidden">
                                    <div className="absolute right-2 top-2">
                                        <button
                                            onClick={copyToClipboard}
                                            className="rounded p-1.5 hover:bg-gray-700 transition-colors"
                                            title="エラー情報をコピー"
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4 text-green-400" />
                                            ) : (
                                                <Copy className="h-4 w-4 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="max-h-[300px] overflow-auto whitespace-pre-wrap pr-8">
                                        <p className="font-bold text-red-400 mb-2">{error.name}: {error.message}</p>
                                        {error.digest && <p className="text-gray-500 mb-2">Digest: {error.digest}</p>}
                                        <div className="opacity-70">
                                            {error.stack || 'No stack trace available'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </body>
        </html>
    )
}
