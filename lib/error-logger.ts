import { toast } from "sonner"

export function logError(error: unknown, context?: string) {
    console.error("Error captured:", error)

    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました"
    const stackTrace = error instanceof Error ? error.stack : JSON.stringify(error, null, 2)

    const fullLog = `
context: ${context || "N/A"}
message: ${errorMessage}
stack:
${stackTrace}
  `.trim()

    toast.error("エラーが発生しました", {
        description: errorMessage,
        duration: 10000,
        action: {
            label: "エラーをコピー",
            onClick: () => {
                navigator.clipboard.writeText(fullLog)
                toast.success("エラー詳細をコピーしました")
            },
        },
    })
}
