import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwvuflbzacromudviaab.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dnVmbGJ6YWNyb211ZHZpYWFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyMzIxOSwiZXhwIjoyMDY3NDk5MjE5fQ.RR7vxnE1LFx6B8Up1tOF7yp4g5vhCzXi_8akjvkl0p8'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createDemoAdmin() {
    console.log("Creating demo admin user (bypassing email verification)...")

    // We use the admin SDK to create a user that is instantly verified
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'demo@srms.app',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
            full_name: 'Demo Architect Admin'
        }
    })

    if (error) {
        console.error("❌ Failed to create auth user:", error.message)
        process.exit(1)
    }

    console.log(`✅ Auth user created: demo@srms.app (ID: ${user.user.id})`)

    // Notice we DO NOT manually insert into the `users` table because
    // the `on_auth_user_created` trigger you just added to the DB handles it!

    console.log("\n==================================")
    console.log("DEMO ACCOUNT READY!")
    console.log("Email: demo@srms.app")
    console.log("Password: Password123!")
    console.log("==================================\n")
}

createDemoAdmin()
