-- Chạy trong Supabase SQL Editor. Không ảnh hưởng Google Sheets hiện tại.
create table if not exists public.erp_records (
  id text primary key,
  table_name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index if not exists erp_records_table_name_idx on public.erp_records(table_name);
create unique index if not exists erp_records_order_no_idx on public.erp_records ((payload->>'order_no')) where table_name='orders';
create unique index if not exists erp_records_email_idx on public.erp_records (lower(payload->>'email')) where table_name='users';
alter table public.erp_records enable row level security;

create table if not exists public.erp_sessions (
  token_hash text primary key,
  user_id text not null,
  expires_at timestamptz not null
);
alter table public.erp_sessions enable row level security;

create or replace function public.erp_update_record(p_id text, p_table text, p_expected jsonb, p_changes jsonb)
returns boolean language plpgsql security invoker as $$
declare v_payload jsonb;
begin
  select payload into v_payload from public.erp_records where id=p_id and table_name=p_table for update;
  if not found then return false; end if;
  if exists(select 1 from jsonb_each(p_expected) e where v_payload->e.key is distinct from e.value) then return false; end if;
  update public.erp_records set payload=payload||p_changes, version=version+1, updated_at=now() where id=p_id and table_name=p_table;
  return true;
end $$;

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
