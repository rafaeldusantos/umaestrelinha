-- Feature 79 — mobile-adm: o aviso de pedido no celular (Web Push), `AD-062`.
--
-- Três blocos (o segundo com uma tabela e a RPC), nenhuma escrita de dado:
--
-- 1. `public.push_subscriptions` — uma linha por aparelho inscrito (o `endpoint` que o navegador
--    entregou e as duas chaves da cifra), da conta admin que ativou os avisos naquele aparelho, com
--    os eventos que ele quer receber. RLS ligada e NENHUMA policy (`MAN-23`): nem `anon` nem
--    `authenticated` — admin incluído — leem ou gravam pelo PostgREST. Quem lê e grava é a service
--    role: a porta `atelie-avisos` (que confere `has_role`) e o motor `send-notification`.
--    `endpoint` é único (`MAN-27`: o mesmo aparelho é uma linha só, da conta que gravou por último),
--    e a linha cai junto com a conta (`MAN-29`, `on delete cascade`).
--
-- 2. `public.push_test_claims` + `public.claim_push_test(p_user_id, p_endpoint)` — o teto do aviso
--    de teste, um a cada 30 s por CONTA (`MAN-33`). O instante do último teste mora numa linha POR
--    CONTA, fora da inscrição: quando o serviço de push responde "gone", a porta apaga a linha do
--    aparelho testado (`MAN-35`), e um teto gravado nela sumiria junto — o teste seguinte noutro
--    aparelho da mesma conta sairia na hora (medido no probe 03 da feature). Mesma RLS sem policy e
--    os mesmos privilégios de `push_subscriptions`; a linha cai com a conta. A RPC decide de forma
--    atômica: trava por conta, confere que o aparelho é da conta, confere o teto, grava. Ler e depois
--    gravar pelo PostgREST deixaria duas chamadas quase simultâneas passarem as duas. `execute` só
--    para a service role.
--
-- 3. O `check` de `order_notifications.channel` recriado com `push` — a memória "já avisei?" ganha o
--    canal do celular (`claim_order_notification(…, 'push')`). A migration da `42` não é editada
--    (`AD-017`): a constraint é derrubada e criada de novo aqui, e esta passa a ser a vigente.
--
-- O `default` e o `check` de `events` são cópia deliberada de `PUSH_EVENTS`
-- (`packages/core/src/notifications/push.ts`), guardada por `pushSubscriptionsSchema.test.ts`, que
-- importa a constante e lê este arquivo. A semântica (permissões, cascata, atomicidade) é provada
-- pelo probe `.specs/features/79-mobile-adm-aviso-de-pedido/probes/02-banco.*` contra o banco local.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  events text[] not null default array['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']::text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  constraint push_subscriptions_events_check
    check (events <@ array['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']::text[])
);

create index if not exists push_subscriptions_user_id on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Nenhuma policy, de propósito (`MAN-23`). E nenhum privilégio para os papéis de cliente.
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

-- ---------------------------------------------------------------------------------------------
-- O teto do aviso de teste (`MAN-33`): uma linha por CONTA, fora da inscrição.
-- ---------------------------------------------------------------------------------------------
create table if not exists public.push_test_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_test_at timestamptz not null
);

alter table public.push_test_claims enable row level security;

-- Nenhuma policy, de propósito (`MAN-23`). E nenhum privilégio para os papéis de cliente.
revoke all on public.push_test_claims from public, anon, authenticated;
grant select, insert, update, delete on public.push_test_claims to service_role;

-- trava → aparelho da conta? → confere → grava, numa transação só.
create or replace function public.claim_push_test(p_user_id uuid, p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (1) Uma chamada por conta de cada vez: a segunda espera a primeira terminar.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- (2) O aparelho pedido é DESTA conta? Se não, `false` sem consumir o teto.
  if not exists (
    select 1
      from public.push_subscriptions
     where user_id = p_user_id
       and endpoint = p_endpoint
  ) then
    return false;
  end if;

  -- (3) A conta testou há menos de 30 s, em qualquer aparelho (vivo ou já apagado)? Então não.
  if exists (
    select 1
      from public.push_test_claims
     where user_id = p_user_id
       and last_test_at > now() - interval '30 seconds'
  ) then
    return false;
  end if;

  -- (4) Grava o instante na linha da conta.
  insert into public.push_test_claims (user_id, last_test_at)
  values (p_user_id, now())
  on conflict (user_id) do update set last_test_at = excluded.last_test_at;

  return true;
end;
$$;

revoke all on function public.claim_push_test(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_push_test(uuid, text) to service_role;

-- ---------------------------------------------------------------------------------------------
-- O canal novo na memória de envio. Recriado aqui; o da `42` deixa de ser o vigente.
-- ---------------------------------------------------------------------------------------------
alter table public.order_notifications drop constraint if exists order_notifications_channel_check;
alter table public.order_notifications
  add constraint order_notifications_channel_check
  check (channel in ('email', 'whatsapp', 'push'));

notify pgrst, 'reload schema';
