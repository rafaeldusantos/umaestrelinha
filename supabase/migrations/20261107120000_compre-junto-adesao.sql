-- =============================================================================================
-- Compre Junto — o relatório de adesão (a aba Adesão do painel)
--
-- UMA função, `public.buy_together_adoption`, e NENHUMA escrita de dado, nenhuma tabela, nenhuma
-- coluna. Ela lê a marca que o pedido guardou no momento da compra (`order_items.accompanies_product_ids`
-- e `accompanies_list_ids`, migration `20261106120000_compre-junto-no-pedido.sql`) — e só ela: não lê
-- as peças das listas nem os adicionais das joias, então editar ou apagar uma lista depois não muda o
-- relatório (o nome da lista é o de hoje; a lista apagada volta sem nome).
--
-- Por que RPC e não PostgREST: a RLS de `orders` devolve à conta sem papel admin os pedidos DELA como
-- cliente, e não erro. Esta função recusa com `42501` antes de ler qualquer linha.
--
-- Venda é a régua do Dashboard (`AD-055`, `store_movement`): `payment_status = 'approved'` e
-- `status <> 'cancelled'`, escrita UMA vez, no `with vendas`. O guarda da suíte da loja compara o
-- fragmento com o do `store_movement` vigente. O período é de 7, 30 ou 90 dias de Brasília contando
-- o de hoje: `paid_at` comparado contra `store_day_start(…)` (a forma indexável) e contra `p_agora`.
--
-- Uma peça conta como "comprada junto" quando a marca dela aponta para uma joia principal que está NO
-- MESMO PEDIDO (a function `checkout` já descarta a marca sem principal; aqui é conferido de novo).
-- Os dois arrays são alinhados por posição e se desaninham juntos. As peças somam a `quantity` da LINHA
-- marcada, e a linha conta UMA vez nos indicadores, UMA vez por joia e UMA vez por lista — mesmo
-- acompanhando duas joias da mesma lista. O valor é `unit_price * quantity`, o preço pago em cada peça.
--
-- O elemento nulo da lista é a peça escolhida direto no produto (adicional do tipo produto): ela vira
-- a linha `direto` do recorte por lista, que sai sempre, com 0 quando não houve venda. As listas que
-- existem hoje e não venderam no período saem com 0. O texto de cada linha é do painel.
--
-- `security definer`, `has_role` como PRIMEIRO comando (⇒ `42501`), `execute` só a `authenticated`,
-- no molde de `store_overview`. `p_agora` existe só para os probes.
-- =============================================================================================

