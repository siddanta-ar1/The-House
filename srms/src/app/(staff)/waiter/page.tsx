import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import TableManager, { type TableWithSession } from '@/components/waiter/TableManager'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function WaiterPage() {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/admin')

    // Use admin client to bypass RLS for user/role lookup (safe — server-only)
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) redirect('/unauthorized')

    const restaurantId = userData.restaurant_id

    // Fetch all tables AND their active sessions (if any)
    const { data: tables } = await supabase
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
        // Supabase returns an array of matched joined records. We only care about 'active' ones.
        const sessions = table.sessions as unknown as { status: string }[]
        const activeSession = sessions?.find((s) => s.status === 'active')
        return {
            ...table,
            activeSession: activeSession || null
        }
    }) || []

    // Getting App URL from env for QR generation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return (
        <TableManager
            initialTables={mappedTables as unknown as TableWithSession[]}
            restaurantId={restaurantId}
            appUrl={appUrl}
        />
    )
}
