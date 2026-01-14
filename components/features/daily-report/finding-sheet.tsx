'use client'

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useTransition } from "react"
import { getFindingComments, addFindingComment, toggleFindingResolved } from "@/app/actions/findings"
import { FindingComment } from "@/types"
import { toast } from "sonner"
import { CheckCircle2, MessageSquare, Send, Loader2, XCircle } from "lucide-react"

interface FindingSheetProps {
    isOpen: boolean
    onClose: () => void
    recordId: string | null
    jsonPath: string | null
    label: string
    recordType?: 'daily' | 'medical' | 'short_stay' | 'medical_v_daily' | 'medical_v_record' | 'resident'
}

export function FindingSheet({ isOpen, onClose, recordId, jsonPath, label, recordType = 'daily' }: FindingSheetProps) {
    const [comments, setComments] = useState<FindingComment[]>([])
    const [newComment, setNewComment] = useState("")
    const [isPending, startTransition] = useTransition()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen && recordId && jsonPath) {
            loadComments()
        }
    }, [isOpen, recordId, jsonPath, recordType])

    const loadComments = async () => {
        if (!recordId || !jsonPath) return
        setIsLoading(true)
        const data = await getFindingComments(recordId, jsonPath, recordType)
        setComments(data)
        setIsLoading(false)
    }

    const handleAddComment = async () => {
        if (!newComment.trim() || !recordId || !jsonPath) return

        startTransition(async () => {
            const result = await addFindingComment(recordId, jsonPath, newComment, recordType)
            if (result.error) {
                toast.error(`コメントの追加に失敗しました: ${result.error}`)
            } else {
                setNewComment("")
                loadComments() // Reload to get new comment with ID
            }
        })
    }

    const handleToggleResolved = async (comment: FindingComment) => {
        startTransition(async () => {
            const result = await toggleFindingResolved(comment.id, comment.is_resolved)
            if (result.error) {
                toast.error("ステータス更新に失敗しました")
            } else {
                // Optimistic update
                setComments(prev => prev.map(c =>
                    c.id === comment.id ? { ...c, is_resolved: !c.is_resolved } : c
                ))
            }
        })
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        指摘・コメント
                    </SheetTitle>
                    <SheetDescription>
                        {label} への指摘事項・連絡事項
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 my-4 pr-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            まだコメントはありません。
                            <br />
                            右クリックメニューからここを開き、指摘を追加できます。
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {comments.map((comment) => (
                                <div key={comment.id} className={`p-3 rounded-lg border ${comment.is_resolved ? 'bg-gray-50 opacity-70' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{comment.author_name}</span>
                                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-6 w-6 p-0 ${comment.is_resolved ? 'text-green-600' : 'text-gray-300 hover:text-green-600'}`}
                                            onClick={() => handleToggleResolved(comment)}
                                            title={comment.is_resolved ? "未解決に戻す" : "解決済みにする"}
                                        >
                                            {comment.is_resolved ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 border-current rounded-full" />}
                                        </Button>
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap text-gray-800">
                                        {comment.content}
                                    </div>
                                    {comment.is_resolved && (
                                        <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> 解決済み
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="mt-auto border-t pt-4">
                    <div className="flex gap-2">
                        <Textarea
                            placeholder="コメントを入力..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    handleAddComment()
                                }
                            }}
                        />
                        <Button
                            className="h-[80px] w-[80px]"
                            onClick={handleAddComment}
                            disabled={isPending || !newComment.trim()}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 text-right">Ctrl + Enter で送信</p>
                </div>
            </SheetContent>
        </Sheet>
    )
}
