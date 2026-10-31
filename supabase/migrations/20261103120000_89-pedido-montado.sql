-- Feature 89 — o pedido montado pelo painel (a PROPOSTA), e o link que a cliente conclui na loja.
--
-- `AD-070`. A proposta e um registro do SERVIDOR, nao um pedido: ela nao entra na fila, no estoque,
-- no Dashboard nem nos guardas de dono unico de `orders`. O pedido so nasce quando a cliente conclui
-- o link, pela function `checkout`, por `create_order_from_proposal` — que grava `orders` +
-- `order_items` a partir das linhas TRAVADAS da proposta e marca a proposta concluida na MESMA
-- transacao (`CON-06`).
--
-- O que esta migration faz:
--   1. a sequencia `order_proposal_seq` e as tres tabelas (`order_proposals`, `_items`, `_events`);
--   2. `orders.proposal_id` (unico) e `orders.manual_discount`;
--   3. RLS ligada nas tres, `revoke all` dos papeis de cliente e NENHUMA policy (`SEG-05`): a loja e
--      o painel so as alcancam pelas functions, que rodam com a service role;
--   4. as tres RPCs (`save_order_proposal`, `create_order_from_proposal`,
--      `mark_order_proposal_viewed`) — `security definer`, `search_path` vazio, execute so da
--      service role;
--   5. `handle_new_customer` recriada para ADOTAR a ficha sem conta do mesmo e-mail (`A-09`).
--
-- Nao escreve dado nenhum. Guardada por `apps/store/src/shared/lib/__tests__/pedidoMontadoSchema.test.ts`
-- (a forma) e provada por `.specs/features/89-pedido-montado-pelo-painel/probes/01-proposta.sql`
-- (o comportamento).

-- ---------------------------------------------------------------------
-- 1. As tabelas
-- ---------------------------------------------------------------------
-- O numero visivel (`A-13`) e da proposta, separado do numero do pedido (`AD-043`): o do pedido so
-- existe na conclusao. `P-` + quatro digitos, no molde do `default` de `orders.order_number`.
create sequence if not exists public.order_proposal_seq;

-- "Expirada" NAO e status gravado: e derivada de `expires_at` contra o relogio (`proposalState`, em
-- `core/proposals`). Gravar teria pedido um cron e um segundo dono de "venceu?".
create table if not exists public.order_proposals (
  id uuid primary key default gen_random_uuid(),
  number text not null unique
    default ('P-' || lpad(nextval('public.order_proposal_seq')::text, 4, '0')),
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled')),
  version integer not null default 1 check (version >= 1),
  -- So o hash do token (`SEG-01`), como o acesso da convidada. O token existe uma vez, na resposta
  -- de criar ou renovar.
  token_hash text not null unique,
  expires_at timestamptz not null,
  viewed_at timestamptz,
  order_id uuid unique references public.orders (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  -- O contato. O e-mail e FIXO no link (`A-07`), e e gravado normalizado (minusculo, aparado).
  customer_name text not null check (btrim(customer_name) <> ''),
  customer_email text not null check (position('@' in customer_email) > 1),
  customer_phone text,
  customer_document text,
  -- O endereco e opcional (`MON-12`): a cliente pode preencher no link.
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  -- O cupom TRAVADO como valor (`A-06`): o `create-payment` cobra o valor, nao rele a regra.
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  coupon_discount numeric(10,2) not null default 0 check (coupon_discount >= 0),
  coupon_free_shipping boolean not null default false,
  -- O desconto avulso (`MON-08`): tipo, valor e motivo andam juntos; o motivo e interno.
  manual_discount_kind text check (manual_discount_kind in ('amount', 'percent')),
  manual_discount_value numeric(10,2),
  manual_discount_reason text,
  manual_discount numeric(10,2) not null default 0 check (manual_discount >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  promotion_discount numeric(10,2) not null default 0 check (promotion_discount >= 0),
  -- `A-12`: os itens, depois de todos os descontos, somam pelo menos R$ 1,00. A regra e de
  -- `core/proposals` (`priceProposalDraft`); este `check` e a ultima trava.
  items_total numeric(10,2) not null check (items_total >= 1.00),
  -- Contra o duplo clique em "Criar link".
  idempotency_key text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_proposals_manual_discount_together check (
    (manual_discount_kind is null) = (manual_discount_value is null)
    and (manual_discount_kind is null) = (manual_discount_reason is null)
  ),
  constraint order_proposals_manual_discount_value check (
    manual_discount_kind is null
    or (manual_discount_kind = 'percent' and manual_discount_value between 0.01 and 99.99)
    or (manual_discount_kind = 'amount' and manual_discount_value > 0)
  ),
  constraint order_proposals_manual_reason_length check (
    manual_discount_reason is null
    or char_length(btrim(manual_discount_reason)) between 1 and 120
  )
);

create index if not exists idx_order_proposals_created_at
  on public.order_proposals (created_at desc);
create index if not exists idx_order_proposals_email
  on public.order_proposals (lower(customer_email));

-- As linhas. `product_id` e `variant_id` NAO tem chave estrangeira de proposito: apagar a peca depois
-- de montar nao pode apagar nem travar a proposta — ela continua legivel pelo nome e pela foto
-- guardados aqui, e cai em `CON-09` na conclusao.
create table if not exists public.order_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.order_proposals (id) on delete cascade,
  position integer not null check (position >= 0),
  product_id uuid not null,
  variant_id uuid,
  product_name text not null,
  product_image text,
  variant_label text,
  variant_options jsonb,
  quantity integer not null check (quantity between 1 and 99),
  list_price numeric(10,2) not null check (list_price >= 0),
  -- O preco TRAVADO, ja com a promocao (`A-05`).
  unit_price numeric(10,2) not null check (unit_price >= 0),
  engraving_text text,
  requires_material boolean not null default false,
  material_kinds text[] not null default '{}',
  unique (proposal_id, position)
);

-- O historico (`HIS-01`). `channel` existe so em "link enviado" (`LNK-03`).
create table if not exists public.order_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.order_proposals (id) on delete cascade,
  kind text not null
    check (kind in ('created', 'edited', 'link_sent', 'viewed', 'renewed', 'cancelled', 'completed')),
  channel text check (channel in ('whatsapp', 'copy')),
  actor uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint order_proposal_events_channel_only_when_sent check ((kind = 'link_sent') = (channel is not null))
);

