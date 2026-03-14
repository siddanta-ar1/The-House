require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // bill_split_items - all columns
  const { data: d1, error: e1 } = await sb.from('bill_split_items').select('*').limit(1);
  console.log('bill_split_items *:', d1, 'Error:', e1?.message || 'none');

  // bill_splits - all columns
  const { data: d2, error: e2 } = await sb.from('bill_splits').select('*').limit(1);
  console.log('bill_splits *:', d2, 'Error:', e2?.message || 'none');

  // payment_verifications - all columns
  const { data: d3, error: e3 } = await sb.from('payment_verifications').select('*').limit(1);
  console.log('payment_verifications *:', d3, 'Error:', e3?.message || 'none');

  // orders - check all columns
  const { data: d4, error: e4 } = await sb.from('orders').select('id, paid_at, session_id, total_amount, payment_status').limit(1);
  console.log('orders (paid_at):', d4, 'Error:', e4?.message || 'none');

  // Check if features_v2 exists in restaurant_settings
  const { data: d5, error: e5 } = await sb.from('restaurant_settings').select('*').eq('restaurant_id', '11111111-1111-1111-1111-111111111111').single();
  console.log('restaurant_settings keys:', d5 ? Object.keys(d5) : null, 'Error:', e5?.message || 'none');
  if (d5?.features_v2) console.log('features_v2 content:', d5.features_v2);
  if (d5?.features) console.log('features content:', d5.features);
}
test().catch(console.error);
