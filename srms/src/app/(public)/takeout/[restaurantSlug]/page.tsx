import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TakeoutPageClient from './TakeoutPageClient'

export const revalidate = 60

export default async function TakeoutPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
    const { restaurantSlug } = await params
    const supabase = await createAdminClient()

    // Find restaurant by slug
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id, name, slug, description, logo_url, settings')
        .eq('slug', restaurantSlug)
        .single()

    if (!restaurant) notFound()

    // Get menu categories + items
    const { data: categories } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('sort_order')

    const { data: items } = await supabase
        .from('menu_items')
        .select('id, name, description, price, image_url, category_id, is_available')
        .eq('restaurant_id', restaurant.id)
        .eq('is_available', true)
        .order('sort_order')

    return (
        <TakeoutPageClient
            restaurant={restaurant}
            categories={categories || []}
            menuItems={items || []}
        />
    )
}
