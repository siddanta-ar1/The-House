import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTracker from '@/components/customer/OrderTracker'

export const revalidate = 0 // Don't cache this page - fetch fresh DB state

export default async function OrderPage(props: {
    params: Promise<{ tableSlug: string; orderId: string }>
}) {
    const params = await props.params;
    const supabase = await createServerClient()

    // Verify the order exists, fetch with nested item relations
    const { data: order } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (
        *,
        menu_items (name)
      )
    `)
        .eq('id', params.orderId)
        .single()

    if (!order) {
        return notFound()
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
                <h1 className="text-xl font-semibold text-gray-900 text-center">Track Order</h1>
            </header>

            <main className="max-w-xl mx-auto px-4 mt-6">
                <OrderTracker orderId={params.orderId} initialOrder={order} />

                {/* Support/Extra Actions */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Need help? Ask a waiter for assistance.</p>
                </div>
            </main>
        </div>
    )
}
