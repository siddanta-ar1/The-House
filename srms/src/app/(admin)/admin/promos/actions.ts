'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPromoCodesAction(restaurantId: string) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { data }
}

export async function createPromoCodeAction(input: {
    restaurant_id: string
    code: string
    promo_type: string
    value: number
    min_order_amount?: number
    max_discount_amount?: number
    max_uses?: number
    valid_until?: string
    is_active?: boolean
}) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('promo_codes')
        .insert({
            ...input,
            code: input.code.toUpperCase().trim(),
        })
        .select()
        .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/promos')
    return { data }
}

export async function updatePromoCodeAction(id: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('promo_codes').update(updates).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/promos')
    return { success: true }
}

export async function deletePromoCodeAction(id: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('promo_codes').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/promos')
    return { success: true }
}
