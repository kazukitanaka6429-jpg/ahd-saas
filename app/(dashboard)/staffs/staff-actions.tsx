'use client'

import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import { deleteStaff } from '@/app/actions/staff'
import { useState } from 'react'
import { StaffFormDialog } from './staff-form-dialog'
import { DeleteButton } from '@/components/common/delete-button'

export function StaffActions({ staff, currentStaff }: { staff: any; currentStaff: any }) {
    const [loading, setLoading] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    // Delete logic moved to DeleteButton


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

            <DeleteButton
                id={staff.id}
                onDelete={deleteStaff}
                iconOnly
                confirmMessage={`${staff.name} を削除してもよろしいですか？\nこの操作は取り消せません。`}
            />
        </div>
    )
}
