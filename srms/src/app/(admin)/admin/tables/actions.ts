'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTableAction(restaurantId: string, label: string, capacity?: number) {
    const supabase = await createAdminClient()

    // Generate a secure random token for the QR code
    const qrToken = crypto.randomUUID().split('-')[0] + '-' + Date.now().toString(36).slice(-4)

    const { data, error } = await supabase
        .from('tables')
        .insert({
            restaurant_id: restaurantId,
            label,
            capacity: capacity || null,
            qr_token: qrToken,
            is_active: true
        })
        .select()
        .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/tables')
    return { data }
}

export async function updateTableAction(id: string, updates: any) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/admin/tables')
    return { success: true }
}

export async function deleteTableAction(id: string) {
    const supabase = await createAdminClient()

    // Deleting a table might fail if there are foreign key constraints (like past sessions)
    // In a fully robust app, we'd soft-delete (is_active = false) or cascade delete
    // We'll stick to a hard delete attempt first, and soft delete if requested
    const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', id)

    if (error) {
        if (error.code === '23503') return { error: 'Cannot delete: Table has active or past sessions.' }
        return { error: error.message }
    }

    revalidatePath('/admin/tables')
    return { success: true }
}
