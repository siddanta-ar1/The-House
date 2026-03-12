import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuSection from '@/components/customer/MenuSection'
import CartSummary from '@/components/customer/CartSummary'
import ServiceRequestPanel from '@/components/customer/ServiceRequestPanel'
import { getRestaurantFeatures } from '@/lib/features'
import Image from 'next/image'
import type { MenuItem } from '@/types/database'

export const revalidate = 60 // ISR: Revalidate at most every 60 seconds

export default async function CustomerMenuPage(props: {
    params: Promise<{ tableSlug: string }>
    searchParams: Promise<{ s?: string }>
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    // 1. Session & Table Validation
    const tableToken = params.tableSlug
    let sessionToken = searchParams.s

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

    // Auto-create session if none provided (customer just scanned the QR code)
    if (!sessionToken) {
        // Check for an existing active session on this table
        const { data: existingSession } = await supabase
            .from('sessions')
            .select('id, session_token')
            .eq('table_id', tableData.id)
            .eq('status', 'active')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingSession) {
            sessionToken = existingSession.session_token
        } else {
            // Create a new session for this table
            const newToken = `s-${crypto.randomUUID().slice(0, 12)}`
            const fourHoursFromNow = new Date()
            fourHoursFromNow.setHours(fourHoursFromNow.getHours() + 4)
            const { data: newSession } = await supabase
                .from('sessions')
                .insert({
                    table_id: tableData.id,
                    restaurant_id: restaurantId,
                    session_token: newToken,
                    status: 'active',
                    opened_by: 'customer_scan',
                    expires_at: fourHoursFromNow.toISOString(),
                })
                .select('id, session_token')
                .single()

            if (newSession) {
                sessionToken = newSession.session_token
            }
        }
    }

    const isValidSession = !!sessionToken

    // 2. Fetch Menu Data + Feature Flags in parallel
    const [{ data: categories }, { data: rawMenuItems }, features] = await Promise.all([
        supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_visible', true)
            .order('sort_order', { ascending: true }),

        supabase
            .from('menu_items')
            .select('*, menu_item_modifier_groups(*, menu_item_modifiers(*))')
            .eq('restaurant_id', restaurantId)
            .eq('is_available', true),

        getRestaurantFeatures(restaurantId),
    ])

    // Normalize DB field names → client-side field names
    // menu_item_modifier_groups → modifier_groups, menu_item_modifiers → modifiers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menuItems = (rawMenuItems || []).map((item: Record<string, any>) => ({
        ...item,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modifier_groups: (item.menu_item_modifier_groups || []).map((g: Record<string, any>) => ({
            ...g,
            modifiers: g.menu_item_modifiers || [],
        })),
    })) as MenuItem[]

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
                    <div className="h-12 w-auto">
                        <Image
                            src="/icons/kkhane.png"
                            alt="KKhane"
                            width={120}
                            height={34}
                            className="h-full w-auto object-contain"
                            priority
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 mt-6">
                <MenuSection
                    categories={categories || []}
                    items={menuItems || []}
                    sessionId={sessionToken}
                    restaurantSlug={tableToken}
                    restaurantId={restaurantId}
                />
            </main>

            {/* Service Requests — gated by features_v2 flag */}
            {isValidSession && sessionToken && features?.serviceRequestsEnabled !== false && (
                <ServiceRequestPanel
                    sessionId={sessionToken}
                    restaurantId={restaurantId}
                />
            )}

            {/* Persistent Bottom Cart Summary */}
            <CartSummary sessionId={sessionToken} tableSlug={tableToken} />
        </div>
    )
}
