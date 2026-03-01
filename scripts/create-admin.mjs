import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// To create a user from the backend bypassing the dashboard UI issues,
// we need the SERVICE_ROLE key, not just the anon key.
// But we can try to sign up via standard auth if email confirmation is off.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    console.log("Attempting to sign up admin user...");

    // NOTE: This will only work if "Confirm email" is disabled in 
    // Supabase Dashboard -> Authentication -> Providers -> Email
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@thehouse.com',
        password: 'HouseAdmin2026!',
    });

    if (error) {
        console.error("❌ Sign up failed:", error.message);
        console.log("\nIf this failed, it might be due to email confirmation being required, or another configuration issue in your Supabase Auth settings.");
    } else {
        console.log("✅ Successfully created admin user!");
        console.log("Email: admin@thehouse.com");
        console.log("Password: HouseAdmin2026!");
        console.log("Note: If 'Confirm email' is enabled in your Supabase settings, you will need to check your email to verify this account before you can log in.");
    }
}

createAdmin();
