-- O pedido montado com o link SEMPRE, e o endereco salvo pela propria gravacao.
--
-- O que esta migration faz:
--   1. `order_proposals.token_cipher`: a cifra do token do link (AES-GCM, feita pela function
--      `order-proposals` com o secret OPCIONAL `PROPOSAL_TOKEN_KEY`). O banco continua guardando o
--      hash (`token_hash`), que e por onde a `checkout` abre a proposta; a cifra e o que deixa a
--      function devolver o link de uma proposta aberta ao painel e ao app. O token em claro nunca e
--      gravado. Nula = proposta gravada sem a chave (ou antes dela): o painel segue com "Gerar link
--      novo". A function so devolve o token com a proposta aberta e a chave que a decifra;
--   2. recria `save_order_proposal` (vigente: a da 95, imutavel). Tres trocas, e nada mais:
--      - `token_cipher` entra em `v_fora`: a cifra nao e conteudo, e ela sozinha nunca sobe a versao;
--      - ao criar, a cifra e gravada junto do hash;
--      - `save_address: true` grava o endereco da proposta em `addresses` da ficha (a escolhida ou a
--        recem-criada) NA MESMA transacao. O painel deixa de escrever em `addresses` pelo navegador
--        (um dono da escrita).
--
-- As permissoes sao as de antes (execute so da service role). Nao escreve dado. Guardada por
-- `apps/store/src/shared/lib/__tests__/linkSempreSchema.test.ts` (as trocas, e a igualdade com a 95) e
-- provada por `.specs/work-items/94-montar-pedido-no-app/probes/01-link-e-endereco.sql`.

-- ---------------------------------------------------------------------
-- 1. A coluna
-- ---------------------------------------------------------------------
alter table public.order_proposals
  add column if not exists token_cipher text;

-- ---------------------------------------------------------------------
-- 2. save_order_proposal — a da 95, com a cifra fora do conteudo e o endereco na mesma transacao
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
    'idempotency_key', 'created_by', 'created_at', 'updated_at', 'admin_note', 'token_cipher'
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

  -- O endereco no cadastro da cliente, na MESMA transacao da proposta: uma falha aqui desfaz
  -- tudo, e nada fica gravado pela metade. Vai para a ficha escolhida ou a recem-criada acima. Ja
  -- existindo o mesmo endereco na ficha, nao entra de novo (editar a proposta com a caixa marcada nao
  -- duplica). E o padrao so quando a ficha ainda nao tem padrao (`addresses_one_default`).
  if p->'save_address' = 'true'::jsonb
     and nullif(regexp_replace(coalesce(p->>'address_zip', ''), '\D', '', 'g'), '') is not null
     and nullif(btrim(coalesce(p->>'address_street', '')), '') is not null then
    insert into public.addresses (
      customer_id, label, cep, street, number, complement, neighborhood, city, state, is_default
    )
    select v_customer_id, 'Casa',
           regexp_replace(p->>'address_zip', '\D', '', 'g'),
           btrim(p->>'address_street'),
           btrim(coalesce(p->>'address_number', '')),
           nullif(btrim(coalesce(p->>'address_complement', '')), ''),
           btrim(coalesce(p->>'address_neighborhood', '')),
           btrim(coalesce(p->>'address_city', '')),
           upper(btrim(coalesce(p->>'address_state', ''))),
           not exists (select 1 from public.addresses d where d.customer_id = v_customer_id and d.is_default)
     where not exists (
       select 1 from public.addresses a
        where a.customer_id = v_customer_id
          and a.cep = regexp_replace(p->>'address_zip', '\D', '', 'g')
          and lower(btrim(a.street)) = lower(btrim(p->>'address_street'))
          and btrim(a.number) = btrim(coalesce(p->>'address_number', ''))
          and coalesce(btrim(a.complement), '') = btrim(coalesce(p->>'address_complement', ''))
     );
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
      status, version, token_hash, token_cipher, expires_at, idempotency_key, created_by,
      customer_id, customer_name, customer_email, customer_phone, customer_document,
      address_zip, address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state,
      coupon_id, coupon_code, coupon_discount, coupon_free_shipping,
      manual_discount_kind, manual_discount_value, manual_discount_reason, manual_discount,
      subtotal, promotion_discount, items_total, admin_note
    ) values (
      'open', 1, p->>'token_hash', nullif(p->>'token_cipher', ''), (p->>'expires_at')::timestamptz,
      p->>'idempotency_key',
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
  'Feature 89 (MON-03, MON-11, CON-10), a observacao da proposta, o link sempre e o endereco salvo pela gravacao. Cria ou edita uma proposta numa transacao: confere a versao, deduplica pela chave de idempotencia, nao sobe a versao sem mudanca de conteudo (a observacao e a cifra do token nao sao conteudo), nunca cria segunda ficha para o mesmo e-mail, e com save_address grava o endereco na ficha na mesma transacao. So a service role executa.';

notify pgrst, 'reload schema';
