'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createFacility(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const code = formData.get('code') as string

    if (!name || !code) {
        return { error: '施設名と施設コードは必須です' }
    }

    const { error } = await supabase
        .from('facilities')
        .insert({ name, code })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/facilities')
    return { success: true }
}

export async function deleteFacility(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/facilities')
    return { success: true }
}
