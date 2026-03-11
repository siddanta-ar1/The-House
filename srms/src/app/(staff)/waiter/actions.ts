'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function openSession(tableId: string, restaurantId: string, guestCount?: number) {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('sessions')
        .insert({
            table_id: tableId,
            restaurant_id: restaurantId,
            opened_by: user.id,
            guest_count: guestCount || null
        })

    if (error) {
        if (error.code === '23505') return { error: 'Table already has an active session' }
        return { error: error.message }
    }

    revalidatePath('/waiter')
    return { success: true }
}

export async function closeSession(sessionId: string) {
    const supabase = await createServerClient()

    const { error } = await supabase
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
