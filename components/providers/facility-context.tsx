'use client'

import { createContext, useContext, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Staff, Facility } from '@/types'
import { toast } from 'sonner'

type FacilityContextType = {
    currentFacility: Facility | null
    accessibleFacilities: Facility[]
    isLoading: boolean
    switchFacility: (facilityId: string) => void
    isGlobalAdmin: boolean
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined)

export function FacilityProvider({ children, initialStaff }: { children: React.ReactNode, initialStaff: Staff | null }) {
    const [currentFacility, setCurrentFacility] = useState<Facility | null>(null)
    const [accessibleFacilities, setAccessibleFacilities] = useState<Facility[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const supabase = createClient()

    // Determine if user is a "Global Admin" (Organization Admin)
    const isGlobalAdmin = initialStaff?.role === 'admin' && initialStaff?.facility_id === null

    useEffect(() => {
        const fetchFacilities = async () => {
            if (!initialStaff) {
                setIsLoading(false)
                return
            }

            try {
                let facilities: Facility[] = []

                if (isGlobalAdmin) {
                    // Admin: Fetch all facilities in organization
                    const { data, error } = await supabase
                        .from('facilities')
                        .select('*')
                        .eq('organization_id', initialStaff.organization_id)
                        .order('name')

                    if (error) throw error
                    facilities = (data || []) as Facility[]
                } else {
                    // Staff: Fetch their own facility
                    if (initialStaff.facility_id) {
                        const { data, error } = await supabase
                            .from('facilities')
                            .select('*')
                            .eq('id', initialStaff.facility_id)
                            .single()

                        if (error) throw error
                        facilities = data ? [data as Facility] : []
                    }
                }

                setAccessibleFacilities(facilities)

                // Determine Initial Selection
                // 1. URL Query Parameter
                const urlFacilityId = searchParams.get('facility_id')
                let selected: Facility | undefined
                let needsUrlUpdate = false

                if (urlFacilityId) {
                    selected = facilities.find(f => f.id === urlFacilityId)
                }

                // 2. Local Storage / Cookie (Optional - simplified to logic for now)

                // 3. Fallback (First available) - also update URL for server-side sync
                if (!selected && facilities.length > 0) {
                    selected = facilities[0]
                    needsUrlUpdate = true // Need to sync URL with default selection
                }

                setCurrentFacility(selected || null)

                // If we selected a default and URL doesn't have it, update URL for server sync
                if (needsUrlUpdate && selected && isGlobalAdmin) {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('facility_id', selected.id)
                    router.replace(`${pathname}?${params.toString()}`)
                }

            } catch (error) {
                console.error('Failed to load facilities', error)
                toast.error('施設情報の取得に失敗しました')
            } finally {
                setIsLoading(false)
            }
        }

        fetchFacilities()
    }, [initialStaff, isGlobalAdmin, searchParams, supabase, router, pathname])

    const switchFacility = (facilityId: string) => {
        const target = accessibleFacilities.find(f => f.id === facilityId)
        if (!target) return

        setCurrentFacility(target)

        // Persist to URL
        const params = new URLSearchParams(searchParams.toString())
        params.set('facility_id', facilityId)

        startTransition(() => {
            // Replace URL without full reload, but let Next.js re-render page components based on searchParams
            router.replace(`${pathname}?${params.toString()}`)
            toast.message(`${target.name} に切り替えました`)
        })
    }

    return (
        <FacilityContext.Provider value={{
            currentFacility,
            accessibleFacilities,
            isLoading,
            switchFacility,
            isGlobalAdmin
        }}>
            {children}
        </FacilityContext.Provider>
    )
}

export const useFacility = () => {
    const context = useContext(FacilityContext)
    if (context === undefined) {
        throw new Error('useFacility must be used within a FacilityProvider')
    }
    return context
}
