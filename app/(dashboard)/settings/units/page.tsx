'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Pencil, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { getUnits, upsertUnit, deleteUnit, Unit } from '@/app/actions/units'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function UnitSettingsPage() {
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
    const [formData, setFormData] = useState({ name: '', display_order: '0' })
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    useEffect(() => {
        fetchUnits()
    }, [])

    const fetchUnits = async () => {
        setLoading(true)
        const result = await getUnits()
        if (result.error) {
            toast.error(result.error)
        } else {
            setUnits(result.data || [])
        }
        setLoading(false)
    }

    const handleOpenDialog = (unit?: Unit) => {
        if (unit) {
            setEditingUnit(unit)
            setFormData({ name: unit.name, display_order: unit.display_order.toString() })
        } else {
            setEditingUnit(null)
            setFormData({ name: '', display_order: (units.length * 10).toString() })
        }
        setIsDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const data = new FormData()
            if (editingUnit) data.append('id', editingUnit.id)
            data.append('name', formData.name)
            data.append('display_order', formData.display_order)

            const result = await upsertUnit(null, data)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.message)
                setIsDialogOpen(false)
                fetchUnits()
                router.refresh()
            }
        } catch (error) {
            toast.error('予期せぬエラーが発生しました')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？利用者が紐付いている場合は削除できません。')) return

        const data = new FormData()
        data.append('id', id)
        const result = await deleteUnit(null, data)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
            fetchUnits()
            router.refresh()
        }
    }

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">ユニット管理</h2>
                    <p className="text-muted-foreground">
                        施設内のユニット（フロア、棟など）を設定します。
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> 新規ユニット
                </Button>
            </div>

            {units.length === 0 && (
                <Alert className="bg-blue-50">
                    <AlertTitle>ユニット未設定</AlertTitle>
                    <AlertDescription>
                        ユニットが設定されていません。ユニットを登録すると、業務日誌や医療連携画面でタブ切り替えが可能になります。
                        ユニット管理を利用しない場合は、このまま（設定なし）でご利用ください。
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">表示順</TableHead>
                                <TableHead>ユニット名</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {units.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        データがありません
                                    </TableCell>
                                </TableRow>
                            ) : (
                                units.map((unit) => (
                                    <TableRow key={unit.id}>
                                        <TableCell>{unit.display_order}</TableCell>
                                        <TableCell className="font-bold">{unit.name}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(unit)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(unit.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUnit ? 'ユニット編集' : '新規ユニット登録'}</DialogTitle>
                        <DialogDescription>
                            ユニット名と表示順を入力してください。
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">ユニット名</Label>
                                <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="例: 1F さくらユニット" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="display_order">表示順 (数値)</Label>
                                <Input id="display_order" type="number" value={formData.display_order} onChange={e => setFormData({ ...formData, display_order: e.target.value })} required />
                                <p className="text-xs text-muted-foreground">数値が小さい順に左から表示されます</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                保存
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
