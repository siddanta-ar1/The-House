'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { validateInput } from '@/lib/validation'
import { z } from 'zod'

const NepalPaymentInputSchema = z.object({
    restaurantId: z.string().uuid('Invalid restaurant ID'),
    amount: z.number().positive('Amount must be positive').max(999999, 'Amount too large'),
    phone: z.string().regex(/^\+?[\d\s\-()]{7,}$/, 'Invalid phone format'),
    provider: z.enum(['esewa', 'khalti', 'fonepay']),
    screenshot: z.instanceof(File).optional(),
    orderId: z.string().uuid().nullable().optional()
})

export async function submitPaymentClaim(formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const restaurantId = formData.get('restaurantId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const phone = formData.get('phone') as string
    const provider = formData.get('provider') as string
    const screenshot = formData.get('screenshot') as File | null
    const orderId = formData.get('orderId') as string | null

    // Validate all inputs
    const validation = validateInput(NepalPaymentInputSchema, {
        restaurantId,
        amount,
        phone,
        provider,
        screenshot: screenshot && screenshot.size > 0 ? screenshot : undefined,
        orderId
    })

    if (!validation.success) {
        console.warn('Payment validation failed:', validation.error)
        return { error: `Invalid payment claim: ${validation.error}` }
    }

    const { restaurantId: validRestaurantId, amount: validAmount, phone: validPhone, provider: validProvider, screenshot: validScreenshot, orderId: validOrderId } = validation.data!

    const supabase = await createAdminClient()

    // Upload screenshot if provided (store URL for manual reference, not in DB)
    if (validScreenshot && validScreenshot.size > 0) {
        const ext = validScreenshot.name.split('.').pop()
        const fileName = `payment-proofs/${validRestaurantId}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(fileName, validScreenshot, {
                contentType: validScreenshot.type,
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
    const paymentMethod = validProvider as 'esewa' | 'khalti' | 'fonepay'

    const { error } = await supabase
        .from('payment_verifications')
        .insert({
            restaurant_id: validRestaurantId,
            order_id: validOrderId || null,
            amount: validAmount,
            payment_method: paymentMethod,
            reference_code: validPhone,
        })

    if (error) {
        console.error('Payment claim insert failed:', error)
        return { error: 'Failed to submit payment claim. Please try again.' }
    }

    return { success: true }
}
