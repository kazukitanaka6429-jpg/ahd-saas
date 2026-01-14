'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
    upsertDocumentHistory,
    getDocumentHistory,
    deleteDocumentHistory,
} from '@/app/actions/resident-documents'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-types'

interface DocumentHistorySectionProps {
    residentId: string
    residentName: string
}

interface DocumentRecord {
    id: string
    document_type: string
    valid_from: string | null
    valid_to: string | null
    is_renewal_completed: boolean
    notes: string | null
    created_at: string
}

export function DocumentHistorySection({ residentId, residentName }: DocumentHistorySectionProps) {
    const [documents, setDocuments] = useState<DocumentRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null)
    const [isPending, startTransition] = useTransition()

    // Form state
    const [formData, setFormData] = useState({
        documentType: '',
        validFrom: '',
        validTo: '',
        isRenewalCompleted: false,
        notes: ''
    })

    const fetchDocuments = async () => {
        setIsLoading(true)
        const result = await getDocumentHistory(residentId)
        if (result.error) {
            toast.error('書類情報の取得に失敗しました')
        } else {
            setDocuments(result.data as DocumentRecord[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchDocuments()
    }, [residentId])

    const resetForm = () => {
        setFormData({
            documentType: '',
            validFrom: '',
            validTo: '',
            isRenewalCompleted: false,
            notes: ''
        })
        setEditingDoc(null)
    }

    const openEditDialog = (doc: DocumentRecord) => {
        setEditingDoc(doc)
        setFormData({
            documentType: doc.document_type,
            validFrom: doc.valid_from || '',
            validTo: doc.valid_to || '',
            isRenewalCompleted: doc.is_renewal_completed,
            notes: doc.notes || ''
        })
        setDialogOpen(true)
    }

    const handleSubmit = () => {
        if (!formData.documentType) {
            toast.error('書類種別を選択してください')
            return
        }

        startTransition(async () => {
            const result = await upsertDocumentHistory({
                id: editingDoc?.id,
                residentId,
                documentType: formData.documentType,
                validFrom: formData.validFrom || null,
                validTo: formData.validTo || null,
                isRenewalCompleted: formData.isRenewalCompleted,
                notes: formData.notes || null
            })

            if (result.error) {
                toast.error('保存に失敗しました', { description: result.error })
            } else {
                toast.success(editingDoc ? '更新しました' : '登録しました')
                setDialogOpen(false)
                resetForm()
                fetchDocuments()
            }
        })
    }

    const handleDelete = (doc: DocumentRecord) => {
        if (!confirm('この書類履歴を削除してもよろしいですか？')) return

        startTransition(async () => {
            const result = await deleteDocumentHistory(doc.id)
            if (result.error) {
                toast.error('削除に失敗しました', { description: result.error })
            } else {
                toast.success('削除しました')
                fetchDocuments()
            }
        })
    }

    const getExpiryStatus = (validTo: string | null) => {
        if (!validTo) return null

        const today = new Date()
        const expiry = new Date(validTo)
        const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil <= 0) {
            return <Badge variant="destructive">期限切れ</Badge>
        } else if (daysUntil <= 30) {
            return <Badge variant="destructive">残り{daysUntil}日</Badge>
        } else if (daysUntil <= 60) {
            return <Badge variant="default" className="bg-orange-500">残り{daysUntil}日</Badge>
        } else if (daysUntil <= 90) {
            return <Badge variant="secondary">残り{daysUntil}日</Badge>
        }
        return null
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            保険・受給者証情報
                        </CardTitle>
                        <CardDescription>
                            {residentName}さんの書類有効期限を管理します
                        </CardDescription>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                書類を追加
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingDoc ? '書類情報を編集' : '書類を追加'}</DialogTitle>
                                <DialogDescription>
                                    保険証や受給者証の有効期間を登録します
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>書類種別 *</Label>
                                    <Select
                                        value={formData.documentType}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, documentType: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>有効期間開始</Label>
                                        <Input
                                            type="date"
                                            value={formData.validFrom}
                                            onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>有効期間終了</Label>
                                        <Input
                                            type="date"
                                            value={formData.validTo}
                                            onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="renewal-completed"
                                        checked={formData.isRenewalCompleted}
                                        onCheckedChange={(checked) =>
                                            setFormData(prev => ({ ...prev, isRenewalCompleted: checked === true }))
                                        }
                                    />
                                    <Label htmlFor="renewal-completed">更新手続き完了</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label>備考</Label>
                                    <Textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="メモや注意事項など"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                    キャンセル
                                </Button>
                                <Button onClick={handleSubmit} disabled={isPending}>
                                    {isPending ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</>
                                    ) : (
                                        '保存'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        書類情報が登録されていません
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>書類種別</TableHead>
                                <TableHead>有効期間</TableHead>
                                <TableHead>ステータス</TableHead>
                                <TableHead>備考</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium">
                                        {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                                    </TableCell>
                                    <TableCell>
                                        {doc.valid_from && format(new Date(doc.valid_from), 'yyyy/M/d', { locale: ja })}
                                        {doc.valid_from && doc.valid_to && ' ~ '}
                                        {doc.valid_to && format(new Date(doc.valid_to), 'yyyy/M/d', { locale: ja })}
                                    </TableCell>
                                    <TableCell>
                                        {doc.is_renewal_completed ? (
                                            <Badge variant="outline" className="text-green-600">更新済</Badge>
                                        ) : (
                                            getExpiryStatus(doc.valid_to)
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                                        {doc.notes}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(doc)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(doc)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
