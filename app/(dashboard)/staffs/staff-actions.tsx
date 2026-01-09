'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Loader2 } from 'lucide-react'
import { deleteStaff } from '@/app/actions/staff'
import { toast } from "sonner"
import { useState } from 'react'
import { StaffFormDialog } from './staff-form-dialog'

export function StaffActions({ staff, currentStaff }: { staff: any; currentStaff: any }) {
    const [loading, setLoading] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const handleDelete = async () => {
        if (!confirm(`${staff.name} を削除してもよろしいですか？`)) return

        setLoading(true)
        const result = await deleteStaff(staff.id)
        setLoading(false)

        if (result.error) {
            toast.error('削除エラー: ' + result.error)
        } else {
            toast.success(`${staff.name} を削除しました。`)
        }
    }

    return (
        <div className="flex justify-end gap-2">
            <StaffFormDialog
                currentStaff={currentStaff}
                initialData={staff}
                open={editOpen}
                onOpenChange={setEditOpen}
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