create index if not exists idx_order_proposal_events_proposal
  on public.order_proposal_events (proposal_id, created_at);

-- ---------------------------------------------------------------------
-- 2. O pedido carrega a origem e o desconto combinado
-- ---------------------------------------------------------------------
-- `unique`: uma proposta, no maximo um pedido (`CON-06`), tambem por construcao do banco.
alter table public.orders
  add column if not exists proposal_id uuid unique references public.order_proposals (id);
alter table public.orders
  add column if not exists manual_discount numeric(10,2) not null default 0
    check (manual_discount >= 0);

-- ---------------------------------------------------------------------
-- 3. Ninguem de fora le nem escreve (`SEG-05`)
-- ---------------------------------------------------------------------
-- RLS ligada e NENHUMA policy: para `anon` e `authenticated` as tabelas nao existem. A service role
-- ignora RLS e e quem as functions usam.
alter table public.order_proposals enable row level security;
alter table public.order_proposal_items enable row level security;
alter table public.order_proposal_events enable row level security;

revoke all on table public.order_proposals from public;
revoke all on table public.order_proposals from anon;
revoke all on table public.order_proposals from authenticated;
revoke all on table public.order_proposal_items from public;
revoke all on table public.order_proposal_items from anon;
revoke all on table public.order_proposal_items from authenticated;
revoke all on table public.order_proposal_events from public;
revoke all on table public.order_proposal_events from anon;
revoke all on table public.order_proposal_events from authenticated;
revoke all on sequence public.order_proposal_seq from public;
revoke all on sequence public.order_proposal_seq from anon;
revoke all on sequence public.order_proposal_seq from authenticated;

grant all on table public.order_proposals to service_role;
grant all on table public.order_proposal_items to service_role;
grant all on table public.order_proposal_events to service_role;
grant usage, select on sequence public.order_proposal_seq to service_role;

