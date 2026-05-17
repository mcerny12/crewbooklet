#!/usr/bin/env node
// One-shot repair: copies missing line items from each broken revision
// invoice's source onto the revision. Does NOT touch aconto_applications
// (those are already present) and recomputes the stored line-item subtotal.
//
// Approved by the user on 2026-05-17. Safe to re-run: skips revisions that
// already have positive line items.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//     node scripts/repair-broken-revision-invoices.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const POSITIVE_TYPES = new Set(['service', 'expense', 'other']);

async function findBroken() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      revision_of_invoice_id,
      original_invoice_id,
      items:invoice_items!invoice_items_invoice_id_fkey(id, item_type),
      aconto_applications:invoice_aconto_applications!invoice_aconto_applications_invoice_id_fkey(id)
    `)
    .eq('document_type', 'revision_invoice');
  if (error) throw error;
  return (data ?? []).filter(inv => {
    const positives = (inv.items ?? []).filter(it =>
      POSITIVE_TYPES.has(it.item_type ?? 'service'),
    );
    return positives.length === 0 && (inv.aconto_applications ?? []).length > 0;
  });
}

async function fetchSourceItems(sourceId) {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', sourceId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function repair(revision) {
  const sourceId = revision.revision_of_invoice_id ?? revision.original_invoice_id;
  if (!sourceId) {
    console.log(`  ! ${revision.invoice_number}: no source id — skipped`);
    return;
  }

  const sourceItems = await fetchSourceItems(sourceId);
  if (sourceItems.length === 0) {
    console.log(`  ! ${revision.invoice_number}: source has no items either — skipped`);
    return;
  }

  const rows = sourceItems.map(it => ({
    invoice_id: revision.id,
    sort_order: it.sort_order,
    description: it.description,
    sub_description: it.sub_description ?? null,
    quantity: it.quantity,
    unit_price: it.unit_price,
    tax_rate: it.tax_rate,
    total: it.total,
    item_type: it.item_type ?? 'service',
    source_invoice_id: it.source_invoice_id ?? null,
  }));

  const { error: insertErr } = await supabase.from('invoice_items').insert(rows);
  if (insertErr) {
    console.log(`  ! ${revision.invoice_number}: insert failed: ${insertErr.message}`);
    return;
  }

  const newSubtotal = rows.reduce((s, r) => s + (r.total ?? 0), 0);
  const { error: updErr } = await supabase
    .from('invoices')
    .update({ total: newSubtotal })
    .eq('id', revision.id);
  if (updErr) {
    console.log(`  ! ${revision.invoice_number}: total update failed: ${updErr.message}`);
    return;
  }

  console.log(`  ✓ ${revision.invoice_number}: copied ${rows.length} item(s), subtotal=${newSubtotal.toFixed(2)}`);
}

async function main() {
  const broken = await findBroken();
  if (broken.length === 0) {
    console.log('No broken revision invoices found — nothing to repair.');
    return;
  }
  console.log(`Repairing ${broken.length} broken revision invoice(s)...`);
  for (const rev of broken) {
    await repair(rev);
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
