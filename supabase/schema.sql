-- Chạy trong Supabase SQL Editor. Không ảnh hưởng Google Sheets hiện tại.
create table if not exists public.erp_records (
  id text primary key,
  table_name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index if not exists erp_records_table_name_idx on public.erp_records(table_name);
alter table public.erp_records enable row level security;

create table if not exists public.sync_log (
  id bigint generated always as identity primary key,
  provider text not null,
  table_name text,
  rows_synced integer not null default 0,
  status text not null,
  message text,
  created_at timestamptz not null default now()
);
alter table public.sync_log enable row level security;