-- ---------------------------------------------------------------------
-- 4a. save_order_proposal — criar e editar, numa transacao
-- ---------------------------------------------------------------------
-- Chamada SO pela function de admin `order-proposals`, que ja conferiu o papel (`requireAdmin`) e
-- ja recalculou os valores pelo banco (`priceProposalDraft`, `PRC-01`). Esta funcao nao calcula
-- preco: ela grava o que lhe foi entregue, atomicamente, e confere o que so o banco sabe conferir.
--
-- Entrada (`p jsonb`):
--   id                 nulo ao criar; o id da proposta ao editar
--   version            ao editar, a versao que a tela leu (`CON-10`, duas abas)
--   idempotency_key    ao criar (contra o duplo clique)
--   token_hash         ao criar — o hash do token que a function gerou
--   expires_at         ao criar
--   actor              o admin (vai para `created_by` e para o historico)
--   customer_id        a ficha escolhida, ou nulo para "cliente nova"
--   customer_name, customer_email, customer_phone, customer_document
--   address_zip, address_street, address_number, address_complement, address_neighborhood,
--   address_city, address_state
--   coupon_id, coupon_code, coupon_discount, coupon_free_shipping
--   manual_discount_kind, manual_discount_value, manual_discount_reason, manual_discount
--   subtotal, promotion_discount, items_total
--   items              [{ product_id, variant_id, product_name, product_image, variant_label,
--                         variant_options, quantity, list_price, unit_price, engraving_text,
--                         requires_material, material_kinds }] — a ordem do array e a posicao
--
-- Saida: `{ id, number, version, status, customer_id, created, changed, reused }`, ou
-- `{ error }` com um destes codigos: `missing_fields`, `no_items`, `too_many_lines`,
-- `customer_not_found`, `customer_email_mismatch`, `not_found`, `not_open`, `expired`,
-- `version_conflict`. Violacao de `check` (quantidade, motivo, itens abaixo de R$ 1,00) LANCA.
--
-- A ficha da cliente (`MON-03`, `A-09`): sem `customer_id`, procura uma ficha pelo e-mail
-- normalizado (a que tem conta primeiro, depois a mais antiga) e so CRIA quando nao ha nenhuma —
-- nunca duas fichas para o mesmo e-mail. A trava consultiva por e-mail serializa duas gravacoes
-- simultaneas da mesma cliente nova, e e a MESMA chave que `handle_new_customer` usa.
--
-- Editar sem mudar nada nao sobe a versao (edge case da spec): o conteudo editavel (colunas e
-- linhas) e comparado DEPOIS de passar pelos tipos das tabelas, entao `10` e `10.00` sao iguais.
create or replace function public.save_order_proposal(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_email text := lower(btrim(coalesce(p->>'customer_email', '')));
  v_customer_id uuid := nullif(p->>'customer_id', '')::uuid;
  v_ficha_email text;
  v_itens jsonb := coalesce(p->'items', '[]'::jsonb);
  v_n_itens integer;
  v_atual public.order_proposals;
  v_novo public.order_proposals;
  v_conteudo_atual jsonb;
  v_conteudo_novo jsonb;
  v_linhas_atuais jsonb;
  v_linhas_novas jsonb;
  -- O que NAO e conteudo editavel: identidade, ciclo de vida, credencial e carimbos.
  v_fora constant text[] := array[
    'id', 'number', 'status', 'version', 'token_hash', 'expires_at', 'viewed_at', 'order_id',
    'idempotency_key', 'created_by', 'created_at', 'updated_at'
  ];
begin
  if jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) = 0 then
    return jsonb_build_object('error', 'no_items');
  end if;
  v_n_itens := jsonb_array_length(v_itens);
  if v_n_itens > 30 then
    return jsonb_build_object('error', 'too_many_lines');
  end if;

  -- Criar exige a credencial e a chave de idempotencia; editar exige a versao lida.
  if v_id is null then
    if coalesce(p->>'idempotency_key', '') = '' or coalesce(p->>'token_hash', '') = ''
       or coalesce(p->>'expires_at', '') = '' then
      return jsonb_build_object('error', 'missing_fields');
    end if;

    -- Duplo clique: a mesma chave devolve a MESMA proposta, sem gravar nada.
    select * into v_atual from public.order_proposals where idempotency_key = p->>'idempotency_key';
    if found then
      return jsonb_build_object(
        'id', v_atual.id, 'number', v_atual.number, 'version', v_atual.version,
        'status', v_atual.status, 'customer_id', v_atual.customer_id,
        'created', false, 'changed', false, 'reused', true);
    end if;
  else
    if coalesce(p->>'version', '') = '' then
      return jsonb_build_object('error', 'missing_fields');
    end if;

    select * into v_atual from public.order_proposals where id = v_id for update;
    if not found then
      return jsonb_build_object('error', 'not_found');
    end if;
    if v_atual.status <> 'open' then
      return jsonb_build_object('error', 'not_open');
    end if;
    if v_atual.expires_at <= now() then
      return jsonb_build_object('error', 'expired');
    end if;
    if v_atual.version <> (p->>'version')::integer then
      return jsonb_build_object('error', 'version_conflict');
    end if;
  end if;

  -- A ficha da cliente.
  perform pg_advisory_xact_lock(hashtext('customer-email:' || v_email));
  if v_customer_id is not null then
    select lower(btrim(c.email)) into v_ficha_email from public.customers c where c.id = v_customer_id;
    if not found then
      return jsonb_build_object('error', 'customer_not_found');
    end if;
    -- O pedido vai para a conta desta ficha: o e-mail da proposta tem de ser o dela (`A-07`).
    if v_ficha_email is distinct from v_email then
      return jsonb_build_object('error', 'customer_email_mismatch');
    end if;
  else
    select c.id into v_customer_id
      from public.customers c
     where lower(btrim(c.email)) = v_email
     order by (c.user_id is null), c.created_at nulls last, c.id
     limit 1;
    if v_customer_id is null then
      insert into public.customers (user_id, name, email, phone, cpf)
      values (null, btrim(coalesce(p->>'customer_name', '')), v_email,
              nullif(btrim(coalesce(p->>'customer_phone', '')), ''),
              nullif(btrim(coalesce(p->>'customer_document', '')), ''))
      returning id into v_customer_id;
    end if;
  end if;

  -- O conteudo novo, pelos tipos da tabela.
  v_novo := jsonb_populate_record(null::public.order_proposals, p);
  v_novo.customer_id := v_customer_id;
  v_novo.customer_email := v_email;
  -- Os mesmos defaults que a gravacao aplica, para a comparacao ver o que o banco guardaria.
  v_novo.coupon_discount := coalesce(v_novo.coupon_discount, 0);
  v_novo.coupon_free_shipping := coalesce(v_novo.coupon_free_shipping, false);
  v_novo.manual_discount := coalesce(v_novo.manual_discount, 0);
  v_novo.promotion_discount := coalesce(v_novo.promotion_discount, 0);

  -- As linhas novas, normalizadas uma vez: a comparacao e a gravacao leem o MESMO array.
  select coalesce(jsonb_agg(
           to_jsonb(i) - array['id', 'proposal_id', 'position']
             || jsonb_build_object(
                  'requires_material', coalesce(i.requires_material, false),
                  'material_kinds', to_jsonb(coalesce(i.material_kinds, '{}'::text[])))
           order by e.ord), '[]'::jsonb)
    into v_linhas_novas
    from jsonb_array_elements(v_itens) with ordinality as e(item, ord),
         lateral jsonb_populate_record(null::public.order_proposal_items, e.item) as i;

  if v_id is not null then
    v_conteudo_atual := to_jsonb(v_atual) - v_fora;
    v_conteudo_novo := to_jsonb(v_novo) - v_fora;
    select coalesce(jsonb_agg(to_jsonb(i) - array['id', 'proposal_id', 'position'] order by i.position), '[]'::jsonb)
      into v_linhas_atuais
      from public.order_proposal_items i
     where i.proposal_id = v_id;

    if v_conteudo_atual = v_conteudo_novo and v_linhas_atuais = v_linhas_novas then
      return jsonb_build_object(
        'id', v_atual.id, 'number', v_atual.number, 'version', v_atual.version,
        'status', v_atual.status, 'customer_id', v_atual.customer_id,
        'created', false, 'changed', false, 'reused', false);
    end if;

    update public.order_proposals set
      customer_id = v_novo.customer_id,
      customer_name = v_novo.customer_name,
      customer_email = v_novo.customer_email,
      customer_phone = v_novo.customer_phone,
      customer_document = v_novo.customer_document,
      address_zip = v_novo.address_zip,
      address_street = v_novo.address_street,
      address_number = v_novo.address_number,
      address_complement = v_novo.address_complement,
      address_neighborhood = v_novo.address_neighborhood,
      address_city = v_novo.address_city,
      address_state = v_novo.address_state,
      coupon_id = v_novo.coupon_id,
      coupon_code = v_novo.coupon_code,
      coupon_discount = coalesce(v_novo.coupon_discount, 0),
      coupon_free_shipping = coalesce(v_novo.coupon_free_shipping, false),
      manual_discount_kind = v_novo.manual_discount_kind,
      manual_discount_value = v_novo.manual_discount_value,
      manual_discount_reason = v_novo.manual_discount_reason,
      manual_discount = coalesce(v_novo.manual_discount, 0),
      subtotal = v_novo.subtotal,
      promotion_discount = coalesce(v_novo.promotion_discount, 0),
      items_total = v_novo.items_total,
      version = version + 1,
      updated_at = now()
    where id = v_id
    returning * into v_atual;

    delete from public.order_proposal_items where proposal_id = v_id;
  else
    insert into public.order_proposals (
      status, version, token_hash, expires_at, idempotency_key, created_by,
      customer_id, customer_name, customer_email, customer_phone, customer_document,
      address_zip, address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state,
      coupon_id, coupon_code, coupon_discount, coupon_free_shipping,
      manual_discount_kind, manual_discount_value, manual_discount_reason, manual_discount,
      subtotal, promotion_discount, items_total
    ) values (
      'open', 1, p->>'token_hash', (p->>'expires_at')::timestamptz, p->>'idempotency_key',
      nullif(p->>'actor', '')::uuid,
      v_novo.customer_id, v_novo.customer_name, v_novo.customer_email, v_novo.customer_phone,
      v_novo.customer_document,
      v_novo.address_zip, v_novo.address_street, v_novo.address_number, v_novo.address_complement,
      v_novo.address_neighborhood, v_novo.address_city, v_novo.address_state,
      v_novo.coupon_id, v_novo.coupon_code, coalesce(v_novo.coupon_discount, 0),
      coalesce(v_novo.coupon_free_shipping, false),
      v_novo.manual_discount_kind, v_novo.manual_discount_value, v_novo.manual_discount_reason,
      coalesce(v_novo.manual_discount, 0),
      v_novo.subtotal, coalesce(v_novo.promotion_discount, 0), v_novo.items_total
    )
    returning * into v_atual;
  end if;

  insert into public.order_proposal_items (
    proposal_id, position, product_id, variant_id, product_name, product_image, variant_label,
    variant_options, quantity, list_price, unit_price, engraving_text, requires_material,
    material_kinds
  )
  select v_atual.id, (e.ord - 1)::integer, i.product_id, i.variant_id, i.product_name,
         i.product_image, i.variant_label, i.variant_options, i.quantity, i.list_price,
         i.unit_price, i.engraving_text, i.requires_material, i.material_kinds
    from jsonb_array_elements(v_linhas_novas) with ordinality as e(item, ord),
         lateral jsonb_populate_record(null::public.order_proposal_items, e.item) as i;

  insert into public.order_proposal_events (proposal_id, kind, actor)
  values (v_atual.id, case when v_id is null then 'created' else 'edited' end,
          nullif(p->>'actor', '')::uuid);

  return jsonb_build_object(
    'id', v_atual.id, 'number', v_atual.number, 'version', v_atual.version,
    'status', v_atual.status, 'customer_id', v_atual.customer_id,
    'created', v_id is null, 'changed', true, 'reused', false);
