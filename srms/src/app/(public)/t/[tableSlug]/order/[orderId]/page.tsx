import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTracker from '@/components/customer/OrderTracker'
import InvoiceBanner from '@/components/customer/InvoiceBanner'

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

    // Fetch restaurant info for invoice display (PAN number, VAT status)
    let restaurantInfo: { pan_number?: string; vat_registered?: boolean; name?: string } | null = null
    if (order.restaurant_id) {
        const adminSupabase = await createAdminClient()
        const { data } = await adminSupabase
            .from('restaurants')
            .select('pan_number, vat_registered, name')
            .eq('id', order.restaurant_id)
            .single()
        restaurantInfo = data
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
                <h1 className="text-xl font-semibold text-gray-900 text-center">Track Order</h1>
            </header>

            <main className="max-w-xl mx-auto px-4 mt-6">
                <OrderTracker orderId={params.orderId} initialOrder={order} />

                {/* Invoice / PAN display */}
                {(order as any).invoice_number && (
                    <InvoiceBanner
                        invoiceNumber={(order as any).invoice_number}
                        panNumber={restaurantInfo?.pan_number || (order as any).pan_number_snapshot}
                        restaurantName={restaurantInfo?.name}
                        vatRegistered={restaurantInfo?.vat_registered}
                    />
                )}

                {/* Support/Extra Actions */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Need help? Ask a waiter for assistance.</p>
                </div>
            </main>
        </div>
    )
}
