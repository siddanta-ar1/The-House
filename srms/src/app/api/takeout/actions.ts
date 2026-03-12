'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CartItem, TakeoutOrder } from '@/types/database'

interface TakeoutInput {
    restaurantId: string
    customerName: string
    customerPhone: string
    customerEmail?: string
    pickupTime: string // ISO string
    items: CartItem[]
    customerNote?: string
    promoCode?: string | null
}

export async function createTakeoutOrder(
    input: TakeoutInput
): Promise<{ order?: TakeoutOrder; error?: string }> {
    const supabase = await createAdminClient()

    // Calculate subtotal from items
    const subtotal = input.items.reduce((total, item) => {
        const modTotal = (item.modifiers || []).reduce((s, m) => s + m.priceAdjustment, 0)
        return total + (item.price + modTotal) * item.quantity
    }, 0)

    // Apply promo code if present
    let discountAmount = 0
    if (input.promoCode) {
        const { data: promo } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('restaurant_id', input.restaurantId)
            .eq('code', input.promoCode.toUpperCase().trim())
            .eq('is_active', true)
            .single()

        if (promo) {
            if (promo.promo_type === 'percentage_off') {
                discountAmount = Math.round(subtotal * promo.value / 100 * 100) / 100
                if (promo.max_discount_amount) {
                    discountAmount = Math.min(discountAmount, promo.max_discount_amount)
                }
            } else if (promo.promo_type === 'amount_off') {
                discountAmount = Math.min(promo.value, subtotal)
            }

            // Increment usage
            await supabase
                .from('promo_codes')
                .update({ current_uses: promo.current_uses + 1 })
                .eq('id', promo.id)
        }
    }

    // Get tax rate from settings
    const { data: settings } = await supabase
        .from('settings')
        .select('features_v2')
        .eq('restaurant_id', input.restaurantId)
        .single()

    const taxRate = (settings?.features_v2 as Record<string, unknown>)?.tax_rate_percent as number || 0
    const taxAmount = Math.round((subtotal - discountAmount) * taxRate / 100 * 100) / 100
    const totalAmount = subtotal - discountAmount + taxAmount

    // Build items payload as JSONB
    const itemsPayload = input.items.map((i) => ({
        menu_item_id: i.menuItemId,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        modifiers: (i.modifiers || []).map((m) => ({
            modifier_id: m.modifierId,
            name: m.name,
            price: m.priceAdjustment,
        })),
        special_request: i.specialRequest || null,
    }))

    const { data: order, error } = await supabase
        .from('takeout_orders')
        .insert({
            restaurant_id: input.restaurantId,
            customer_name: input.customerName,
            customer_phone: input.customerPhone,
            customer_email: input.customerEmail || null,
            pickup_time: input.pickupTime,
            items: itemsPayload,
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            customer_note: input.customerNote || null,
            status: 'pending',
        })
        .select()
        .single()

    if (error) {
        console.error('Takeout order error:', error)
        return { error: 'Failed to place takeout order. Please try again.' }
    }

    revalidatePath(`/takeout`)

    return { order: order as TakeoutOrder }
}

export async function getTakeoutOrders(
    restaurantId: string,
    status?: string
): Promise<TakeoutOrder[]> {
    const supabase = await createAdminClient()

    let query = supabase
        .from('takeout_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('pickup_time', { ascending: true })

    if (status) {
        query = query.eq('status', status)
    }

    const { data } = await query
    return (data || []) as TakeoutOrder[]
}

export async function updateTakeoutStatus(
    orderId: string,
    status: 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'cancelled'
): Promise<{ error?: string }> {
    const supabase = await createAdminClient()

    const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
    }

    if (status === 'picked_up') {
        updateData.actual_pickup_time = new Date().toISOString()
    }

    const { error } = await supabase
        .from('takeout_orders')
        .update(updateData)
        .eq('id', orderId)

    if (error) {
        return { error: 'Failed to update status.' }
    }

    revalidatePath('/takeout')
    return {}
}
