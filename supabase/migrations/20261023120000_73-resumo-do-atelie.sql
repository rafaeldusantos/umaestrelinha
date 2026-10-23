-- Feature 73 — mobile-adm: Início. O resumo do ateliê numa RPC admin (`AD-057`).
--
-- UMA função nova, `public.store_overview`, ao lado de `store_movement` (feature 71): os 7 dias, o
-- mês, as clientes novas, as joias mais pedidas, as contagens da fila e os 4 últimos pedidos.
-- Sem tabela, sem coluna, sem escrita de dado.
--
-- Por que RPC e não PostgREST (`MAI-23`): a RLS de `orders` devolve à conta sem papel admin os
-- pedidos DELA como cliente, e não erro — uma contagem pelo PostgREST de uma conta que perdeu o papel
-- desenharia um número plausível e falso. Esta função recusa com `42501` antes de ler qualquer linha.
--
-- O dia tem UM dono, o banco (`AD-055`): todo recorte usa `store_day`/`store_day_start` da 71 sobre
-- o instante `p_agora`, e compara `paid_at` contra `store_day_start(…)` — a forma indexável.
--
-- Venda é a lista positiva do `AD-055`: `payment_status = 'approved'` e `status <> 'cancelled'`,
-- escrita UMA vez, no `with vendas`. Pedido pago e depois cancelado sai de todos os números.
--
-- A FILA é cópia deliberada da regra de `packages/core/src/orders/queue.ts` (`QUEUE_BLOCKS`). Cada
-- predicado abaixo é a saída de `toSqlPredicate` colada BYTE A BYTE, e `filaComDonoUnico.test.ts`
-- (suíte da loja) lê este arquivo e compara bloco a bloco. Mudar a regra é mexer em `core` e
-- escrever uma migration nova que recrie a função — nunca editar esta.
--
-- R9 do design: `orders.paid_at` não tem índice geral (só o parcial de promoção). Com ~50 pedidos o
-- custo é desprezível; registrado, não otimizado sem medida.
--
-- R10 do design: `customer_directory` pode ter a mesma pessoa duas vezes por e-mail (cadastro duplo);
-- aí ela conta duas vezes como nova — o mesmo comportamento da tela de Clientes.
-- ---------------------------------------------------------------------------------------------

create or replace function public.store_overview(p_agora timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hoje date;
  v_mes date;
  v_saida jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;

  v_hoje := public.store_day(p_agora);
  v_mes := date_trunc('month', v_hoje)::date;

  with vendas as (
    select o.id, o.total, o.paid_at, o.customer_id, o.customer_email
    from public.orders o
    where o.payment_status = 'approved'
      and o.status <> 'cancelled'
      and o.paid_at <= p_agora
  ),
  dias as (
    select d::date as dia
    from generate_series(v_hoje - 6, v_hoje, interval '1 day') as d
  ),
  semana as (
    select
      x.dia,
      extract(isodow from x.dia)::int as dow,
      count(v.id) as vendas,
      coalesce(sum(v.total), 0) as faturamento
    from dias x
    left join vendas v
      on v.paid_at >= public.store_day_start(x.dia)
     and v.paid_at < public.store_day_start(x.dia + 1)
    group by x.dia
  ),
  do_mes as (
    select v.*
    from vendas v
    where v.paid_at >= public.store_day_start(v_mes)
  ),
  primeira as (
    select d.id, min(v.paid_at) as primeira_venda
    from public.customer_directory d
    join vendas v
      on v.customer_id = d.id or lower(v.customer_email) = lower(d.email)
    group by d.id
  ),
  joias as (
    select
      case when p.id is not null then p.id::text else 'nome:' || i.product_name end as chave,
      coalesce(p.name, i.product_name) as nome,
      sum(i.quantity) as pecas
    from do_mes m
    join public.order_items i on i.order_id = m.id
    left join public.products p on p.id::text = i.product_id
    group by 1, 2
    order by pecas desc, nome
    limit 4
  ),
  fila as (
    select
      count(*) filter (where o.material_status = 'aguardando_material') as aguardando,
      count(*) filter (where o.status = 'paid' and o.material_status in ('nao_aplicavel', 'material_recebido', 'em_producao')) as a_separar,
      count(*) filter (where o.status = 'shipped' and o.tracking_code is null) as sem_rastreio,
      count(*) filter (where o.payment_method = 'pix' and o.payment_status = 'pending') as pix_aguardando,
      count(*) filter (where (o.material_status = 'aguardando_material') or (o.status = 'paid' and (o.material_status is null or o.material_status in ('nao_aplicavel', 'material_recebido', 'em_producao'))) or (o.status = 'shipped' and o.tracking_code is null)) as precisa_acao,
      min(o.created_at) filter (where o.material_status = 'aguardando_material') as aguardando_desde
    from public.orders o
  ),
  recentes as (
    select o.id, o.order_number, o.customer_name, o.total, o.created_at, o.status,
           o.payment_status, o.material_status, o.shipping_service_id, o.delivery_estimate_max
    from public.orders o
    order by o.created_at desc, o.id desc
    limit 4
  )
  select jsonb_build_object(
    'hoje', v_hoje::text,
    'mes', to_char(v_mes, 'YYYY-MM'),
    'lido_em', p_agora,
    'expira_em', public.store_day_start(v_hoje + 1),
    'semana', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', s.dia::text, 'dow', s.dow, 'vendas', s.vendas, 'faturamento', s.faturamento
      ) order by s.dia), '[]'::jsonb)
      from semana s
    ),
    'mes_resumo', (
      select jsonb_build_object('vendas', count(*), 'faturamento', coalesce(sum(m.total), 0))
      from do_mes m
    ),
    'clientes_novas', (
      select count(*)
      from primeira f
      where f.primeira_venda >= public.store_day_start(v_mes)
    ),
    'joias', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'chave', j.chave, 'nome', j.nome, 'pecas', j.pecas
      ) order by j.pecas desc, j.nome), '[]'::jsonb)
      from joias j
    ),
    'fila', (
      select jsonb_build_object(
        'aguardando', f.aguardando,
        'a_separar', f.a_separar,
        'sem_rastreio', f.sem_rastreio,
        'pix_aguardando', f.pix_aguardando,
        'precisa_acao', f.precisa_acao,
        'aguardando_desde', f.aguardando_desde
      )
      from fila f
    ),
    'recentes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'order_number', r.order_number,
        'customer_name', r.customer_name,
        'total', r.total,
        'created_at', r.created_at,
        'status', r.status,
        'payment_status', r.payment_status,
        'material_status', r.material_status,
        'shipping_service_id', r.shipping_service_id,
        'delivery_estimate_max', r.delivery_estimate_max
      ) order by r.created_at desc, r.id desc), '[]'::jsonb)
      from recentes r
    )
  )
  into v_saida;

  return v_saida;
end;
$$;

revoke execute on function public.store_overview(timestamptz) from public, anon;
grant execute on function public.store_overview(timestamptz) to authenticated;
