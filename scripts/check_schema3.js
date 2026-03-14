require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const rid = '11111111-1111-1111-1111-111111111111';
  
  // Test 1: Insert with code's column names  
  const { data: d1, error: e1 } = await sb.from('payment_verifications').insert({
    restaurant_id: rid,
    claimed_amount: 100,
    customer_phone: '9800000000',
    provider: 'esewa',
    screenshot_url: null,
    status: 'pending',
  }).select().single();
  console.log('Code columns insert:', d1 ? 'SUCCESS' : 'FAILED', e1?.message || '');
  
  // If failed, try migration columns
  if (e1) {
    const { data: d2, error: e2 } = await sb.from('payment_verifications').insert({
      restaurant_id: rid,
      amount: 100,
      payment_method: 'esewa',
    }).select().single();
    console.log('Migration columns insert:', d2 ? Object.keys(d2) : 'FAILED', e2?.message || '');
    // Clean up
    if (d2) await sb.from('payment_verifications').delete().eq('id', d2.id);
  } else {
    // Clean up
    if (d1) await sb.from('payment_verifications').delete().eq('id', d1.id);
  }

  // Test bill_split_items payment_method column
  // First need a bill_split
  const { data: bs, error: bse } = await sb.from('bill_splits').insert({
    session_id: null, // test if nullable 
    split_type: 'even',
    total_amount: 100,
    split_count: 2,
  }).select().single();
  console.log('bill_splits insert:', bs ? Object.keys(bs) : 'FAILED', bse?.message || '');

  // Check loyalty_config table exists
  const { data: lc, error: lce } = await sb.from('loyalty_config').select('*').limit(0);
  console.log('loyalty_config exists:', lce ? 'NO: ' + lce.message : 'YES');
  
  // Clean up bill_splits
  if (bs) await sb.from('bill_splits').delete().eq('id', bs.id);
}
test().catch(console.error);
