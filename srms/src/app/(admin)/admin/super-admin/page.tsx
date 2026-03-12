import { requireRole } from '@/lib/auth'
import SuperAdminDashboard from './SuperAdminDashboard'
import { getAllRestaurants, getSaasMetrics } from './actions'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
    // Only super_admin can access this page
    await requireRole('super_admin')

    // Fetch all restaurants + metrics
    const [restaurantsResult, metrics] = await Promise.all([
        getAllRestaurants(),
        getSaasMetrics(),
    ])

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">SaaS Control Panel</h1>
                <p className="text-gray-500 mt-1">Manage all restaurant tenants, subscriptions, and platform metrics</p>
            </header>

            <SuperAdminDashboard
                restaurants={(restaurantsResult.data || []) as any[]}
                metrics={metrics}
            />
        </div>
    )
}
