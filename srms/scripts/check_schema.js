require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // Try the code's expected columns
  const { data, error } = await sb.from('payment_verifications').select('id, claimed_amount, customer_phone, provider, screenshot_url, status, verified_by, verified_at, order_id, restaurant_id').limit(1);
  console.log('Code columns:', data, 'Error:', error?.message || 'none');
  
  // Try the migration columns
  const { data: d2, error: e2 } = await sb.from('payment_verifications').select('id, amount, payment_method, staff_verified, staff_verified_by, staff_verified_at, staff_rejected, order_id').limit(1);
  console.log('Migration columns:', d2, 'Error:', e2?.message || 'none');
  
  // Check bill_split_items columns
  const { data: d3, error: e3 } = await sb.from('bill_split_items').select('id, payment_status, payment_method, paid_at').limit(1);
  console.log('bill_split_items columns:', d3, 'Error:', e3?.message || 'none');

  // Check loyalty_config
  const { data: d4, error: e4 } = await sb.from('loyalty_config').select('*').limit(1);
  console.log('loyalty_config:', d4, 'Error:', e4?.message || 'none');

  // Check loyalty_members  
  const { data: d5, error: e5 } = await sb.from('loyalty_members').select('*').limit(1);
  console.log('loyalty_members:', d5, 'Error:', e5?.message || 'none');

  // Check features_v2
  const { data: d6 } = await sb.from('restaurant_settings').select('features_v2').eq('restaurant_id', '11111111-1111-1111-1111-111111111111').single();
  console.log('features_v2:', JSON.stringify(d6?.features_v2));

  // Check menu prices  
  const { data: d7 } = await sb.from('menu_items').select('name, price').eq('restaurant_id', '11111111-1111-1111-1111-111111111111').order('price', { ascending: false }).limit(8);
  console.log('Top menu items:', d7);
  
  // Check orders table columns
  const { data: d8, error: e8 } = await sb.from('orders').select('id, session_id, total_amount, payment_status, tax_amount, tip_amount, subtotal_amount').limit(1);
  console.log('orders columns:', d8, 'Error:', e8?.message || 'none');
}
test().catch(console.error);
