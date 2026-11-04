-- A observacao da PROPOSTA — o texto que so quem administra le, escrito ao montar o pedido para a
-- cliente e passado ao pedido quando ela conclui o link.
--
-- A proposta ja e invisivel para a cliente (RLS ligada e nenhuma policy, `SEG-05`): a coluna mora
-- em `order_proposals`. A function `checkout` le a proposta por uma lista FECHADA de colunas, que
-- nao a inclui, e a `order-proposals` (so admin) a devolve ao painel.
--
-- O que esta migration faz:
--   1. `order_proposals.admin_note`, com o MESMO teto da observacao do pedido (`ORDER_ADMIN_NOTE_MAX`
--      de `@estrelinha/core/orders`, contado aparado). Nula = sem observacao; vazio nao existe;
--   2. recria `save_order_proposal` (aplicada na 89, imutavel): `admin_note` entra em `v_fora` — sem
--      isso todo save e todo `renew` (que nao manda a nota) pareceriam mudanca e subiriam a versao,
--      e a pagina aberta da cliente diria "a proposta mudou". Ao criar ela e gravada; ao editar, muda
--      SO quando o corpo a traz, num `update` proprio que nao sobe a versao nem gera `edited`;
--   3. recria `create_order_from_proposal`: a nota passa a `order_admin_notes` na MESMA transacao do
--      pedido. Dali em diante a dona e a observacao do pedido; a coluna da proposta fica congelada.
--
-- Fora as trocas, as duas funcoes sao as da 89 byte a byte, e as permissoes tambem (execute so da
-- service role). Nao escreve dado. Guardada por
-- `apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts` (a forma, e a igualdade
-- com a 89) e provada por `.specs/work-items/95-observacao-do-pedido/probes/02-observacao-da-proposta.sql`.

-- ---------------------------------------------------------------------
-- 1. A coluna
-- ---------------------------------------------------------------------
alter table public.order_proposals
  add column if not exists admin_note text check (char_length(btrim(admin_note)) between 1 and 1000);

-- ---------------------------------------------------------------------
-- 2. save_order_proposal — a 89, com a observacao fora do conteudo
-- ---------------------------------------------------------------------
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
    'idempotency_key', 'created_by', 'created_at', 'updated_at', 'admin_note'
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

  -- A observacao NAO e conteudo: fica em `v_fora`, entao so ela mudando nao sobe a versao nem gera
  -- `edited`. Na edicao ela muda SO quando o corpo a traz — `renew` nao a manda, e nao a apaga.
  if v_id is not null and p ? 'admin_note' then
    update public.order_proposals
       set admin_note = nullif(btrim(coalesce(p->>'admin_note', '')), '')
     where id = v_id;
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
      subtotal, promotion_discount, items_total, admin_note
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
      v_novo.subtotal, coalesce(v_novo.promotion_discount, 0), v_novo.items_total,
      nullif(btrim(coalesce(p->>'admin_note', '')), '')
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
  'Feature 89 (MON-03, MON-11, CON-10) e a observacao da proposta. Cria ou edita uma proposta numa transacao: confere a versao, deduplica pela chave de idempotencia, nao sobe a versao sem mudanca de conteudo (a observacao nao e conteudo), e nunca cria segunda ficha para o mesmo e-mail. So a service role executa.';

-- ---------------------------------------------------------------------
-- 3. create_order_from_proposal — a 89, com a observacao passando ao pedido
-- ---------------------------------------------------------------------
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

  -- A observacao passa ao pedido NESTA transacao. Dali em diante a dona e `order_admin_notes`; a
  -- coluna da proposta fica congelada. O autor e quem montou a proposta; o nome, a proposta nao guarda.
  if v_prop.admin_note is not null then
    insert into public.order_admin_notes (order_id, note, updated_by, updated_by_name)
    values (v_order_id, v_prop.admin_note, v_prop.created_by, null);
  end if;

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
  'Feature 89 (CON-06, CON-08, CON-10, PRC-03) e a observacao da proposta. Cria orders + order_items a partir das linhas travadas da proposta, copia a observacao para order_admin_notes e marca a proposta concluida, numa transacao. Concluida devolve o mesmo pedido; cancelada ou vencida recusa; versao velha recusa. So a service role executa.';

notify pgrst, 'reload schema';
