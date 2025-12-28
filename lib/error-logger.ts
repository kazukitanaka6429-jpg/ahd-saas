import { toast } from "sonner"

export function logError(error: unknown, context?: string) {
    console.error("Error captured:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    const stackTrace = error instanceof Error ? error.stack : JSON.stringify(error, null, 2)

    const fullLog = `
context: ${context || "N/A"}
message: ${errorMessage}
stack:
${stackTrace}
  `.trim()

    toast.error("An error occurred", {
        description: errorMessage,
        duration: 10000,
        action: {
            label: "Copy Error",
            onClick: () => {
                navigator.clipboard.writeText(fullLog)
                toast.success("Error details copied to clipboard")
            },
        },
    })
}
