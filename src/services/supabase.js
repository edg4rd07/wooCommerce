import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvgqgzlsbucpnsdwzcj.supabase.co';
const supabaseKey = 'sb_publishable_OD5yE7IlXH7czps5aD-xrg_lzdsYPK9';

export const supabase = createClient(supabaseUrl, supabaseKey);
