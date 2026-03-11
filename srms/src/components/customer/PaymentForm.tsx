'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

// This should be your public Stripe publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

function CheckoutForm({ amount, onSuccess }: { amount: number, onSuccess: () => void }) {
    const stripe = useStripe()
    const elements = useElements()
    const [error, setError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) return

        setIsProcessing(true)

        // Example client-side confirmation (requires a client_secret from your backend)
        const { error: submitError } = await elements.submit()
        if (submitError) {
            setError(submitError.message || 'An error occurred during submission.')
            setIsProcessing(false)
            return
        }

        // Call your backend to create the PaymentIntent and get the client_secret
        // const res = await fetch('/api/create-payment-intent', { method: 'POST', body: JSON.stringify({ amount }) })
        // const { clientSecret } = await res.json()

        // Mock success for now since we don't have a real backend setup for this
        console.log('Payment processed for amount: ', amount)
        onSuccess()
        setIsProcessing(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <PaymentElement />
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            <button
                type="submit"
                disabled={isProcessing || !stripe || !elements}
                className="w-full bg-[var(--color-primary)] text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
            >
                {isProcessing ? 'Processing...' : `Pay $${(amount).toFixed(2)}`}
            </button>
        </form>
    )
}

export default function PaymentForm({ clientSecret, amount, onSuccess }: { clientSecret: string, amount: number, onSuccess: () => void }) {
    // If we have a real client secret, load elements. Otherwise show a mock fallback.
    const options = {
        clientSecret,
        appearance: { theme: 'stripe' as const }
    }

    if (!clientSecret || clientSecret === 'mock_secret') {
        return (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm mb-4">
                    Stripe integration is in test mode. A valid <code>clientSecret</code> is required to render the live payment form.
                </p>
                <button
                    onClick={onSuccess}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition"
                >
                    Mock Successful Payment
                </button>
            </div>
        )
    }

    return (
        <Elements stripe={stripePromise} options={options}>
            <CheckoutForm amount={amount} onSuccess={onSuccess} />
        </Elements>
    )
}
