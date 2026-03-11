import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenuManager from '@/components/admin/MenuManager'

export const dynamic = 'force-dynamic' // Ensure fresh data on admin load

export default async function MenuManagementPage() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/admin')

    // Admin client to bypass RLS for robust fetch
    const adminSupabase = await createAdminClient()

    // Get user's restaurant_id
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) redirect('/unauthorized')

    const restaurantId = userData.restaurant_id

    // Fetch categories and items
    const [{ data: categories }, { data: items }] = await Promise.all([
        adminSupabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true }),
        adminSupabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('name', { ascending: true })
    ])

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
                <p className="text-gray-500 mt-1">Organize your categories and menu items</p>
            </header>

            <MenuManager
                initialCategories={categories || []}
                initialItems={items || []}
                restaurantId={restaurantId}
            />
        </div>
    )
}
