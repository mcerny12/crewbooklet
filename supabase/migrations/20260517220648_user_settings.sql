-- Per-user settings table. First setting: app_language ('de' | 'en').
-- Designed to extend without further migrations for simple key/value-like
-- preferences (UI density, default views, notification prefs, etc.) — each
-- becomes a typed column.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_language text not null default 'de',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_app_language_check check (app_language in ('de', 'en'))
);

alter table public.user_settings enable row level security;

-- Users can only read/insert/update their own row.
drop policy if exists "Users can read their own settings" on public.user_settings;
create policy "Users can read their own settings"
  on public.user_settings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own settings" on public.user_settings;
create policy "Users can insert their own settings"
  on public.user_settings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own settings" on public.user_settings;
create policy "Users can update their own settings"
  on public.user_settings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- updated_at trigger
create or replace function public.set_user_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_user_settings_updated_at();

comment on table public.user_settings is
  'Per-user preferences. RLS restricts each row to its owning auth user. Add new columns directly for new typed settings.';
comment on column public.user_settings.app_language is
  'App UI language (''de'' | ''en''). Independent of invoice.document_language.';
