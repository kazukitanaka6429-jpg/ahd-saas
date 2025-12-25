'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { getCurrentStaff } from '@/lib/auth-helpers'

export async function createResident(formData: FormData) {
    const staff = await getCurrentStaff()
    if (!staff) return { error: '権限がありません' }
    const facilityId = staff.facility_id

    const supabase = await createClient()

    const name = formData.get('name') as string
    const startDate = formData.get('start_date') as string
    const status = formData.get('status') as string

    // New Fields
    const directDebitStartDate = formData.get('direct_debit_start_date') as string || null
    const primaryInsurance = formData.get('primary_insurance') as string || null
    const limitApplicationClass = formData.get('limit_application_class') as string || null
    const publicExpense1 = formData.get('public_expense_1') as string || null
    const publicExpense2 = formData.get('public_expense_2') as string || null
    const classification = formData.get('classification') as string || null

    // Checkboxes (sending 'on' if checked, null otherwise)
    const table7 = formData.get('table_7') === 'on'
    const table8 = formData.get('table_8') === 'on'
    const ventilator = formData.get('ventilator') === 'on'
    const severeDisabilityAddition = formData.get('severe_disability_addition') === 'on'
    const sputumSuction = formData.get('sputum_suction') === 'on'

    if (!name || !startDate) {
        return { error: '氏名と入居日は必須です' }
    }

    const { error } = await supabase
        .from('residents')
        .insert({
            facility_id: facilityId,
            name,
            status: status || 'in_facility',
            start_date: startDate,
            direct_debit_start_date: directDebitStartDate,
            primary_insurance: primaryInsurance,
            limit_application_class: limitApplicationClass,
            public_expense_1: publicExpense1,
            public_expense_2: publicExpense2,
            classification: classification,
            table_7: table7,
            table_8: table8,
            ventilator: ventilator,
            severe_disability_addition: severeDisabilityAddition,
            sputum_suction: sputumSuction
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/residents')
    return { success: true }
}

export async function deleteResident(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/residents')
    return { success: true }
}
