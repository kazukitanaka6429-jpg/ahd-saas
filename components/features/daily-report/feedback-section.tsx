'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, CheckCircle2, Circle, Pencil, Trash2, X, Check } from 'lucide-react'
import { postFeedback, toggleFeedbackResolved, updateFeedback, deleteFeedback } from '@/app/(dashboard)/daily-reports/actions'
import { FeedbackComment } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function FeedbackSection({
    comments,
    date,
    currentStaffId,
    currentUserRole
}: {
    comments: FeedbackComment[],
    date: string,
    currentStaffId: string,
    currentUserRole: string
}) {
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        await postFeedback(formData)
        setLoading(false)

        // Reset form
        const form = document.getElementById('feedback-form') as HTMLFormElement
        form?.reset()
    }

    const startEdit = (comment: FeedbackComment) => {
        setEditingId(comment.id)
        setEditContent(comment.content)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditContent('')
    }

    const handleUpdate = async (id: string) => {
        if (!editContent.trim()) return

        setLoading(true)
        const res = await updateFeedback(id, editContent)
        setLoading(false)

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success('更新しました')
            setEditingId(null)
            setEditContent('')
        }
    }

    const handleDelete = async (id: string) => {
        setLoading(true)
        const res = await deleteFeedback(id)
        setLoading(false)

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success('削除しました')
        }
    }

    return (
        <div className="border rounded-md bg-gray-50 flex flex-col h-[500px]">
            <div className="p-4 border-b bg-white rounded-t-md">
                <h3 className="font-bold flex items-center gap-2">
                    <span className="text-primary">💬</span> 業務連絡・是正チャット
                </h3>
                <p className="text-xs text-muted-foreground">
                    この日の業務に関する指摘や連絡事項を共有しましょう。
                </p>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {comments.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-10">
                            まだコメントはありません。
                        </div>
                    )}
                    {comments.map((comment) => (
                        <div key={comment.id} className={`flex gap-3 ${comment.is_resolved ? 'opacity-60' : ''}`}>
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                    {comment.author_name.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-700">{comment.author_name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">
                                            {format(new Date(comment.created_at), 'MM/dd HH:mm', { locale: ja })}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex gap-1">
                                            {/* Edit: Only Author */}
                                            {comment.created_by === currentStaffId && !editingId && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(comment)}>
                                                    <Pencil className="h-3 w-3 text-gray-500" />
                                                </Button>
                                            )}

                                            {/* Delete: Only Admin */}
                                            {currentUserRole === 'admin' && !editingId && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                            <Trash2 className="h-3 w-3 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>コメントを削除しますか？</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                この操作は取り消せません。
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(comment.id)} className="bg-red-600 hover:bg-red-700">
                                                                削除
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {editingId === comment.id ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="min-h-[80px] bg-white text-sm"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={cancelEdit} className="h-7 text-xs">
                                                <X className="h-3 w-3 mr-1" /> キャンセル
                                            </Button>
                                            <Button size="sm" onClick={() => handleUpdate(comment.id)} disabled={loading} className="h-7 text-xs bg-green-600 hover:bg-green-700">
                                                <Check className="h-3 w-3 mr-1" /> 保存
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-3 rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-sm text-sm border group relative">
                                        {comment.content}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => toggleFeedbackResolved(comment.id, comment.is_resolved)}
                                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-green-600 transition-colors"
                                    >
                                        {comment.is_resolved ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span className="text-green-600">解決済み</span>
                                            </>
                                        ) : (
                                            <>
                                                <Circle className="h-3 w-3" />
                                                <span>未解決</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="p-4 bg-white border-t rounded-b-md">
                <form id="feedback-form" action={handleSubmit} className="flex gap-2">
                    <input type="hidden" name="date" value={date} />
                    <Textarea
                        name="content"
                        placeholder="指摘や連絡を入力..."
                        className="min-h-[60px] resize-none text-sm"
                        required
                    />
                    <Button type="submit" size="icon" disabled={loading} className="h-[60px] w-[60px]">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </div>
    )
}
