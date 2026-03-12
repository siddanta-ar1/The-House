'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function openSession(tableId: string, restaurantId: string, guestCount?: number) {
    const supabase = await createServerClient()
    const adminSupabase = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error('[openSession] No authenticated user found')
        return { error: 'Unauthorized' }
    }

    // Generate a URL-safe session token (avoids DB-level base64url encoding issues)
    const { randomBytes } = await import('crypto')
    const sessionToken = randomBytes(32).toString('base64url')

    const { data, error } = await adminSupabase
        .from('sessions')
        .insert({
            table_id: tableId,
            restaurant_id: restaurantId,
            opened_by: user.id,
            guest_count: guestCount || null,
            session_token: sessionToken,
        })
        .select()

    if (error) {
        console.error('[openSession] Insert failed:', error)
        if (error.code === '23505') return { error: 'Table already has an active session' }
        return { error: error.message }
    }

    revalidatePath('/waiter')
    return { success: true }
}

export async function closeSession(sessionId: string) {
    const adminSupabase = await createAdminClient()

    const { error } = await adminSupabase
        .from('sessions')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('status', 'active')

    if (error) return { error: error.message }

    revalidatePath('/waiter')
    return { success: true }
}
