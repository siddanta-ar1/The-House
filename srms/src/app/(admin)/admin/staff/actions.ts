'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Note: For a fully featured production app, we would use Supabase Admin API
// to create the actual Auth User via a secure endpoint. For the MVP scope,
// we will focus on updating existing users' roles or adding them to the public schema
// assuming they've signed up or been invited. 
// As an MVP workaround for this interface, we will build an "Invitation" 
// simulation that creates the DB record, and in real life would trigger an email.
// For now, we will just manage the roles of users already in the DB.

export async function updateStaffRoleAction(userId: string, targetRoleId: number) {
    const supabase = await createAdminClient()

    // Managers cannot make other people Super Admins. Only Super Admins can.
    // For this MVP action, we'll do a simple update.
    const { error } = await supabase
        .from('users')
        .update({ role_id: targetRoleId })
        .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/admin/staff')
    return { success: true }
}

export async function toggleStaffStatusAction(userId: string, isActive: boolean) {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/admin/staff')
    return { success: true }
}
