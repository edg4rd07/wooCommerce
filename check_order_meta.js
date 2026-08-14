import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rbvgqgzlsbucpnsdwzcj.supabase.co',
  'sb_publishable_OD5yE7IlXH7czps5aD-xrg_lzdsYPK9'
);

async function checkOrder() {
  const { data, error } = await supabase.from('app_data').select('data').eq('id', 'settings').single();
  if (error || !data) {
    console.error("No settings found", error);
    return;
  }
  
  const config = data.data;
  const authHeader = btoa(`${config.consumerKey}:${config.consumerSecret}`);
  const baseUrl = config.storeUrl.replace(/\/$/, '');
  const url = `${baseUrl}/wp-json/wc/v3/orders/20395`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error("WC Error:", response.status);
    return;
  }

  const order = await response.json();
  console.log("Customer Note:", order.customer_note);
  console.log("Meta Data:");
  order.meta_data.forEach(m => {
    // filtering out useless ones for readability
    if (!m.key.startsWith('_yith_pos') && !m.key.startsWith('_wc_') && !m.key.startsWith('yith_')) {
      console.log(`  ${m.key}: ${JSON.stringify(m.value)}`);
    }
  });
}

checkOrder();
