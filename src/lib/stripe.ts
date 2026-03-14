import Stripe from 'stripe'

// Initialize Stripe instance with the secret key from environment variables
// It's safe to export this initialized instance as long as it's only used on Edge/Server functions
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    // https://github.com/stripe/stripe-node#configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: '2023-10-16' as any,
    appInfo: {
        name: 'Smart Restaurant Management System',
        version: '1.0.0',
    },
})

// Client helper: We do not configure stripe-js here as it should be done client-side.
