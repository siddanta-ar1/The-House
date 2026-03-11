import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import OrderQueue from '@/components/kitchen/OrderQueue'
import { redirect } from 'next/navigation'

export const revalidate = 0 // Never cache the kitchen page securely

export default async function KitchenPage() {
    const supabase = await createServerClient()

    // Get current user session via Server Component
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin')

    // Use admin client to bypass RLS for user/role lookup (safe — server-only)
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) redirect('/unauthorized')

    const restaurantId = userData.restaurant_id

    // Fetch initial active orders for this restaurant
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
        menu_items ( name )
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
