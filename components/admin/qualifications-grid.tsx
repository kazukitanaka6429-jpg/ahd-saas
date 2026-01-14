'use client'

import { Qualification } from '@/types'
import { deleteQualification } from '@/app/actions/admin/qualifications'
import { QualificationForm } from './qualification-form'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Pencil } from 'lucide-react'
import { DeleteButton } from '@/components/common/delete-button'

export function QualificationsGrid({ data }: { data: Qualification[] }) {

    // handleDelete logic moved to DeleteButton component

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>資格名</TableHead>
                        <TableHead>医療連携対象</TableHead>
                        <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                データがありません
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    {item.is_medical_coord_iv_target && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            対象
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <QualificationForm
                                            initialData={item}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteButton
                                            id={item.id}
                                            onDelete={deleteQualification}
                                            iconOnly
                                            confirmMessage={`資格「${item.name}」を削除してもよろしいですか？`}
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
