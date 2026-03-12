import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import TableManager, { type TableWithSession } from '@/components/waiter/TableManager'
import ServiceRequestFeed from '@/components/waiter/ServiceRequestFeed'
import StaffShiftClock from '@/components/shared/StaffShiftClock'
import PaymentVerificationFeed from '@/components/waiter/PaymentVerificationFeed'
import WaiterOrderFeed from '@/components/waiter/WaiterOrderFeed'
import WaiterTakeoutFeed from '@/components/waiter/WaiterTakeoutFeed'
import { getRestaurantFeatures } from '@/lib/features'

export const revalidate = 0

export default async function WaiterPage() {
    const { id: userId, restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    // Fetch all tables AND their active sessions (if any)
    // Using adminSupabase to bypass RLS — this page is already protected by proxy.ts
    const { data: tables } = await adminSupabase
        .from('tables')
        .select(`
      *,
      sessions (
        *
      )
    `)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('label', { ascending: true })

    // Map the nested array into a cleaner union for the client
    const mappedTables = tables?.map(table => {
        const sessions = table.sessions as unknown as { status: string }[]
        const activeSession = sessions?.find((s) => s.status === 'active')
        return {
            ...table,
            activeSession: activeSession || null
        }
    }) || []

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Fetch feature flags + all parallel data
    const [features, { data: serviceRequests }, { data: activeShift }, { data: shiftHistory }, { data: paymentClaims }, { data: activeOrders }, { data: readyTakeouts }] = await Promise.all([
        getRestaurantFeatures(restaurantId),
        adminSupabase
            .from('service_requests')
            .select('*, sessions(tables(label))')
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'acknowledged'])
            .order('created_at', { ascending: false })
            .limit(20),
        adminSupabase
            .from('staff_shifts')
            .select('*')
            .eq('user_id', userId)
            .is('clock_out', null)
            .order('clock_in', { ascending: false })
            .limit(1)
            .maybeSingle(),
        adminSupabase
            .from('staff_shifts')
            .select('*')
            .eq('user_id', userId)
            .not('clock_out', 'is', null)
            .order('clock_in', { ascending: false })
            .limit(5),
        adminSupabase
            .from('payment_verifications')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(20),
        adminSupabase
            .from('orders')
            .select(`
                id, status, total_amount, placed_at, customer_note, payment_status, session_id,
                sessions ( id, tables ( label ) ),
                order_items ( id, quantity, menu_items ( name ) )
            `)
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
            .order('placed_at', { ascending: true }),
        adminSupabase
            .from('takeout_orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'ready_for_pickup')
            .order('pickup_time', { ascending: true })
            .limit(20),
    ])

    return (
        <div className="space-y-6 p-4">
            {/* Staff Shift Clock — gated */}
            {features?.staffShiftsEnabled && (
                <StaffShiftClock
                    userId={userId}
                    restaurantId={restaurantId}
                    initialShift={activeShift || null}
                    initialHistory={shiftHistory || []}
                />
            )}

            {/* Nepal Payment Verification Feed — gated */}
            {features?.nepalPayEnabled && (
                <PaymentVerificationFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialClaims={(paymentClaims || []) as any[]}
                    restaurantId={restaurantId}
                    userId={userId}
                />
            )}

            {/* Takeout Pickup Feed — gated */}
            {features?.takeoutEnabled && (
                <WaiterTakeoutFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialOrders={(readyTakeouts || []) as any[]}
                    restaurantId={restaurantId}
                />
            )}

            {/* Active Order Feed — waiter sees ready orders here (Step 7) */}
            <WaiterOrderFeed
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                initialOrders={(activeOrders || []) as any[]}
                restaurantId={restaurantId}
            />

            {/* Service Request Feed — gated */}
            {features?.serviceRequestsEnabled !== false && (
                <ServiceRequestFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialRequests={(serviceRequests || []) as any[]}
                    restaurantId={restaurantId}
                    userId={userId}
                />
            )}

            <TableManager
                initialTables={mappedTables as unknown as TableWithSession[]}
                restaurantId={restaurantId}
                appUrl={appUrl}
            />
        </div>
    )
}
