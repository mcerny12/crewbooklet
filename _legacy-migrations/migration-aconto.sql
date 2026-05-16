-- ============================================================
-- Migration: Aconto (advance payment) invoice support
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Flag an invoice as an aconto (advance/pre-payment) invoice
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_aconto BOOLEAN NOT NULL DEFAULT FALSE;

-- Store which aconto invoice IDs are deducted on a final invoice
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS aconto_invoice_ids UUID[] NOT NULL DEFAULT '{}';
