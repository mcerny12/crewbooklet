#!/usr/bin/env node
// Read-only audit: identify revision invoices whose line items did not copy
// from the source. These show only aconto deductions in the PDF and a
// negative total. Reports the broken revisions and proposes (but does not
// run) a repair that copies items from the corrected/original invoice.
//
// Usage:
//   node scripts/audit-broken-revision-invoices.mjs
//
// Env (required, never commit values):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: revisions, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      document_type,
      revision_of_invoice_id,
      original_invoice_id,
      total,
      items:invoice_items!invoice_items_invoice_id_fkey(id, item_type, total),
      aconto_applications:invoice_aconto_applications!invoice_aconto_applications_invoice_id_fkey(id, applied_amount)
    `)
    .eq('document_type', 'revision_invoice');

  if (error) {
    console.error('Failed to query revisions:', error);
    process.exit(1);
  }

  const positiveTypes = new Set(['service', 'expense', 'other']);
  const broken = [];

  for (const inv of revisions ?? []) {
    const items = inv.items ?? [];
    const apps = inv.aconto_applications ?? [];
    const positives = items.filter(it => positiveTypes.has(it.item_type ?? 'service'));
    const isBroken = positives.length === 0 && apps.length > 0;
    if (isBroken) {
      broken.push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        total: inv.total,
        item_count: items.length,
        positive_item_count: positives.length,
        aconto_application_count: apps.length,
        source_id: inv.revision_of_invoice_id ?? inv.original_invoice_id,
      });
    }
  }

  if (broken.length === 0) {
    console.log('No broken revision invoices found.');
    return;
  }

  console.log(`Found ${broken.length} broken revision invoice(s):`);
  console.log('');
  for (const b of broken) {
    console.log(`  ${b.invoice_number}  (status=${b.status}, total=${b.total})`);
    console.log(`    id:           ${b.id}`);
    console.log(`    source id:    ${b.source_id ?? '— missing —'}`);
    console.log(`    items:        ${b.item_count} (positive: ${b.positive_item_count})`);
    console.log(`    aconto apps:  ${b.aconto_application_count}`);
    console.log('');
  }

  console.log('Repair plan (NOT executed by this script):');
  console.log('  1. For each broken revision, fetch its source invoice (revision_of_invoice_id).');
  console.log('  2. Copy the source invoice_items into the revision (new ids, same description/qty/unit_price/tax_rate/total/item_type/sort_order).');
  console.log('  3. Verify aconto_applications already exist (do not duplicate).');
  console.log('  4. Recompute and update the revision total.');
  console.log('  5. Re-issue the PDF.');
  console.log('');
  console.log('Approval is required before mutating production data.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
