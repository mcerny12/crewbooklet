import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data } = await supabase
  .from('invoices')
  .select('id, invoice_number, user_id, document_type')
  .in('invoice_number', ['INV2026-004', 'INV2026-004-rev', 'INV2026-003']);
for (const i of data) console.log(i);
