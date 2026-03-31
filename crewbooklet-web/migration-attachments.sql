-- ─── Invoice Attachments ───────────────────────────────────────────────────

-- 1. Create storage bucket (run once; skip if already exists)
insert into storage.buckets (id, name, public)
values ('invoice-attachments', 'invoice-attachments', false)
on conflict (id) do nothing;

-- 2. Storage policies
create policy "Authenticated users can upload invoice attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'invoice-attachments');

create policy "Authenticated users can read invoice attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'invoice-attachments');

create policy "Authenticated users can delete invoice attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'invoice-attachments');

-- 3. Table
create table if not exists invoice_attachments (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  invoice_id    uuid not null references invoices(id) on delete cascade,
  label         text,          -- null = invoice-level; item description = item-level
  file_name     text not null,
  file_path     text not null,
  file_size     bigint,
  mime_type     text
);

alter table invoice_attachments enable row level security;

create policy "Users can view own invoice attachments"
  on invoice_attachments for select
  using (
    invoice_id in (select id from invoices where user_id = auth.uid())
  );

create policy "Users can insert own invoice attachments"
  on invoice_attachments for insert
  with check (
    invoice_id in (select id from invoices where user_id = auth.uid())
  );

create policy "Users can delete own invoice attachments"
  on invoice_attachments for delete
  using (
    invoice_id in (select id from invoices where user_id = auth.uid())
  );