end;
$$;

revoke all on function public.save_order_proposal(jsonb) from public;
revoke all on function public.save_order_proposal(jsonb) from anon;
revoke all on function public.save_order_proposal(jsonb) from authenticated;
grant execute on function public.save_order_proposal(jsonb) to service_role;

comment on function public.save_order_proposal(jsonb) is
  'Feature 89 (MON-03, MON-11, CON-10). Cria ou edita uma proposta numa transacao: confere a versao, deduplica pela chave de idempotencia, nao sobe a versao sem mudanca, e nunca cria segunda ficha para o mesmo e-mail. So a service role executa.';

-- ---------------------------------------------------------------------
-- 4b. create_order_from_proposal — o pedido nasce da proposta (`CON-06`, `PRC-03`)
-- ---------------------------------------------------------------------
-- Chamada SO pela function `checkout`, depois de conferir o token, o estoque e de calcular o frete
-- e o total por `proposalPricing`. Os ITENS e os valores travados vem da proposta, nunca do corpo:
-- de `p_order` so entram o contato editavel (nome, telefone, CPF — o e-mail e o da proposta,
-- `A-07`), o endereco, a entrega, o meio, os totais com frete, o estado do material
-- (`initialMaterialStatus`, de `core`, e o dono da regra — por isso ele vem pronto e e
-- obrigatorio), o `client_request_id`, o acesso da convidada e os ids de medicao.
--
-- Saida: `{ order_id, order_number, reused }`, ou `{ error }` com `not_found`, `unavailable`
-- (cancelada ou vencida pelo relogio DO SERVIDOR) ou `proposal_changed` (versao velha, `CON-10`).
-- A proposta ja concluida devolve o pedido dela (`reused: true`) ANTES de olhar a versao: o segundo
-- aparelho e levado ao pedido (`CON-07`).
create or replace function public.create_order_from_proposal(p_proposal_id uuid, p_version integer, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.order_proposals;
  v_order_id uuid;
  v_order_number text;
begin
  select * into v_prop from public.order_proposals where id = p_proposal_id for update;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  if v_prop.status = 'completed' then
    select o.id, o.order_number into v_order_id, v_order_number
      from public.orders o where o.proposal_id = v_prop.id;
    return jsonb_build_object('order_id', coalesce(v_order_id, v_prop.order_id),
      'order_number', v_order_number, 'reused', true);
  end if;

  if v_prop.status = 'cancelled' or v_prop.expires_at <= now() then
    return jsonb_build_object('error', 'unavailable');
  end if;

  if v_prop.version <> p_version then
    return jsonb_build_object('error', 'proposal_changed');
  end if;

  insert into public.orders (
    proposal_id, customer_id, customer_email, status,
    subtotal, discount, coupon_code, coupon_id, promotion_discount, manual_discount,
    customer_name, customer_phone, customer_document, payment_method,
    address_street, address_number, address_neighborhood, address_city, address_state,
    address_zip, address_complement,
    shipping_service_id, shipping_carrier, shipping_method,
    delivery_estimate_min, delivery_estimate_max,
    shipping_cost, total, material_status,
    client_request_id, guest_access_hash, guest_access_expires_at,
    ga_client_id, ga_session_id, analytics_declined
  ) values (
    v_prop.id, v_prop.customer_id, v_prop.customer_email, 'pending',
    v_prop.subtotal, v_prop.coupon_discount, v_prop.coupon_code, v_prop.coupon_id,
    v_prop.promotion_discount, v_prop.manual_discount,
    coalesce(nullif(btrim(p_order->>'customer_name'), ''), v_prop.customer_name),
    p_order->>'customer_phone', p_order->>'customer_document', p_order->>'payment_method',
    p_order->>'address_street', p_order->>'address_number', p_order->>'address_neighborhood',
    p_order->>'address_city', p_order->>'address_state', p_order->>'address_zip',
    p_order->>'address_complement',
    p_order->>'shipping_service_id', p_order->>'shipping_carrier', p_order->>'shipping_method',
    nullif(p_order->>'delivery_estimate_min', '')::date,
    nullif(p_order->>'delivery_estimate_max', '')::date,
    coalesce((p_order->>'shipping_cost')::numeric, 0), (p_order->>'total')::numeric,
    p_order->>'material_status',
    p_order->>'client_request_id', p_order->>'guest_access_hash',
    nullif(p_order->>'guest_access_expires_at', '')::timestamptz,
    p_order->>'ga_client_id', p_order->>'ga_session_id',
    coalesce((p_order->>'analytics_declined')::boolean, false)
  )
  returning id, order_number into v_order_id, v_order_number;

  -- `price_source`: a mesma regra de `buildOrderPayload` (com variacao, `variant`). No pedido de
  -- proposta o `create-payment` cobra o preco TRAVADO e nao le esta coluna; ela vai certa assim
  -- mesmo, para o pedido ser indistinguivel dos outros.
  insert into public.order_items (
    order_id, product_id, variant_id, product_name, product_image, quantity, unit_price,
    price_source, variant_label, variant_options, requires_material, material_kinds,
    engraving_text
  )
  select v_order_id, i.product_id::text, i.variant_id, i.product_name, i.product_image,
         i.quantity, i.unit_price,
         case when i.variant_id is not null then 'variant' else 'base' end,
         i.variant_label, i.variant_options, i.requires_material, i.material_kinds,
         i.engraving_text
    from public.order_proposal_items i
   where i.proposal_id = v_prop.id
   order by i.position;

  update public.order_proposals
     set status = 'completed', order_id = v_order_id, updated_at = now()
   where id = v_prop.id;

  insert into public.order_proposal_events (proposal_id, kind) values (v_prop.id, 'completed');

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'reused', false);
end;
$$;

