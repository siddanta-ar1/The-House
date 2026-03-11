import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffManager from '@/components/admin/StaffManager'

export const dynamic = 'force-dynamic'

export default async function StaffManagementPage() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/admin')

    const adminSupabase = await createAdminClient()

    // 1. Get current user's restaurant_id and role
    const { data: currentUserData } = await adminSupabase
        .from('users')
        .select('restaurant_id, role_id, roles(name)')
        .eq('id', user.id)
        .single()

    if (!currentUserData?.restaurant_id) redirect('/unauthorized')

    const restaurantId = currentUserData.restaurant_id
    const currentUserRole = (currentUserData.roles as unknown as { name: string } | null)?.name || ''

    // 2. Fetch all roles available
    const { data: roles } = await adminSupabase
        .from('roles')
        .select('*')
        .order('id', { ascending: true })

    // 3. Fetch all staff for this restaurant (excluding customers if any)
    const { data: staffMembers } = await adminSupabase
        .from('users')
        .select(`
            id,
            full_name,
            avatar_url,
            is_active,
            role_id,
            created_at,
            roles (
                id,
                name,
                description
            )
        `)
        .eq('restaurant_id', restaurantId)
        .neq('role_id', 5) // Exclude standard customers from the staff dashboard
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Staff Accounts</h1>
                        <p className="text-gray-500 mt-1">Manage employee access and roles</p>
                    </div>
                </div>
            </header>

            <StaffManager
                initialStaff={staffMembers || []}
                roles={roles || []}
                currentUserRole={currentUserRole}
                currentUserId={user.id}
            />
        </div>
    )
}
