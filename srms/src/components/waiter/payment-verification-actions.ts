'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function verifyPayment(
    claimId: string,
    action: 'verified' | 'rejected',
    userId: string
): Promise<{ error?: string; success?: boolean }> {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('payment_verifications')
        .update({
            status: action,
            verified_by: userId,
            verified_at: new Date().toISOString(),
        })
        .eq('id', claimId)

    if (error) {
        console.error('Payment verification update failed:', error)
        return { error: 'Failed to update payment status' }
    }

    revalidatePath('/waiter')
    return { success: true }
}
