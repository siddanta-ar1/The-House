import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// The service_role key allows bypassing RLS and creating users via the admin API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires this env var

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.log("To use the admin API, you must add SUPABASE_SERVICE_ROLE_KEY to your .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function forceCreateAdmin() {
    console.log("Attempting to forcefully create admin user via Admin API...");

    const { data, error } = await supabase.auth.admin.createUser({
        email: 'admin@thehouse.com',
        password: 'HouseAdmin2026!',
        email_confirm: true // Auto-confirm
    });

    if (error) {
        console.error("❌ Admin API Create failed:", error.message);
    } else {
        console.log("✅ Successfully created admin user!");
        console.log("Email: admin@thehouse.com");
        console.log("Password: HouseAdmin2026!");
    }
}

forceCreateAdmin();
