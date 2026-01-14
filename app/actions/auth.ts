'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Staff } from '@/types'
import { protect } from '@/lib/auth-guard'
import { logger } from '@/lib/logger'
import { translateError } from '@/lib/error-translator'

import { getCurrentStaff as getCurrentStaffHelper, getMyStaffIdentities } from '@/lib/auth-helpers'

// Get current authenticated staff
// Logic delegated to lib/auth-helpers
export async function getCurrentStaff(): Promise<Staff | null> {
    // Pass false to suppress redirect, returning null if not found/decided
    return getCurrentStaffHelper(false)
}

export async function switchFacility(staffId: string) {
    try {
        await protect()

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) redirect('/login')

        // Verify ownership
        const { data: staff } = await supabase
            .from('staffs')
            .select('id')
            .eq('id', staffId)
            .eq('auth_user_id', user.id)
            .single()

        if (!staff) {
            throw new Error('Unauthorized')
        }

        const cookieStore = await cookies()
        cookieStore.set('active_staff_id', staffId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        })
    } catch (e) {
        logger.error('switchFacility failed', e)
        // Redirect handled by Next.js primitive (throws), so we must re-throw if it's a redirect
        // But protect() throws regular error.
        // Also redirect() throws NEXT_REDIRECT internal error. We must NOT catch it or rethrow it.
        // Checking if error is digest NEXT_REDIRECT is hard in strict TS without helper.
        // Simplest: If logic is simple, just let redirect happen.
        // But we are inside try/catch.

        // Use checking: isRedirectError is available in 'next/dist/client/components/redirect' but not exposed cleanly in server actions sometimes?
        // Actually, protecting switchFacility which returns void/redirect is tricky with try/catch.
        // Maybe skipping switchFacility is safer or just use protect() at top without try/catch?
        // User asked to wrap in try/catch and log error.
        // Converting to return type is not possible as signature is void (redirect).
        throw e // Rethrow to allow redirect or basic error page
    }

    // Redirect must be outside try/catch if possible, or re-thrown.
    redirect('/')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    const cookieStore = await cookies()
    cookieStore.delete('active_staff_id')

    redirect('/login')
}

export async function getStaffIdentities() {
    try {
        await protect()
        // Use helper from lib
        // Note: Helper returns Staff[] from DB, which matches expected shape mostly.
        // The helper selects * + facilities(name).
        // This function previously selected id, role, facility_id, organization_id, name, facilities(name).
        // Since * includes these, it is compatible.
        return await getMyStaffIdentities()
    } catch (e) {
        logger.error('getStaffIdentities failed', e)
        return []
    }
}
