import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
    const body = await req.text()
    const signature = (await headers()).get('Stripe-Signature') as string

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
        return new NextResponse('Webhook secret missing', { status: 400 })
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: unknown) {
        const err = error as Error
        console.error(`Webhook Error: ${err.message}`)
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Handle the specific event types we care about
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.orderId

        if (orderId) {
            const supabase = await createAdminClient()

            // Update order status in DB — using admin client to bypass RLS
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'confirmed',
                    payment_status: 'paid',
                    confirmed_at: new Date().toISOString(),
                })
                .eq('id', orderId)

            if (error) {
                console.error('Failed to update order status:', error)
                return new NextResponse('Database Error', { status: 500 })
            }
        }
    }

    return new NextResponse('Webhook processed successfully', { status: 200 })
}
