'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CartItem } from '@/types/database'
import { headers } from 'next/headers'

// In-memory rate limiting store (Fallback for Upstash Redis)
// Maps IP address to an array of request timestamps
const rateLimitStore = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5 // 5 orders per minute max

export async function placeOrder(
    sessionId: string,
    restaurantSlug: string,
    items: CartItem[],
    customerNote?: string
): Promise<{ orderId?: string; error?: string }> {
    // 1. Anti-Spam Rate Limiting Check
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'fallback-ip'

    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW_MS

    // Get existing requests for IP
    let requests = rateLimitStore.get(ip) || []
    // Filter out old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart)

    if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
        console.warn(`Rate limit exceeded for IP: ${ip}`)
        return { error: 'You are placing orders too quickly. Please wait a minute and try again.' }
    }

    // Record new request
    requests.push(now)
    rateLimitStore.set(ip, requests)

    // 2. Proceed with Order Placement
    const supabase = await createAdminClient()

    // Format items payload for the place_order RPC
    const payload = items.map((i) => ({
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        special_request: i.specialRequest || null,
    }))

    // Call the ACID-safe RPC
    const { data, error } = await supabase.rpc('place_order', {
        p_session_id: sessionId,
        p_items: payload,
        p_customer_note: customerNote || null,
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
        return { error: 'Order failed to place. Please try again or ask a waiter.' }
    }

    // Purge the cart/menu page caches for this session
    revalidatePath(`/t/${restaurantSlug}`) // We use the ID as slug for Phase 3 MVP

    return { orderId: data as string }
}
