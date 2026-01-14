'use client'

import { Button } from '@/components/ui/button'
import { Edit, FileText } from 'lucide-react'
import { deleteResident } from '@/app/actions/resident'
import { useState } from 'react'
import { ResidentFormDialog } from './resident-form-dialog'
import { Resident } from '@/types'
import { DeleteButton } from '@/components/common/delete-button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { DocumentHistorySection } from '@/components/residents/document-history-section'

export function ResidentActions({ resident, currentStaff }: { resident: Resident; currentStaff: any }) {
    const [loading, setLoading] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [docOpen, setDocOpen] = useState(false)

    return (
        <div className="flex justify-end gap-2">
            {/* Document History Button */}
            <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="書類管理">
                        <FileText className="h-4 w-4 text-blue-500" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{resident.name} - 書類管理</DialogTitle>
                    </DialogHeader>
                    <DocumentHistorySection
                        residentId={resident.id}
                        residentName={resident.name}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit Button */}
            <ResidentFormDialog
                currentStaff={currentStaff}
                initialData={resident}
                open={editOpen}
                onOpenChange={setEditOpen}
                trigger={
                    <Button variant="ghost" size="icon" disabled={loading}>
                        <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                }
            />

            {/* Delete Button */}
            <DeleteButton
                id={resident.id}
                onDelete={deleteResident}
                iconOnly
                confirmMessage={`${resident.name} を削除してもよろしいですか？\nこの操作は取り消せません。`}
            />
        </div>
    )
}
