import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import LoyaltyManager from './LoyaltyManager'

export const revalidate = 0

export default async function AdminLoyaltyPage() {
    const { restaurantId: rid } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const [{ data: config }, { data: members }] = await Promise.all([
        adminSupabase.from('loyalty_config').select('*').eq('restaurant_id', rid).single(),
        adminSupabase.from('loyalty_members').select('*').eq('restaurant_id', rid).order('lifetime_points', { ascending: false }).limit(100),
    ])

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
                <p className="text-gray-500 mt-1">Configure rewards, tiers and view members.</p>
            </div>
            <LoyaltyManager initialConfig={config} initialMembers={members || []} restaurantId={rid} />
        </div>
    )
}
