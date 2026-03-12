'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CartItem } from '@/types/database'
import { headers } from 'next/headers'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Serverless-safe rate limiting via Upstash Redis
// Each IP gets 5 requests per 60-second sliding window
// Lazily initialized so missing env vars don't crash the entire module
let _ratelimit: Ratelimit | null = null
function getRatelimit(): Ratelimit | null {
    if (_ratelimit) return _ratelimit
    try {
        _ratelimit = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(5, '60 s'),
            analytics: true,
            prefix: 'srms:order-ratelimit',
        })
        return _ratelimit
    } catch {
        console.warn('Upstash Redis not configured — rate limiting disabled')
        return null
    }
}

export async function placeOrder(
    sessionId: string,
    restaurantSlug: string,
    items: CartItem[],
    customerNote?: string,
    promoCode?: string | null,
    loyaltyMemberId?: string | null
): Promise<{
    orderId?: string
    subtotal?: number
    discount?: number
    tax?: number
    total?: number
    pointsEarned?: number
    error?: string
}> {
    // 1. Anti-Spam Rate Limiting via Upstash Redis (serverless-safe)
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'fallback-ip'

    const ratelimit = getRatelimit()
    if (ratelimit) {
        const { success, remaining } = await ratelimit.limit(ip)
        if (!success) {
            console.warn(`Rate limit exceeded for IP: ${ip} (remaining: ${remaining})`)
            return { error: 'You are placing orders too quickly. Please wait a minute and try again.' }
        }
    }

    // 2. Proceed with Order Placement
    const supabase = await createAdminClient()

    // Format items payload for the place_order RPC (includes modifiers)
    const payload = items.map((i) => ({
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        special_request: i.specialRequest || null,
        modifiers: (i.modifiers || []).map((m) => ({
            modifier_id: m.modifierId,
        })),
    }))

    // Call the ACID-safe RPC (returns JSONB with breakdown)
    const { data, error } = await supabase.rpc('place_order', {
        p_session_id: sessionId,
        p_items: payload,
        p_customer_note: customerNote || null,
        p_promo_code: promoCode || null,
        p_loyalty_member_id: loyaltyMemberId || null,
    })

    if (error) {
        console.error('RPC Error:', error)

        // Map Postgres exception codes to user-friendly messages
        if (error.message.includes('OUT_OF_STOCK') || error.message.includes('ITEM_UNAVAILABLE')) {
            return { error: 'Sorry, one or more items just sold out or are unavailable!' }
        }
        if (error.message.includes('INVALID_SESSION')) {
            return { error: 'Your table session has expired. Ask your waiter to reopen.' }
        }
        if (error.message.includes('INVALID_PROMO')) {
            return { error: 'The promo code is invalid or has expired.' }
        }
        return { error: 'Order failed to place. Please try again or ask a waiter.' }
    }

    // Purge the cart/menu page caches for this session
    revalidatePath(`/t/${restaurantSlug}`)

    // data is now JSONB: { order_id, subtotal, discount, tax, total, points_earned }
    const result = data as {
        order_id: string
        subtotal: number
        discount: number
        tax: number
        total: number
        points_earned: number
    }

    return {
        orderId: result.order_id,
        subtotal: result.subtotal,
        discount: result.discount,
        tax: result.tax,
        total: result.total,
        pointsEarned: result.points_earned,
    }
}
