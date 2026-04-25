create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  cafe_id text not null,
  cafe_name text not null,
  customer_address text not null,
  status text not null check (status in ('pending', 'completed', 'cancelled', 'expired')),
  bill_amount integer,
  mint_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_sessions_cafe_status_created_idx
on public.payment_sessions (cafe_id, status, created_at desc);

create index if not exists payment_sessions_customer_created_idx
on public.payment_sessions (customer_address, created_at desc);

create or replace function public.handle_payment_session_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_sessions_set_updated_at on public.payment_sessions;

create trigger payment_sessions_set_updated_at
before update on public.payment_sessions
for each row
execute function public.handle_payment_session_updated_at();

alter table public.payment_sessions enable row level security;

drop policy if exists "payment_sessions_select_all" on public.payment_sessions;
create policy "payment_sessions_select_all"
on public.payment_sessions
for select
using (true);

drop policy if exists "payment_sessions_insert_all" on public.payment_sessions;
create policy "payment_sessions_insert_all"
on public.payment_sessions
for insert
with check (true);

drop policy if exists "payment_sessions_update_all" on public.payment_sessions;
create policy "payment_sessions_update_all"
on public.payment_sessions
for update
using (true)
with check (true);
