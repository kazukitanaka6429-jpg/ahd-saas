'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { toast } from 'sonner'

type SaveFn = () => Promise<void | any>

interface GlobalSaveContextType {
    registerSaveNode: (id: string, fn: SaveFn) => void
    unregisterSaveNode: (id: string) => void
    triggerGlobalSave: () => Promise<void>
    isSaving: boolean
}

const GlobalSaveContext = createContext<GlobalSaveContextType | undefined>(undefined)

export function GlobalSaveProvider({ children }: { children: React.ReactNode }) {
    const [saveNodes, setSaveNodes] = useState<Map<string, SaveFn>>(new Map())
    const [isSaving, setIsSaving] = useState(false)

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

    const triggerGlobalSave = useCallback(async () => {
        if (isSaving) return
        setIsSaving(true)
        try {
            const promises = Array.from(saveNodes.values()).map(fn => fn())
            await Promise.all(promises)
            toast.success('全データを保存しました')
        } catch (error) {
            console.error("Global save error", error)
            toast.error('一部のデータの保存に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }, [saveNodes, isSaving])

    return (
        <GlobalSaveContext.Provider value={{ registerSaveNode, unregisterSaveNode, triggerGlobalSave, isSaving }}>
            {children}
        </GlobalSaveContext.Provider>
    )
}

export const useGlobalSave = () => {
    const context = useContext(GlobalSaveContext)
    if (!context) throw new Error('useGlobalSave must be used within GlobalSaveProvider')
    return context
}
