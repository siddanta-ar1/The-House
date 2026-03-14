import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuSection from '@/components/customer/MenuSection'
import CartSummary from '@/components/customer/CartSummary'
import ServiceRequestPanel from '@/components/customer/ServiceRequestPanel'
import { getRestaurantFeatures } from '@/lib/features'
import VideoLogo from '@/components/shared/VideoLogo'
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

    // Track the session UUID (needed for FK references like service_requests.session_id)
    let sessionUUID: string | undefined

    // Find active session for this table (opened by waiter)
    if (!sessionToken) {
        const { data: existingSession } = await supabase
            .from('sessions')
            .select('id, session_token')
            .eq('table_id', tableData.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingSession) {
            sessionToken = existingSession.session_token
            sessionUUID = existingSession.id
        }
        // If no active session, customer sees menu in view-only mode
        // They need to ask the waiter to open a session for their table
    } else {
        // Validate the provided session token is still active
        const { data: validSession } = await supabase
            .from('sessions')
            .select('id, session_token')
            .eq('session_token', sessionToken)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

        if (!validSession) {
            sessionToken = undefined // Session expired or invalid
        } else {
            sessionUUID = validSession.id
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
                    <div className="h-10 w-auto shrink-0">
                        <VideoLogo className="h-full" />
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 mt-6">
                {/* No-session banner — ask waiter to open table */}
                {!isValidSession && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <p className="text-amber-800 font-semibold">👋 Welcome!</p>
                        <p className="text-amber-700 text-sm mt-1">
                            Please ask your waiter to open a session for this table so you can place orders.
                        </p>
                    </div>
                )}

                <MenuSection
                    categories={categories || []}
                    items={menuItems || []}
                    sessionId={sessionToken}
                    restaurantSlug={tableToken}
                    restaurantId={restaurantId}
                />
            </main>

            {/* Service Requests — gated by features_v2 flag */}
            {isValidSession && sessionUUID && features?.serviceRequestsEnabled !== false && (
                <ServiceRequestPanel
                    sessionId={sessionUUID}
                    restaurantId={restaurantId}
                />
            )}

            {/* Persistent Bottom Cart Summary */}
            <CartSummary sessionId={sessionToken} tableSlug={tableToken} />
        </div>
    )
}
