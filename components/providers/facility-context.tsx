'use client'

import { createContext, useContext, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Staff, Facility } from '@/types'
import { toast } from 'sonner'

import { setFacilityCookie } from '@/app/actions/facility-cookie'

type FacilityContextType = {
    currentFacility: Facility | null
    accessibleFacilities: Facility[]
    isLoading: boolean
    switchFacility: (facilityId: string) => void
    isGlobalAdmin: boolean
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined)

export function FacilityProvider({
    children,
    initialStaff,
    initialFacilityId
}: {
    children: React.ReactNode,
    initialStaff: Staff | null,
    initialFacilityId?: string
}) {
    const [currentFacility, setCurrentFacility] = useState<Facility | null>(null)
    const [accessibleFacilities, setAccessibleFacilities] = useState<Facility[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const supabase = createClient()

    // Determine if user is a "Global Admin" (Organization Admin)
    const isGlobalAdmin = initialStaff?.role === 'admin'

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

                if (urlFacilityId) {
                    selected = facilities.find(f => f.id === urlFacilityId)
                }
                // 2. Cookie / Prop Persistence
                else if (initialFacilityId) {
                    selected = facilities.find(f => f.id === initialFacilityId)
                }

                // 3. Fallback (First available)
                let needsUrlUpdate = false
                if (!selected && facilities.length > 0) {
                    selected = facilities[0]
                    needsUrlUpdate = true
                }

                setCurrentFacility(selected || null)

                // If we defaulted to 0 or used cookie, but URL has nothing, we might want to sync URL?
                // Actually, if we use cookies, we don't *strictly* need URL param everywhere if the cookie holds truth.
                // But for shareable links, URL param is good.
                if (selected && !urlFacilityId && isGlobalAdmin) {
                    // Optionally sync URL, but doing so might trigger replace which we want to avoid if not needed.
                    // Let's rely on Cookie primarily.
                }

            } catch (error) {
                console.error('Failed to load facilities', error)
                toast.error('施設情報の取得に失敗しました')
            } finally {
                setIsLoading(false)
            }
        }

        fetchFacilities()
    }, [initialStaff, isGlobalAdmin, searchParams, supabase, initialFacilityId])

    const switchFacility = (facilityId: string) => {
        const target = accessibleFacilities.find(f => f.id === facilityId)
        if (!target) return

        setCurrentFacility(target)

        // Persist to Cookie
        setFacilityCookie(facilityId)

        // Persist to URL (still useful for deep linking)
        const params = new URLSearchParams(searchParams.toString())
        params.set('facility_id', facilityId)

        startTransition(() => {
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
