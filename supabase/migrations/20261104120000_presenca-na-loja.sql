-- =============================================================================================
-- Presença na loja (Loja ao vivo, Fase 2)
--
-- Três tabelas, três funções e um agendamento opcional. NENHUMA escrita de dado.
--
-- Cada navegador com aceite de estatística avisa, a cada minuto com a aba visível, que está na
-- loja. O que fica é efêmero e só em FAIXAS: o tipo de página, a joia (resolvida no servidor pelo
-- slug), os itens da sacola, a faixa de origem e a faixa de aparelho. Nenhuma coluna guarda IP,
-- user agent, referrer ou URL.
--
-- O id é o da PRESENÇA: aleatório, por navegador e por dia (troca à meia-noite de Brasília), sem
-- ligação com o id do contador de visitas (`store_visits`).
--
-- Os três vocabulários são cópia deliberada do contrato do corpo (`packages/core/src/visits/
-- presence.ts`); o guarda de esquema da loja lê este arquivo e compara com as constantes.
-- =============================================================================================


-- ---------------------------------------------------------------------------------------------
-- 1. As tabelas
--
-- `store_presence` — o estado efêmero, uma linha por id da presença; vale 30 min sem batida.
-- `store_presence_minutes` — quem estava na loja em cada minuto, (minuto, id); vive até 1 hora.
-- `store_presence_carts` — a marca de que o navegador pôs joia na sacola naquele dia, com a hora
--   da primeira sacola, (dia, id); vive 14 dias.
--
-- RLS ligada, NENHUMA policy, e `revoke all` dos três papéis: só as funções `security definer`
-- escrevem e leem.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.store_presence (
  presence_id  uuid primary key,
  last_seen_at timestamptz not null,
  page_kind    text not null check (page_kind in ('joia', 'lista', 'sacola', 'checkout', 'guia', 'outra')),
  product_id   uuid null references public.products (id) on delete set null,
  cart_items   smallint not null default 0 check (cart_items between 0 and 99),
  source       text not null check (source in ('instagram', 'google', 'whatsapp', 'direto', 'outros')),
  device       text not null check (device in ('celular', 'computador', 'tablet')),
  check (product_id is null or page_kind = 'joia')
);

create index if not exists store_presence_last_seen_at_idx on public.store_presence (last_seen_at);

create table if not exists public.store_presence_minutes (
  minute      timestamptz not null,
  presence_id uuid not null,
  primary key (minute, presence_id)
);

create table if not exists public.store_presence_carts (
  day           date not null,
  presence_id   uuid not null,
  first_cart_at timestamptz not null,
  primary key (day, presence_id)
);

alter table public.store_presence enable row level security;
alter table public.store_presence_minutes enable row level security;
alter table public.store_presence_carts enable row level security;

revoke all on table public.store_presence from public, anon, authenticated;
revoke all on table public.store_presence_minutes from public, anon, authenticated;
revoke all on table public.store_presence_carts from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 2. O host na forma canônica — a cópia SQL de `canonicalHost` (`core/analytics/host.ts`), passo a
-- passo e na mesma ordem: sem espaço nas pontas, minúsculas; tudo a partir do ÚLTIMO `:` cai fora,
-- salvo quando há `]` (IPv6 entre colchetes); um ponto final sai; o `www.` da frente sai. O guarda
-- `hostCanonicoPareado.test.ts` (suíte da loja) lê os dois do disco, e o probe da presença executa os
-- mesmos casos de borda aqui que o guarda executa no TypeScript.
-- ---------------------------------------------------------------------------------------------

