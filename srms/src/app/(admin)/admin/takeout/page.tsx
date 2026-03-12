import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import TakeoutDashboard from './TakeoutDashboard'

export const revalidate = 0

export default async function AdminTakeoutPage() {
    const { restaurantId: rid } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const { data: orders } = await adminSupabase
        .from('takeout_orders')
        .select('*')
        .eq('restaurant_id', rid)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Takeout Orders</h1>
                <p className="text-gray-500 mt-1">Manage pending and active takeout orders.</p>
            </div>
            <TakeoutDashboard initialOrders={orders || []} restaurantId={rid} />
        </div>
    )
}
