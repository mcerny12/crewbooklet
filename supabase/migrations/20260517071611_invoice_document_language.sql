-- Add a document_language column to invoices so issued PDFs render in the
-- language they were finalized in, regardless of the user's current app
-- locale. Drafts may leave this NULL (the print page falls back to the
-- current app language until the document is finalized).
--
-- Supported values: 'de' | 'en'. Free-form check makes it easy to extend.

alter table public.invoices
  add column if not exists document_language text;

alter table public.invoices
  drop constraint if exists invoices_document_language_check;

alter table public.invoices
  add constraint invoices_document_language_check
  check (document_language is null or document_language in ('de', 'en'));

comment on column public.invoices.document_language is
  'Language the invoice PDF renders in (''de'' | ''en''). NULL for drafts that follow the current app locale; set when the invoice is finalized.';
