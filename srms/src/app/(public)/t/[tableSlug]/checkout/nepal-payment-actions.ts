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
    let screenshotUrl: string | null = null

    // Upload screenshot if provided
    if (screenshot && screenshot.size > 0) {
        const ext = screenshot.name.split('.').pop()
        const fileName = `payment-proofs/${restaurantId}/${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(fileName, screenshot, {
                contentType: screenshot.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('Screenshot upload failed:', uploadError)
            // Continue without screenshot — it's optional
        } else {
            const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(uploadData.path)
            screenshotUrl = urlData.publicUrl
        }
    }

    // Insert payment verification record
    const { error } = await supabase
        .from('payment_verifications')
        .insert({
            restaurant_id: restaurantId,
            order_id: orderId || null,
            claimed_amount: amount,
            customer_phone: phone,
            provider,
            screenshot_url: screenshotUrl,
            status: 'pending',
        })

    if (error) {
        console.error('Payment claim insert failed:', error)
        return { error: 'Failed to submit payment claim. Please try again.' }
    }

    return { success: true }
}
