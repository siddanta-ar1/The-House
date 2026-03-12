import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import PricingRulesManager from './PricingRulesManager'

export const revalidate = 0

export default async function AdminPricingPage() {
    const { restaurantId: rid } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const [{ data: rules }, { data: items }] = await Promise.all([
        adminSupabase.from('pricing_rules').select('*, menu_items(name)').eq('restaurant_id', rid).order('priority', { ascending: true }),
        adminSupabase.from('menu_items').select('id, name').eq('restaurant_id', rid).eq('is_available', true).order('name'),
    ])

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
                <p className="text-gray-500 mt-1">Create time/day-based pricing rules for menu items.</p>
            </div>
            <PricingRulesManager initialRules={rules || []} menuItems={items || []} restaurantId={rid} />
        </div>
    )
}
