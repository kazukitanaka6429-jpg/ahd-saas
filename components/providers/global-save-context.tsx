'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

type SaveFn = () => Promise<void | any>
type ValidateFn = () => { isValid: boolean; errors: any[]; warnings: any[] }

interface GlobalSaveContextType {
    registerSaveNode: (id: string, fn: SaveFn) => void
    unregisterSaveNode: (id: string) => void
    registerValidation: (id: string, fn: ValidateFn) => void
    unregisterValidation: (id: string) => void
    triggerGlobalSave: (skipWarnings?: boolean) => Promise<{ success: boolean; warnings?: any[] }>
    isSaving: boolean
    // Shared state for cross-component communication
    sharedState: Record<string, any>
    setSharedState: (key: string, value: any) => void
    getSharedState: <T>(key: string) => T | undefined
}

const GlobalSaveContext = createContext<GlobalSaveContextType | undefined>(undefined)

export function GlobalSaveProvider({ children }: { children: React.ReactNode }) {
    const [saveNodes, setSaveNodes] = useState<Map<string, SaveFn>>(new Map())
    const [validationNodes, setValidationNodes] = useState<Map<string, ValidateFn>>(new Map())
    const [isSaving, setIsSaving] = useState(false)
    const [sharedState, setSharedStateMap] = useState<Record<string, any>>({})

    // Use ref for warning callback to avoid re-renders
    const warningCallbackRef = useRef<((warnings: any[]) => void) | null>(null)

    const registerSaveNode = useCallback((id: string, fn: SaveFn) => {
        setSaveNodes(prev => {
            const next = new Map(prev)
            next.set(id, fn)
            return next
        })
    }, [])

    const unregisterSaveNode = useCallback((id: string) => {
        setSaveNodes(prev => {
            const next = new Map(prev)
            next.delete(id)
            return next
        })
    }, [])

    const registerValidation = useCallback((id: string, fn: ValidateFn) => {
        setValidationNodes(prev => {
            const next = new Map(prev)
            next.set(id, fn)
            return next
        })
    }, [])

    const unregisterValidation = useCallback((id: string) => {
        setValidationNodes(prev => {
            const next = new Map(prev)
            next.delete(id)
            return next
        })
    }, [])

    const setSharedState = useCallback((key: string, value: any) => {
        setSharedStateMap(prev => ({ ...prev, [key]: value }))
    }, [])

    const getSharedState = useCallback(<T,>(key: string): T | undefined => {
        return sharedState[key] as T | undefined
    }, [sharedState])

    const triggerGlobalSave = useCallback(async (skipWarnings = false): Promise<{ success: boolean; warnings?: any[] }> => {
        if (isSaving) return { success: false }

        // Run all validations first (for UI update)
        let allErrors: any[] = []
        let allWarnings: any[] = []

        validationNodes.forEach((validateFn) => {
            const result = validateFn()
            allErrors = [...allErrors, ...result.errors]
            allWarnings = [...allWarnings, ...result.warnings]
        })

        // If there are warnings and we're not skipping them, return warnings for UI to handle
        if (allWarnings.length > 0 && !skipWarnings) {
            return { success: false, warnings: allWarnings }
        }

        // Proceed with save - each node handles its own individual validation
        // エラーがあっても保存を実行（各ノードが個別にバリデーション・保存を管理）
        setIsSaving(true)
        try {
            const promises = Array.from(saveNodes.values()).map(fn => fn())
            const results = await Promise.all(promises)

            // Collect results from nodes that return save stats
            let totalSaved = 0
            let totalFailed = 0
            const failedNames: string[] = []

            results.forEach(result => {
                if (result && typeof result === 'object') {
                    if (result.savedCount !== undefined) totalSaved += result.savedCount
                    if (result.failedCount !== undefined) totalFailed += result.failedCount
                    if (result.failedResidents) failedNames.push(...result.failedResidents)
                }
            })

            // Show detailed toast message
            if (totalSaved > 0 && totalFailed === 0) {
                toast.success(`${totalSaved}件のデータを保存しました`)
            } else if (totalSaved > 0 && totalFailed > 0) {
                toast.warning(`${totalSaved}件保存成功、${totalFailed}件はエラーのため保存できませんでした（${failedNames.join('、')}）`)
            } else if (totalSaved === 0 && totalFailed > 0) {
                toast.error(`${totalFailed}件のエラーがあるため保存できませんでした。修正してください。`)
            } else if (totalSaved === 0 && totalFailed === 0) {
                toast.success('全データを保存しました')
            }

            return { success: totalFailed === 0 }
        } catch (error) {
            console.error("Global save error", error)
            toast.error('一部のデータの保存に失敗しました')
            return { success: false }
        } finally {
            setIsSaving(false)
        }
    }, [saveNodes, validationNodes, isSaving])

    return (
        <GlobalSaveContext.Provider value={{
            registerSaveNode,
            unregisterSaveNode,
            registerValidation,
            unregisterValidation,
            triggerGlobalSave,
            isSaving,
            sharedState,
            setSharedState,
            getSharedState
        }}>
            {children}
        </GlobalSaveContext.Provider>
    )
}

export const useGlobalSave = () => {
    const context = useContext(GlobalSaveContext)
    if (!context) throw new Error('useGlobalSave must be used within GlobalSaveProvider')
    return context
}

