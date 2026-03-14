import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import ReportsViewer from './ReportsViewer'

export const revalidate = 0

export default async function AdminReportsPage() {
    const { restaurantId: rid } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const { data: reports } = await adminSupabase
        .from('eod_reports')
        .select('*')
        .eq('restaurant_id', rid)
        .order('report_date', { ascending: false })
        .limit(30)

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">End-of-Day Reports</h1>
                <p className="text-gray-500 mt-1">Generate and review daily Z-reports.</p>
            </div>
            <ReportsViewer initialReports={reports || []} restaurantId={rid} />
        </div>
    )
}
