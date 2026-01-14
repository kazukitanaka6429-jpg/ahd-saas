'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DeleteButtonProps {
    id: string
    onDelete: (id: string) => Promise<{ success?: boolean; error?: string }>
    label?: string // Optional label (e.g., "削除")
    confirmMessage?: string
    iconOnly?: boolean
    className?: string
}

export function DeleteButton({
    id,
    onDelete,
    label,
    confirmMessage = '本当に削除しますか？\nこの操作は取り消せません。',
    iconOnly = false,
    className
}: DeleteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm(confirmMessage)) return

        setIsDeleting(true)
        try {
            const res = await onDelete(id)
            if (res.error) {
                alert(res.error)
            } else {
                // Success
                // Router refresh is usually sufficient if Server Action revalidates, 
                // but client side refresh ensures UI sync.
                router.refresh()
            }
        } catch (e) {
            alert('予期せぬエラーが発生しました')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size={iconOnly ? "icon" : "sm"}
            onClick={handleDelete}
            disabled={isDeleting}
            className={`text-gray-400 hover:text-red-600 hover:bg-red-50 ${className}`}
            title="削除"
        >
            {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="h-4 w-4" />
            )}
            {!iconOnly && label && <span className="ml-2">{label}</span>}
        </Button>
    )
}
