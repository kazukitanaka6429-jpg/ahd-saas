'use server'

import { cookies } from 'next/headers'

export async function setFacilityCookie(facilityId: string) {
    const cookieStore = await cookies()
    cookieStore.set('selected_facility_id', facilityId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 Days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    })
}
