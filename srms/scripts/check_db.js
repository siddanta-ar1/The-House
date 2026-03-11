const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('Checking with Admin (Service Role) Key:');
    const { data: adminTables, error: adminErr } = await adminClient.from('tables').select('*');
    console.log(`Admin found ${adminTables?.length || 0} tables. Error:`, adminErr);
    if (adminTables?.length > 0) {
        console.log('First table QR token:', adminTables[0].qr_token);
    }

    console.log('\nChecking with Anon (Public) Key:');
    const { data: anonTables, error: anonErr } = await anonClient.from('tables').select('*');
    console.log(`Anon found ${anonTables?.length || 0} tables. Error:`, anonErr);
}

check().catch(console.error);
