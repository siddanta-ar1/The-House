import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsManager from '@/components/admin/SettingsManager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/admin')

    const adminSupabase = await createAdminClient()

    // Get current user's restaurant_id and role to determine access level
    const { data: currentUserData } = await adminSupabase
        .from('users')
        .select('restaurant_id, roles(name)')
        .eq('id', user.id)
        .single()

    if (!currentUserData?.restaurant_id) redirect('/unauthorized')

    const restaurantId = currentUserData.restaurant_id
    const userRole = (currentUserData.roles as unknown as { name: string } | null)?.name || ''

    // Fetch current restaurant settings
    const { data: restaurant } = await adminSupabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()

    if (!restaurant) redirect('/unauthorized')

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                        <p className="text-gray-500 mt-1">Configure your restaurant's core information and operational rules</p>
                    </div>
                </div>
            </header>

            <SettingsManager
                initialRestaurant={restaurant}
                canEdit={userRole === 'super_admin' || userRole === 'manager'}
            />
        </div>
    )
}
