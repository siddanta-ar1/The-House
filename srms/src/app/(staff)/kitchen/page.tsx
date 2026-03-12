import { createServerClient } from '@/lib/supabase/server'
import { getJwtClaims } from '@/lib/supabase/jwt'
import OrderQueue from '@/components/kitchen/OrderQueue'
import { redirect } from 'next/navigation'

export const revalidate = 0 // Never cache the kitchen page securely

export default async function KitchenPage() {
    const supabase = await createServerClient()

    // Get current user session via Server Component
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin')

    // Extract restaurant_id from JWT custom claims (injected by 004_jwt_claims_hook.sql)
    // No admin DB roundtrip needed — the data is embedded in the access token
    const claims = await getJwtClaims()
    const restaurantId = claims?.restaurant_id
    if (!restaurantId) redirect('/unauthorized')

    // Fetch initial active orders for this restaurant
    // After initial hydration, the OrderQueue component relies purely on
    // Supabase Realtime — no full DB refetch on page refresh needed
    const { data: activeOrders } = await supabase
        .from('orders')
        .select(`
      id,
      status,
      total_amount,
      placed_at,
      customer_note,
      sessions ( tables ( label ) ),
      order_items (
        id,
        quantity,
        special_request,
        menu_items ( name ),
        order_item_modifiers ( modifier_name, price_adjustment )
      )
    `)
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'confirmed', 'preparing'])
        .order('placed_at', { ascending: true })

    return (
        <div className="h-full">
            <OrderQueue
                initialOrders={activeOrders as unknown as any[]}
                restaurantId={restaurantId}
            />
        </div>
    )
}
