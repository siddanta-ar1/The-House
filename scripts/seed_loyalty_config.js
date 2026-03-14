const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const rid = '11111111-1111-1111-1111-111111111111';
  
  // 1. Upsert loyalty_config
  const { data, error } = await sb.from('loyalty_config').upsert({
    restaurant_id: rid,
    points_per_dollar: 10,
    redemption_threshold: 100,
    redemption_value: 5.00,
    silver_threshold: 500,
    gold_threshold: 1500,
    platinum_threshold: 5000,
    birthday_bonus_points: 50,
    signup_bonus_points: 25,
    is_active: true
  }, { onConflict: 'restaurant_id' }).select();
  
  console.log('loyalty_config:', JSON.stringify(data, null, 2));
  if (error) console.log('loyalty_config Error:', error.message);

  // 2. Update features_v2 in settings
  const { data: s, error: se } = await sb.from('settings')
    .update({ features_v2: {
      takeoutEnabled: true,
      loyaltyEnabled: true,
      dynamicPricingEnabled: false,
      ingredientTrackingEnabled: false,
      staffShiftsEnabled: false,
      splitBillingEnabled: true,
      serviceRequestsEnabled: true,
      nepalPayEnabled: true,
      defaultTaxRate: 13
    }})
    .eq('restaurant_id', rid)
    .select('features_v2');
  
  console.log('Settings:', JSON.stringify(s));
  if (se) console.log('Settings error:', se.message);
  
  console.log('Done!');
})();
