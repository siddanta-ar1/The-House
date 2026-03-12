import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import OrderQueue from '@/components/kitchen/OrderQueue'
import TakeoutQueue from '@/components/kitchen/TakeoutQueue'
import { getRestaurantFeatures } from '@/lib/features'

export const revalidate = 0 // Never cache the kitchen page securely

export default async function KitchenPage() {
    const { restaurantId } = await getCurrentUser()
    const supabase = await createServerClient()

    // Fetch feature flags, active orders + takeout orders in parallel
    const [features, { data: activeOrders }, { data: takeoutOrders }] = await Promise.all([
        getRestaurantFeatures(restaurantId),
        supabase
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
            .order('placed_at', { ascending: true }),
        supabase
            .from('takeout_orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .in('status', ['confirmed', 'preparing'])
            .order('pickup_time', { ascending: true }),
    ])

    return (
        <div className="h-full space-y-6 p-4 overflow-y-auto">
            <OrderQueue
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                initialOrders={activeOrders as unknown as any[]}
                restaurantId={restaurantId}
            />
            {/* TakeoutQueue — only shown if takeout is enabled */}
            {features?.takeoutEnabled && (
                <TakeoutQueue
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialOrders={(takeoutOrders || []) as any[]}
                    restaurantId={restaurantId}
                />
            )}
        </div>
    )
}
