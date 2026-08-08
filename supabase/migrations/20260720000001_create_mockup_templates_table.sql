-- =====================================================================
-- Tabela public.mockup_templates — metadados dos templates de mockup
-- (fundo + overlay opcional + art-zone normalizada + blend).
-- RLS escopada: leitura pública (loja/anon compõe a prévia), escrita
-- restrita a admin via public.has_role(auth.uid(), 'admin'). Trigger
-- dedicado mantém updated_at.
-- =====================================================================

create table if not exists public.mockup_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  background_url text not null,
  overlay_url text,
  art_zone jsonb not null,
  blend_mode text not null default 'multiply',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mockup_templates enable row level security;

drop policy if exists "mockup_templates_public_read" on public.mockup_templates;
create policy "mockup_templates_public_read"
  on public.mockup_templates
  for select
  using (true);

drop policy if exists "mockup_templates_admin_write" on public.mockup_templates;
create policy "mockup_templates_admin_write"
  on public.mockup_templates
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_mockup_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mockup_templates_updated_at on public.mockup_templates;
create trigger trg_mockup_templates_updated_at
  before update on public.mockup_templates
  for each row
  execute function public.touch_mockup_templates_updated_at();