create or replace function public.store_canonical_host(p_host text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  h text := lower(regexp_replace(coalesce(p_host, ''), '^\s+|\s+$', '', 'g'));
begin
  if position(':' in h) > 0 and position(']' in h) = 0 then
    h := regexp_replace(h, ':[^:]*$', '');
  end if;
  if right(h, 1) = '.' then
    h := left(h, -1);
  end if;
  if left(h, 4) = 'www.' then
    h := substr(h, 5);
  end if;
  return h;
end;
$$;

revoke execute on function public.store_canonical_host(text) from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 3. A poda — presença de 30 min, minuto de 1 hora, marca de sacola de 14 dias
--
-- `security invoker` e sem grant: quem a chama é a gravação (definer), a leitura do painel e o job.
-- ---------------------------------------------------------------------------------------------

create or replace function public.prune_store_presence(p_agora timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.store_presence where last_seen_at < p_agora - interval '30 minutes';
  delete from public.store_presence_minutes where minute < p_agora - interval '1 hour';
  delete from public.store_presence_carts where day < public.store_day(p_agora) - 14;
end;
$$;

revoke execute on function public.prune_store_presence(timestamptz) from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 4. A gravação — chamada só pela function `visit` (ação `ping`), com a chave de serviço
--
-- Recebe o host da origem e o compara com `store_production_host()`: fora dele não grava e
-- responde `interno`. A joia chega como SLUG e é resolvida aqui. Teto de 5.000 linhas na presença:
-- um id novo acima dele responde `teto` e não grava.
--
-- Desfechos: `gravada`, `interno`, `teto`. `ate` (a próxima 00:00 de Brasília, quando o id troca)
-- e `agora` saem em milissegundos `bigint`. `p_agora` existe só para os probes.
--
-- O `grant … to service_role` é OBRIGATÓRIO: o `revoke … from public` tira o papel de serviço junto.
-- ---------------------------------------------------------------------------------------------

create or replace function public.record_store_presence(
  p_id uuid,
  p_page_kind text,
  p_product_slug text,
  p_cart_items integer,
  p_source text,
  p_device text,
  p_host text,
  p_agora timestamptz default now()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_dia date := public.store_day(p_agora);
  v_ate timestamptz := public.store_day_start(v_dia + 1);
  v_prod text := public.store_canonical_host(public.store_production_host());
  v_produto uuid;
  v_desfecho text;
begin
  if v_prod = '' or public.store_canonical_host(p_host) <> v_prod then
    v_desfecho := 'interno';
  else
    perform public.prune_store_presence(p_agora);

    if not exists (select 1 from public.store_presence where presence_id = p_id)
       and (select count(*) from public.store_presence) >= 5000 then
      v_desfecho := 'teto';
    else
      if p_page_kind = 'joia' and p_product_slug is not null then
        select id into v_produto from public.products where slug = p_product_slug limit 1;
      end if;

      insert into public.store_presence (presence_id, last_seen_at, page_kind, product_id, cart_items, source, device)
      values (p_id, p_agora, p_page_kind, v_produto, p_cart_items, p_source, p_device)
      on conflict (presence_id) do update
        set last_seen_at = excluded.last_seen_at,
            page_kind = excluded.page_kind,
            product_id = excluded.product_id,
            cart_items = excluded.cart_items,
            source = excluded.source,
            device = excluded.device;

      insert into public.store_presence_minutes (minute, presence_id)
      values (date_trunc('minute', p_agora), p_id)
      on conflict do nothing;

      if p_cart_items > 0 then
        insert into public.store_presence_carts (day, presence_id, first_cart_at)
        values (v_dia, p_id, p_agora)
        on conflict do nothing;
      end if;

      v_desfecho := 'gravada';
    end if;
  end if;

  return jsonb_build_object(
    'desfecho', v_desfecho,
    'ate', (extract(epoch from v_ate) * 1000)::bigint,
    'agora', (extract(epoch from p_agora) * 1000)::bigint
  );
end;
$$;

revoke execute on function public.record_store_presence(uuid, text, text, integer, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_store_presence(uuid, text, text, integer, text, text, text, timestamptz)
  to service_role;


-- ---------------------------------------------------------------------------------------------
-- 5. O terceiro caminho da poda — um job a cada 10 min, SÓ se o pg_cron já estiver instalado.
-- Não cria a extensão. `cron.schedule` com nome é upsert.
-- ---------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'prune-store-presence',
      '*/10 * * * *',
      $job$ select public.prune_store_presence(now()) $job$
    );
  else
    raise notice 'pg_cron ausente: a poda da presença roda só na gravação e na leitura';
  end if;
end $$;
