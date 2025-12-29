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

        // Run all validations first
        let allErrors: any[] = []
        let allWarnings: any[] = []

        validationNodes.forEach((validateFn) => {
            const result = validateFn()
            allErrors = [...allErrors, ...result.errors]
            allWarnings = [...allWarnings, ...result.warnings]
        })

        // If there are blocking errors, don't save
        if (allErrors.length > 0) {
            toast.error(`${allErrors.length}件のエラーがあります。修正してください。`)
            return { success: false }
        }

        // If there are warnings and we're not skipping them, return warnings for UI to handle
        if (allWarnings.length > 0 && !skipWarnings) {
            return { success: false, warnings: allWarnings }
        }

        // All validations passed (or warnings skipped), proceed with save
        setIsSaving(true)
        try {
            const promises = Array.from(saveNodes.values()).map(fn => fn())
            await Promise.all(promises)
            toast.success('全データを保存しました')
            return { success: true }
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

