-- ============================================================
-- Fix invoice numbering: renumber all invoices sequentially
-- by year and creation date, using format INV{YYYY}-{NNN}
--
-- Run in Supabase Dashboard → SQL Editor
-- Safe: only updates invoice_number, ordered by created_at
-- ============================================================

WITH numbered AS (
  SELECT
    id,
    'INV' || EXTRACT(YEAR FROM created_at)::int
      || '-'
      || LPAD(
           ROW_NUMBER() OVER (
             PARTITION BY EXTRACT(YEAR FROM created_at)
             ORDER BY created_at
           )::text,
           3, '0'
         ) AS new_number
  FROM invoices
)
UPDATE invoices
SET invoice_number = numbered.new_number
FROM numbered
WHERE invoices.id = numbered.id;
