'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTakeoutStatusAction(orderId: string, newStatus: string) {
    const supabase = await createAdminClient()
    const timestamps: Record<string, string> = {}
    const now = new Date().toISOString()
    if (newStatus === 'confirmed') timestamps.confirmed_at = now
    if (newStatus === 'ready') timestamps.ready_at = now
    if (newStatus === 'picked_up') timestamps.picked_up_at = now
    if (newStatus === 'cancelled') timestamps.cancelled_at = now

    const { error } = await supabase
        .from('takeout_orders')
        .update({ status: newStatus, ...timestamps })
        .eq('id', orderId)
    if (error) return { error: error.message }
    revalidatePath('/admin/takeout')
    return { success: true }
}

export async function getTakeoutOrdersAction(restaurantId: string) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('takeout_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(50)
    return { data: data || [] }
}
