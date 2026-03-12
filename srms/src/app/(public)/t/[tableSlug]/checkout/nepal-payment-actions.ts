'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function submitPaymentClaim(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const restaurantId = formData.get('restaurantId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const phone = formData.get('phone') as string
    const provider = formData.get('provider') as string
    const screenshot = formData.get('screenshot') as File | null

    const orderId = formData.get('orderId') as string | null

    if (!restaurantId || !amount || !phone) {
        return { error: 'Missing required fields' }
    }

    const supabase = await createAdminClient()

    // Upload screenshot if provided (store URL for manual reference, not in DB)
    if (screenshot && screenshot.size > 0) {
        const ext = screenshot.name.split('.').pop()
        const fileName = `payment-proofs/${restaurantId}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(fileName, screenshot, {
                contentType: screenshot.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('Screenshot upload failed:', uploadError)
            // Continue without screenshot — it's optional
        }
    }

    // Insert payment verification record
    // DB columns: amount, payment_method, reference_code (for phone/txn id)
    // status is derived from staff_verified/staff_rejected booleans (defaults false)
    // Map the provider label to a valid payment_method enum value
    const VALID_METHODS = ['qr_scan', 'esewa', 'khalti', 'fonepay', 'cash', 'card', 'stripe'] as const
    const normalised = (provider || '').toLowerCase().trim()
    const paymentMethod = VALID_METHODS.find(m => normalised.includes(m)) || 'qr_scan'

    const { error } = await supabase
        .from('payment_verifications')
        .insert({
            restaurant_id: restaurantId,
            order_id: orderId || null,
            amount,
            payment_method: paymentMethod,
            reference_code: phone,
        })

    if (error) {
        console.error('Payment claim insert failed:', error)
        return { error: 'Failed to submit payment claim. Please try again.' }
    }

    return { success: true }
}
