#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: inv } = await supabase
  .from('invoices')
  .select('id, invoice_number, total, document_type, document_language')
  .eq('invoice_number', 'INV2026-004-rev')
  .single();
console.log('invoice:', inv);

const { data: items } = await supabase
  .from('invoice_items')
  .select('*')
  .eq('invoice_id', inv.id)
  .order('sort_order', { ascending: true });
console.log(`items (${items.length}):`);
for (const it of items) {
  console.log(`  sort=${it.sort_order} type=${it.item_type} qty=${it.quantity} unit=${it.unit_price} total=${it.total} desc="${it.description}"`);
}

const { data: apps } = await supabase
  .from('invoice_aconto_applications')
  .select('*')
  .eq('invoice_id', inv.id);
console.log(`aconto applications (${apps.length}):`);
for (const a of apps) {
  console.log(`  src=${a.source_invoice_number} applied=${a.applied_amount}`);
}
