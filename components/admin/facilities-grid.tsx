'use client'

import { Facility } from '@/types'
import { deleteFacility } from '@/app/actions/facility'
import { FacilityForm } from './facility-form'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { DeleteButton } from '@/components/common/delete-button'

export function FacilitiesGrid({ data }: { data: Facility[] }) {
    // Delete logic moved to DeleteButton


    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>施設名</TableHead>
                        <TableHead>施設コード</TableHead>
                        <TableHead>事業所番号</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                データがありません
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.code}</TableCell>
                                <TableCell>{item.provider_number || '-'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <FacilityForm
                                            initialData={item}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteButton
                                            id={item.id}
                                            onDelete={deleteFacility}
                                            iconOnly
                                            confirmMessage={`施設「${item.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`}
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