create or replace function public.buy_together_adoption(p_dias integer default 30, p_agora timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoje date;
  v_desde date;
  v_saida jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;

  if p_dias is null or p_dias not in (7, 30, 90) then
    raise exception 'período fora de 7, 30 ou 90 dias' using errcode = '22023';
  end if;

  v_hoje := public.store_day(p_agora);
  v_desde := v_hoje - (p_dias - 1);

  with vendas as (
    select o.id
    from public.orders o
    where o.payment_status = 'approved'
      and o.status <> 'cancelled'
      and o.paid_at >= public.store_day_start(v_desde)
      and o.paid_at <= p_agora
  ),
  pares as (
    select i.id as item_id, i.order_id,
           coalesce(i.product_id, i.product_name) as chave, i.product_name, i.variant_label,
           i.quantity, i.unit_price * i.quantity as valor,
           m.principal, m.lista
    from vendas v
    join public.order_items i on i.order_id = v.id
    cross join lateral unnest(i.accompanies_product_ids, i.accompanies_list_ids) as m(principal, lista)
    where m.principal is not null
      and exists (
        select 1 from public.order_items j
        where j.order_id = i.order_id and j.id <> i.id and j.product_id = m.principal
      )
  ),
  linhas as (
    select distinct p.item_id, p.order_id, p.quantity, p.valor
    from pares p
  ),
  totais as (
    select
      (select count(*) from vendas) as pagos,
      count(distinct l.order_id) as com,
      coalesce(sum(l.quantity), 0) as pecas,
      coalesce(sum(l.valor), 0) as valor
    from linhas l
  ),
  joia_linhas as (
    select distinct p.item_id, p.order_id, p.principal, p.chave, p.product_name, p.variant_label, p.quantity, p.valor
    from pares p
  ),
  joia_pecas as (
    select x.principal, x.chave, x.variant_label, max(x.product_name) as nome,
           sum(x.quantity) as pecas, sum(x.valor) as valor
    from joia_linhas x
    group by x.principal, x.chave, x.variant_label
  ),
  por_joia as (
    select
      x.principal,
      coalesce(
        max(pr.name),
        (select max(j.product_name) from public.order_items j where j.product_id = x.principal),
        x.principal
      ) as nome,
      count(distinct x.order_id) as pedidos,
      sum(x.quantity) as pecas,
      sum(x.valor) as valor,
      (select t.nome || coalesce(' · ' || nullif(btrim(t.variant_label), ''), '')
         from joia_pecas t
        where t.principal = x.principal
        order by t.pecas desc, t.valor desc, t.nome
        limit 1) as top_nome
    from joia_linhas x
    left join public.products pr on pr.id::text = x.principal
    group by x.principal
  ),
  lista_linhas as (
    select distinct p.item_id, p.lista, p.chave, p.product_name, p.variant_label, p.quantity, p.valor
    from pares p
  ),
  lista_pecas as (
    select x.lista, x.chave, x.variant_label, max(x.product_name) as nome,
           sum(x.quantity) as pecas, sum(x.valor) as valor
    from lista_linhas x
    group by x.lista, x.chave, x.variant_label
  ),
  chaves_lista as (
    select bl.id as lista, false as direto from public.buy_together_lists bl
    union
    select x.lista, false from lista_linhas x where x.lista is not null
    union
    select null::uuid, true
  ),
  por_lista as (
    select
      k.lista,
      k.direto,
      bl.name as nome,
      coalesce((select sum(x.quantity) from lista_linhas x where x.lista is not distinct from k.lista), 0) as pecas,
      coalesce((select sum(x.valor) from lista_linhas x where x.lista is not distinct from k.lista), 0) as valor,
      (select t.nome || coalesce(' · ' || nullif(btrim(t.variant_label), ''), '')
         from lista_pecas t
        where t.lista is not distinct from k.lista
        order by t.pecas desc, t.valor desc, t.nome
        limit 1) as top_nome
    from chaves_lista k
    left join public.buy_together_lists bl on bl.id = k.lista
  )
  select jsonb_build_object(
    'dias', p_dias,
    'desde', v_desde::text,
    'hoje', v_hoje::text,
    'lido_em', p_agora,
    'pedidos_pagos', t.pagos,
    'pedidos_com', t.com,
    'pecas', t.pecas,
    'valor', t.valor,
    'parte', case when t.pagos > 0 then round(t.com::numeric / t.pagos, 4) end,
    'media', case when t.com > 0 then round(t.pecas::numeric / t.com, 2) end,
    'por_joia', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'principal', j.principal, 'nome', j.nome, 'pedidos', j.pedidos, 'pecas', j.pecas,
        'valor', j.valor, 'top_nome', j.top_nome
      ) order by j.valor desc, j.pecas desc, j.nome), '[]'::jsonb)
      from por_joia j
    ),
    'por_lista', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'lista_id', l.lista, 'direto', l.direto, 'nome', l.nome, 'pecas', l.pecas,
        'valor', l.valor, 'top_nome', l.top_nome
      ) order by l.valor desc, l.pecas desc, l.direto, l.nome), '[]'::jsonb)
      from por_lista l
    )
  )
  into v_saida
  from totais t;

  return v_saida;
end;
$$;

revoke execute on function public.buy_together_adoption(integer, timestamptz) from public, anon;
grant execute on function public.buy_together_adoption(integer, timestamptz) to authenticated;
