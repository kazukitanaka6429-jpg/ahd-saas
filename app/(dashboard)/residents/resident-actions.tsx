'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Loader2 } from 'lucide-react'
import { deleteResident } from './actions'
import { toast } from "sonner"
import { useState } from 'react'

export function ResidentActions({ id, name }: { id: string; name: string }) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`${name} を削除してもよろしいですか？`)) return

        setLoading(true)
        const result = await deleteResident(id)
        setLoading(false)

        if (result.error) {
            toast.error('削除エラー: ' + result.error)
        } else {
            toast.success(`${name} を削除しました。`)
        }
    }

    return (
        <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" disabled={loading}>
                <Edit className="h-4 w-4 text-gray-500" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                ) : (
                    <Trash2 className="h-4 w-4 text-red-500" />
                )}
            </Button>
        </div>
    )
}
