'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Loader2 } from 'lucide-react'
import { deleteFacility } from '@/app/actions/facility'
import { toast } from "sonner"
import { useState } from 'react'
import { FacilityFormDialog } from './facility-form-dialog'
import { Facility } from '@/types'

export function FacilityActions({ facility }: { facility: Facility }) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`${facility.name} を削除してもよろしいですか？`)) return

        setLoading(true)
        const result = await deleteFacility(facility.id)
        setLoading(false)

        if (result.error) {
            toast.error('削除エラー: ' + result.error)
        } else {
            toast.success(`${facility.name} を削除しました。`)
        }
    }

    return (
        <div className="flex justify-end gap-2">
            <FacilityFormDialog
                initialData={facility}
                trigger={
                    <Button variant="ghost" size="icon" disabled={loading}>
                        <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                }
            />

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
