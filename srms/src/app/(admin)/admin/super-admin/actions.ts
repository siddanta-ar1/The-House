'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAllRestaurants() {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('restaurants')
        .select('*, users!restaurants_owner_id_fkey(email)')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message, data: null }
    return { data }
}

export async function suspendRestaurant(restaurantId: string, suspend: boolean) {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('restaurants')
        .update({ is_suspended: suspend })
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    revalidatePath('/super-admin')
    return { success: true }
}

export async function updateSubscriptionTier(
    restaurantId: string,
    tier: 'free' | 'basic' | 'pro' | 'enterprise'
) {
    const supabase = await createAdminClient()

    // Define limits per tier
    const tierLimits: Record<string, { max_staff: number; max_menu_items: number }> = {
        free: { max_staff: 3, max_menu_items: 20 },
        basic: { max_staff: 10, max_menu_items: 100 },
        pro: { max_staff: 50, max_menu_items: 500 },
        enterprise: { max_staff: 999, max_menu_items: 9999 },
    }

    const limits = tierLimits[tier]

    const { error } = await supabase
        .from('restaurants')
        .update({
            subscription_tier: tier,
            max_staff: limits.max_staff,
            max_menu_items: limits.max_menu_items,
        })
        .eq('id', restaurantId)

    if (error) return { error: error.message }

    revalidatePath('/super-admin')
    return { success: true }
}

export async function getSaasMetrics() {
    const supabase = await createAdminClient()

    const [
        { count: totalRestaurants },
        { count: activeRestaurants },
        { count: totalOrders },
        { data: tierBreakdown },
    ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('restaurants').select('subscription_tier'),
    ])

    // Count by tier
    const tiers: Record<string, number> = { free: 0, basic: 0, pro: 0, enterprise: 0 }
    tierBreakdown?.forEach((r: { subscription_tier?: string }) => {
        const tier = r.subscription_tier || 'free'
        tiers[tier] = (tiers[tier] || 0) + 1
    })

    return {
        totalRestaurants: totalRestaurants || 0,
        activeRestaurants: activeRestaurants || 0,
        totalOrders: totalOrders || 0,
        tierBreakdown: tiers,
    }
}
