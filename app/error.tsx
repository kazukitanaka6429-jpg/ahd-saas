'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Copy, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    const copyErrorDetails = () => {
        const errorLog = `
Error: ${error.message}
Digest: ${error.digest || 'N/A'}
Stack:
${error.stack}
    `.trim()

        navigator.clipboard.writeText(errorLog)
        toast.success('Error details copied to clipboard')
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <CardTitle>Something went wrong!</CardTitle>
                    </div>
                    <CardDescription>
                        An unexpected error has occurred. Please copy the error details below and share them with the support team.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-50 overflow-auto max-h-[300px] whitespace-pre-wrap">
                        {error.message}
                        {error.stack && (
                            <>
                                <div className="my-2 border-t border-slate-800" />
                                <div className="text-slate-400">{error.stack}</div>
                            </>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-4">
                    <Button variant="outline" onClick={copyErrorDetails} className="flex-1">
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Error
                    </Button>
                    <Button onClick={() => reset()} className="flex-1">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
