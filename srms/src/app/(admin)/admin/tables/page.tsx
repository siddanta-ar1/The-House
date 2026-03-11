import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TableManager from '@/components/admin/TableManager'

export const dynamic = 'force-dynamic'

export default async function TablesManagementPage() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/admin')

    const adminSupabase = await createAdminClient()

    // Get current user's restaurant_id
    const { data: currentUserData } = await adminSupabase
        .from('users')
        .select('restaurant_id')
        .eq('id', user.id)
        .single()

    if (!currentUserData?.restaurant_id) redirect('/unauthorized')

    const restaurantId = currentUserData.restaurant_id

    // Fetch all tables
    const { data: tables } = await adminSupabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('label', { ascending: true })

    // Also get the base URL for generating the full QR link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
                        <p className="text-gray-500 mt-1">Configure restaurant tables and generate QR ordering codes</p>
                    </div>
                </div>
            </header>

            <TableManager
                initialTables={tables || []}
                restaurantId={restaurantId}
                appUrl={appUrl}
            />
        </div>
    )
}
