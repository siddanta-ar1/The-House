import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import ShiftsManager from './ShiftsManager'

export const revalidate = 0

export default async function AdminShiftsPage() {
    const { restaurantId: rid } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const [{ data: active }, { data: recent }] = await Promise.all([
        adminSupabase.from('staff_shifts').select('*, users(full_name, role_id, roles(name))')
            .eq('restaurant_id', rid).is('clock_out', null).order('clock_in', { ascending: false }),
        adminSupabase.from('staff_shifts').select('*, users(full_name, role_id, roles(name))')
            .eq('restaurant_id', rid).not('clock_out', 'is', null)
            .order('clock_in', { ascending: false }).limit(50),
    ])

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Staff Shifts</h1>
                <p className="text-gray-500 mt-1">Monitor active shifts and approve past timecards.</p>
            </div>
            <ShiftsManager activeShifts={active || []} recentShifts={recent || []} />
        </div>
    )
}
