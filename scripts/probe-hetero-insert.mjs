import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const invoiceId = 'd219525a-efad-4e7b-bc66-95e77e448b20'; // INV2026-004-rev
const { data: existing } = await supabase
  .from('invoice_items')
  .select('*')
  .eq('invoice_id', invoiceId)
  .order('sort_order', { ascending: true });
console.log('existing count:', existing.length);

// Snapshot rows like the UI would (strip id), and add one heterogeneous row
// missing `item_type` / `source_invoice_id`.
const stripped = existing.map(({ id, ...rest }) => rest);
const newItem = {
  invoice_id: invoiceId,
  sort_order: existing.length,
  description: '',
  sub_description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  total: 0,
};
const payload = [...stripped, newItem];

// Try insert WITHOUT deleting (read-only probe). Roll back via second delete
// of any rows we just made (sort_order >= existing.length, fresh ids only).
const { data, error } = await supabase
  .from('invoice_items')
  .insert(payload)
  .select();
if (error) {
  console.log('INSERT error:', JSON.stringify(error, null, 2));
} else {
  console.log('INSERT ok, returned rows:', data.length);
  // Cleanup: delete the rows we just inserted to leave DB unchanged.
  const newIds = data.map(r => r.id);
  await supabase.from('invoice_items').delete().in('id', newIds);
  console.log('cleanup done');
}
