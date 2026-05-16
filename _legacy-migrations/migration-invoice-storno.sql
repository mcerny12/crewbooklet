-- Migration: Storno (cancellation) and Revision invoice support
-- Run this in Supabase SQL editor AFTER all earlier invoice migrations.
-- This migration is additive: no existing columns are altered, no rows are touched.

-- MARK: - Storno / revision columns on invoices

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrects_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storno_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_of_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replaced_by_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS storno_reason TEXT,
  ADD COLUMN IF NOT EXISTS storno_date DATE,
  ADD COLUMN IF NOT EXISTS pdf_document_label TEXT;

-- Constrain document_type to known values. Drop first so the migration is re-runnable.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_document_type_check;
ALTER TABLE invoices
  ADD CONSTRAINT invoices_document_type_check
  CHECK (document_type IN ('invoice', 'storno_invoice', 'revision_invoice'));

-- Helpful indices for the new lookup paths.
CREATE INDEX IF NOT EXISTS idx_invoices_original_invoice_id ON invoices(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_corrects_invoice_id ON invoices(corrects_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_revision_of_invoice_id ON invoices(revision_of_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);

-- MARK: - invoice_events audit log

CREATE TABLE IF NOT EXISTS invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  payload JSONB
);

ALTER TABLE invoice_events DROP CONSTRAINT IF EXISTS invoice_events_event_type_check;
ALTER TABLE invoice_events
  ADD CONSTRAINT invoice_events_event_type_check
  CHECK (event_type IN (
    'invoice_storno_created',
    'invoice_revision_created',
    'invoice_cancelled',
    'invoice_replaced_by_revision'
  ));

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_id ON invoice_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_events_event_type ON invoice_events(event_type);

ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoice events" ON invoice_events;
CREATE POLICY "Users can view own invoice events"
  ON invoice_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_events.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own invoice events" ON invoice_events;
CREATE POLICY "Users can insert own invoice events"
  ON invoice_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_events.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );
