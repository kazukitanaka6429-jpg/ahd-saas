'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function switchFacility(staffId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verify ownership
    const { data: staff } = await supabase
        .from('staffs')
        .select('id')
        .eq('id', staffId)
        .eq('auth_user_id', user.id)
        .single()

    if (!staff) {
        throw new Error('Unauthorized') // Or return error object
    }

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('active_staff_id', staffId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    redirect('/')
}
