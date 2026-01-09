'use client'

import { Button } from '@/components/ui/button'
import { Link2, Loader2, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { generateInviteLink } from '@/app/actions/staff'

interface InviteLinkButtonProps {
    staffId: string
    staffName: string
}

export function InviteLinkButton({ staffId, staffName }: InviteLinkButtonProps) {
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleClick = async () => {
        try {
            setLoading(true)

            const result = await generateInviteLink(staffId)

            if (result.error) {
                toast.error(result.error)
                return
            }

            if (result.success && result.url) {
                // クリップボードにコピー
                await navigator.clipboard.writeText(result.url)
                setCopied(true)
                toast.success(`${staffName} さんの招待リンクをコピーしました`, {
                    description: 'LINEやSlackで本人に共有してください'
                })

                // 2秒後にアイコンを戻す
                setTimeout(() => setCopied(false), 2000)
            }
        } catch (error) {
            console.error(error)
            toast.error('予期せぬエラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleClick}
            disabled={loading}
        >
            {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
                <Link2 className="h-3.5 w-3.5" />
            )}
            {copied ? 'コピー済み' : '招待'}
        </Button>
    )
}
