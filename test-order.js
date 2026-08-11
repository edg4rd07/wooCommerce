const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rbvgqgzlsbucpnsdwzcj.supabase.co', 'sb_publishable_OD5yE7IlXH7czps5aD-xrg_lzdsYPK9');

async function run() {
  const { data } = await supabase.from('app_data').select('data').eq('id', 'settings').single();
  const wc = data.data;
  const url = `${wc.url}/wp-json/wc/v3/orders/20373`;
  const auth = Buffer.from(`${wc.consumerKey}:${wc.consumerSecret}`).toString('base64');
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}` }
  });
  const order = await res.json();
  console.log("Customer Note:", order.customer_note);
  const metaDate = order.meta_data.find(m => m.key.includes('date') || m.key.includes('fecha') || m.key.includes('time'));
  console.log("Meta Data:", metaDate);
}
run();
