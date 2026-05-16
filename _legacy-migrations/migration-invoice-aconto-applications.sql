-- Migration: First-class aconto applications + typed invoice line items
-- Run this in Supabase SQL editor AFTER all earlier invoice migrations
-- (in particular: migration-invoices.sql, migration-aconto.sql, migration-invoice-storno.sql).
--
-- This migration is additive. It:
--   1. Adds `item_type` and `source_invoice_id` columns to `invoice_items`.
--   2. Creates `invoice_aconto_applications` (the new source of truth for
--      "this invoice deducts that earlier aconto/Anzahlungs-/Teilrechnung").
--   3. Backfills application rows from legacy `invoices.aconto_invoice_ids[]`.
--
-- `invoices.aconto_invoice_ids` is retained as a deprecated fallback for one release
-- so client code can read either field during the transition. A later migration drops it.

-- MARK: - invoice_items: item_type + source_invoice_id

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'service',
  ADD COLUMN IF NOT EXISTS source_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_item_type_check;
ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_item_type_check
  CHECK (item_type IN ('service', 'expense', 'aconto_deduction', 'correction_reversal', 'other'));

CREATE INDEX IF NOT EXISTS idx_invoice_items_item_type ON invoice_items(item_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_source_invoice_id ON invoice_items(source_invoice_id);

-- MARK: - invoice_aconto_applications

CREATE TABLE IF NOT EXISTS invoice_aconto_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  source_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  source_invoice_number TEXT NOT NULL,
  source_invoice_date DATE,
  label TEXT NOT NULL DEFAULT 'Aconto',
  net_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  applied_amount NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_aconto_applications_invoice_id
  ON invoice_aconto_applications(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_aconto_applications_source_invoice_id
  ON invoice_aconto_applications(source_invoice_id);

-- One source aconto can only be applied once per target invoice (prevents accidental double deduction).
-- Partial unique index — allows source_invoice_id NULL (e.g. when source is later deleted).
DROP INDEX IF EXISTS uq_invoice_aconto_applications_invoice_source;
CREATE UNIQUE INDEX uq_invoice_aconto_applications_invoice_source
  ON invoice_aconto_applications(invoice_id, source_invoice_id)
  WHERE source_invoice_id IS NOT NULL;

ALTER TABLE invoice_aconto_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own aconto applications" ON invoice_aconto_applications;
CREATE POLICY "Users can view own aconto applications"
  ON invoice_aconto_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_aconto_applications.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own aconto applications" ON invoice_aconto_applications;
CREATE POLICY "Users can insert own aconto applications"
  ON invoice_aconto_applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_aconto_applications.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own aconto applications" ON invoice_aconto_applications;
CREATE POLICY "Users can update own aconto applications"
  ON invoice_aconto_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_aconto_applications.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own aconto applications" ON invoice_aconto_applications;
CREATE POLICY "Users can delete own aconto applications"
  ON invoice_aconto_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_aconto_applications.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

-- MARK: - Backfill from legacy invoices.aconto_invoice_ids[]
-- Snapshot the source invoice's current total/number/date.
-- Re-runnable: skips rows that already exist for the same (invoice_id, source_invoice_id).

INSERT INTO invoice_aconto_applications
  (invoice_id, source_invoice_id, source_invoice_number, source_invoice_date,
   label, net_amount, tax_amount, gross_amount, applied_amount, sort_order)
SELECT
  target.id              AS invoice_id,
  source.id              AS source_invoice_id,
  source.invoice_number  AS source_invoice_number,
  source.date            AS source_invoice_date,
  'Aconto'               AS label,
  COALESCE(source.total, 0) AS net_amount,
  NULL                   AS tax_amount,
  COALESCE(source.total, 0) AS gross_amount,
  COALESCE(source.total, 0) AS applied_amount,
  0                      AS sort_order
FROM invoices target
CROSS JOIN LATERAL unnest(target.aconto_invoice_ids) AS src_id
JOIN invoices source ON source.id = src_id
WHERE target.aconto_invoice_ids IS NOT NULL
  AND array_length(target.aconto_invoice_ids, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM invoice_aconto_applications a
    WHERE a.invoice_id = target.id AND a.source_invoice_id = source.id
  );
