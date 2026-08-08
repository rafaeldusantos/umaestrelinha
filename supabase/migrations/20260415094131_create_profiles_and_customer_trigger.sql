-- Tabela profiles (apenas admins)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "admin read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);
create policy "admin update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
-- Trigger: auto-criar customer no signup (clientes da loja)
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (user_id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer();
-- Index único em customers.user_id (se não existir)
create unique index if not exists idx_customers_user_id on public.customers(user_id);