revoke all on function public.create_order_from_proposal(uuid, integer, jsonb) from public;
revoke all on function public.create_order_from_proposal(uuid, integer, jsonb) from anon;
revoke all on function public.create_order_from_proposal(uuid, integer, jsonb) from authenticated;
grant execute on function public.create_order_from_proposal(uuid, integer, jsonb) to service_role;

comment on function public.create_order_from_proposal(uuid, integer, jsonb) is
  'Feature 89 (CON-06, CON-08, CON-10, PRC-03). Cria orders + order_items a partir das linhas travadas da proposta e a marca concluida, numa transacao. Concluida devolve o mesmo pedido; cancelada ou vencida recusa; versao velha recusa. So a service role executa.';

-- ---------------------------------------------------------------------
-- 4c. mark_order_proposal_viewed — "vista pela cliente", uma vez (`CON-11`)
-- ---------------------------------------------------------------------
create or replace function public.mark_order_proposal_viewed(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.order_proposals
     set viewed_at = now()
   where id = p_proposal_id and viewed_at is null and status = 'open';
  if not found then
    return false;
  end if;
  insert into public.order_proposal_events (proposal_id, kind) values (p_proposal_id, 'viewed');
  return true;
end;
$$;

revoke all on function public.mark_order_proposal_viewed(uuid) from public;
revoke all on function public.mark_order_proposal_viewed(uuid) from anon;
revoke all on function public.mark_order_proposal_viewed(uuid) from authenticated;
grant execute on function public.mark_order_proposal_viewed(uuid) to service_role;

comment on function public.mark_order_proposal_viewed(uuid) is
  'Feature 89 (CON-11). Marca a proposta aberta como vista uma unica vez e grava o evento. So a service role executa.';

-- ---------------------------------------------------------------------
-- 5. handle_new_customer — a ficha do painel e ADOTADA (`A-09`)
-- ---------------------------------------------------------------------
-- A proposta cria a ficha da cliente nova SEM conta (`user_id` nulo). A conta nasce na conclusao,
-- como a da convidada (`AD-035`), e sem este passo o `insert … on conflict (user_id)` criaria uma
-- SEGUNDA ficha para o mesmo e-mail — e o pedido, ligado a primeira, nao apareceria em Minha conta.
--
-- A adocao vem ANTES do insert: a ficha sem conta mais antiga do mesmo e-mail normalizado ganha o
-- `user_id`, e o insert seguinte vira no-op. A trava consultiva e a mesma de `save_order_proposal`.
--
-- `guard_customer_identity` (feature 59) recusa trocar `user_id` pela cliente, mas deixa passar
-- quando `current_user` nao e `authenticated`/`anon` — e numa funcao `security definer` o
-- `current_user` e o dono. Provado pelo probe da 89.
--
-- O resto e o da feature 35, sem mudanca de forma: o insert com `on conflict (user_id) do nothing`
-- e a adocao dos pedidos ORFAOS do mesmo e-mail, por `lower()` nos dois lados.
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
begin
  if new.email is not null then
    perform pg_advisory_xact_lock(hashtext('customer-email:' || lower(btrim(new.email))));

    update public.customers c
       set user_id = new.id,
           name = case when btrim(c.name) = ''
                       then coalesce(new.raw_user_meta_data->>'full_name', '')
                       else c.name end
     where c.id = (
       select c2.id from public.customers c2
        where c2.user_id is null
          and lower(btrim(c2.email)) = lower(btrim(new.email))
        order by c2.created_at nulls last, c2.id
        limit 1
     )
       and not exists (select 1 from public.customers c3 where c3.user_id = new.id);
  end if;

  insert into public.customers (user_id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (user_id) do nothing
  returning id into v_customer_id;

  if v_customer_id is null then
    select id into v_customer_id from public.customers where user_id = new.id;
  end if;

  if v_customer_id is not null and new.email is not null then
    update public.orders o
       set customer_id = v_customer_id
     where o.customer_id is null
       and lower(o.customer_email) = lower(new.email);
  end if;

  return new;
end;
$$;

comment on function public.handle_new_customer() is
  'Cria a ficha da cliente no signup — ou ADOTA a ficha sem conta do mesmo e-mail criada pelo painel (feature 89, A-09) — e adota os pedidos orfaos do mesmo e-mail (ESP-22). security definer e obrigatorio: orders nao tem policy de UPDATE para cliente, e guard_customer_identity so deixa trocar user_id fora dos papeis de cliente.';

notify pgrst, 'reload schema';
