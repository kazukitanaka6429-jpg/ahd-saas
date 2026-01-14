export type ActionResponse<T = void> = {
    success: boolean
    data?: T
    error?: string
}

export function successResponse<T>(data?: T): ActionResponse<T> {
    return { success: true, data }
}

export function errorResponse(message: string): ActionResponse<never> {
    return { success: false, error: message }
}
