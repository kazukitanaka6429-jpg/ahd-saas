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
        <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-[#Fdfbf9]">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-gray-700 h-12">資格名</TableHead>
                        <TableHead className="font-bold text-gray-700 h-12">医療連携対象</TableHead>
                        <TableHead className="w-[100px] font-bold text-gray-700 h-12 text-center">操作</TableHead>
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
                            <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                <TableCell className="font-medium text-gray-800 h-14">{item.name}</TableCell>
                                <TableCell className="h-14">
                                    {item.is_medical_coord_iv_target && (
                                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                                            対象
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="h-14">
                                    <div className="flex items-center justify-center gap-2">
                                        <QualificationForm
                                            initialData={item}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteButton
                                            id={item.id}
                                            onDelete={deleteQualification}
                                            iconOnly
                                            confirmMessage={`資格「${item.name}」を削除してもよろしいですか？`}
                                            className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
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
