'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateRestaurantSettingsAction(restaurantId: string, updates: any) {
    const supabase = await createAdminClient()

    // Validate that we only update allowed fields
    const safeUpdates = {
        name: updates.name,
        contact_phone: updates.contact_phone,
        contact_email: updates.contact_email,
        address: updates.address,
        logo_url: updates.logo_url,
        tax_rate: updates.tax_rate,
        currency: updates.currency
    }

    const { error } = await supabase
        .from('restaurants')
        .update(safeUpdates)
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    // Revalidate multiple paths since restaurant settings (like name/logo) 
    // likely affect the whole app layout and public menu pages
    revalidatePath('/', 'layout')

    return { success: true }
}
