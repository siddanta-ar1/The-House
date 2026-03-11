import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuGrid from '@/components/customer/MenuGrid'
import CategoryNav from '@/components/customer/CategoryNav'
import CartSummary from '@/components/customer/CartSummary'

export const revalidate = 60 // ISR: Revalidate at most every 60 seconds

export default async function CustomerMenuPage(props: {
    params: Promise<{ tableSlug: string }>
    searchParams: Promise<{ s?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    // 1. Session & Table Validation
    const tableToken = params.tableSlug
    const sessionToken = searchParams.s

    const supabase = await createAdminClient()

    // Find the table and restaurant ID
    const { data: tableData } = await supabase
        .from('tables')
        .select('id, restaurant_id, label, restaurants(name, logo_url)')
        .eq('qr_token', tableToken)
        .single()

    if (!tableData) return notFound()

    const restaurantId = tableData.restaurant_id
    const restaurantName = (tableData.restaurants as unknown as { name: string })?.name || 'Smart Restaurant'

    // If a session token is provided, we would ideally rotate the token here
    // and set a secure HttpOnly cookie for the customer session.
    // For the MVP, we rely on the session token string.
    const isValidSession = !!sessionToken

    // 2. Fetch Menu Data
    // Using the covering index for optimal performance
    const [{ data: categories }, { data: menuItems }] = await Promise.all([
        supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_visible', true)
            .order('sort_order', { ascending: true }),

        supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true)
    ])

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white px-4 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-center max-w-2xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold font-['var(--font-family)'] text-[var(--color-secondary)]">
                            {restaurantName}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">
                            Table • {tableData.label}
                            {!isValidSession && (
                                <span className="ml-2 text-red-500">(View Only)</span>
                            )}
                        </p>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-full overflow-hidden">
                        {/* Logo placeholder */}
                        <div className="w-full h-full bg-[var(--color-primary)] opacity-20"></div>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 mt-6">
                <CategoryNav categories={categories || []} />

                <div className="mt-8">
                    <MenuGrid
                        categories={categories || []}
                        items={menuItems || []}
                        sessionId={sessionToken}
                        restaurantSlug={restaurantId} // Internal ID for now
                    />
                </div>
            </main>

            {/* Persistent Bottom Cart Summary */}
            <CartSummary sessionId={sessionToken} />
        </div>
    )
}
