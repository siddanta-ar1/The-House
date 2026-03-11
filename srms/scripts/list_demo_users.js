import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwvuflbzacromudviaab.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dnVmbGJ6YWNyb211ZHZpYWFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyMzIxOSwiZXhwIjoyMDY3NDk5MjE5fQ.RR7vxnE1LFx6B8Up1tOF7yp4g5vhCzXi_8akjvkl0p8'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function listDemoUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role_id, restaurant_id')
        .order('role_id')

    if (error) {
        console.error('❌ Failed to fetch users:', error.message)
        process.exit(1)
    }

    console.log('\n=== Demo Users ===')
    data.forEach(u => {
        const roleName = {
            1: 'Super Admin',
            2: 'Manager',
            3: 'Kitchen',
            4: 'Waiter',
            5: 'Customer'
        }[u.role_id] || 'Unknown'
        console.log(`${u.full_name} (${u.id}) -> ${roleName} (role_id=${u.role_id})`)
    })
    console.log('=================\n')
}

listDemoUsers()
