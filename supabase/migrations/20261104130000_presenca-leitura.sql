-- =============================================================================================
-- Presença na loja — a leitura do ateliê (Loja ao vivo, Fase 2)
--
-- Uma função, `store_live`, e NENHUMA escrita de dado. A gravação e as tabelas são da migration
-- `20261104120000_presenca-na-loja.sql`; esta só lê.
--
-- "Pessoa na loja" = id da presença cuja última batida caiu nos últimos 5 minutos-de-relógio do
-- servidor: o minuto de agora e os quatro anteriores (`LIVE_WINDOW_MIN`, `core/live/presence.ts`).
-- Cada barra dos 30 minutos conta, pela MESMA janela, os ids com batida registrada nos 5 minutos que
-- terminam naquela barra; a última barra é o total de agora (o probe da presença confere).
--
-- O funil é a cópia SQL de `funnelStage` (`core/live/presence.ts`), na mesma ordem: checkout vence a
-- sacola, sacola (ao menos um item, inclusive a sacola guardada) vence o "olhando". Exclusivas: as
-- três somam o total.
--
-- A janela é recortada AQUI, nunca confiada à poda (que roda em três caminhos e pode atrasar).
--
-- `security definer`, `has_role` como PRIMEIRO comando (⇒ `42501`), `execute` só a `authenticated`,
-- no molde de `store_movement`. `p_agora` existe só para os probes.
-- =============================================================================================

create or replace function public.store_live(p_agora timestamptz default now())
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_minuto timestamptz;
  v_inicio timestamptz;
  v_agora jsonb;
  v_minutos jsonb;
  v_joias jsonb;
  v_guia bigint;
  v_origens jsonb;
  v_aparelho jsonb;
  v_compraram bigint;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;

  v_minuto := date_trunc('minute', p_agora);

  perform public.prune_store_presence(least(p_agora, now()));

  -- O mesmo sinal de "loja ainda não medida" que Acessos lê (`store_movement.contagem_desde`).
  select c.started_at into v_inicio from public.store_visit_counter c where c.id;

  -- UM comando para tudo o que vem do estado da presença (um snapshot): o total, o funil, as joias,
  -- o Guia, as faixas e os aparelhos contam as MESMAS pessoas.
  with presentes as (
    select p.presence_id, p.page_kind, p.product_id, p.cart_items, p.source, p.device,
           case
             when p.page_kind = 'checkout' then 'checkout'
             when p.cart_items > 0 then 'sacola'
             else 'olhando'
           end as etapa
    from public.store_presence p
    where p.last_seen_at <= p_agora
      and date_trunc('minute', p.last_seen_at) > v_minuto - interval '5 minutes'
  ),
  joias as (
    select pr.id, pr.name as nome, pr.images as imagens, count(*) as pessoas
    from presentes x
    join public.products pr on pr.id = x.product_id
    where x.page_kind = 'joia'
    group by pr.id, pr.name, pr.images
    order by pessoas desc, nome
    limit 5
  )
  select
    jsonb_build_object(
      'total', count(*),
      'olhando', count(*) filter (where etapa = 'olhando'),
      'sacola', count(*) filter (where etapa = 'sacola'),
      'checkout', count(*) filter (where etapa = 'checkout')
    ),
    count(*) filter (where page_kind = 'guia'),
    (select jsonb_agg(jsonb_build_object('faixa', f.faixa, 'n', (select count(*) from presentes y where y.source = f.faixa))
                      order by f.ordem)
       from (values ('instagram', 1), ('google', 2), ('whatsapp', 3), ('direto', 4), ('outros', 5)) as f(faixa, ordem)),
    jsonb_build_object(
      'celular', count(*) filter (where device = 'celular'),
      'computador', count(*) filter (where device = 'computador'),
      'tablet', count(*) filter (where device = 'tablet')
    ),
    (select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'nome', j.nome, 'imagens', j.imagens, 'pessoas', j.pessoas)
                               order by j.pessoas desc, j.nome), '[]'::jsonb)
       from joias j)
  into v_agora, v_guia, v_origens, v_aparelho, v_joias
  from presentes;

  -- As 30 barras, da mais antiga à de agora: cada uma, os ids com batida nos 5 minutos que terminam nela.
  select jsonb_agg(
           (select count(distinct m.presence_id)
              from public.store_presence_minutes m
             where m.minute > g.minuto - interval '5 minutes'
               and m.minute <= g.minuto)
           order by g.minuto)
  into v_minutos
  from (select v_minuto - make_interval(mins => i) as minuto from generate_series(0, 29) as i) g;

  -- "Compraram (últimos 30 min)": a régua de venda de `store_movement`.
  select count(*)
  into v_compraram
  from public.orders o
  where o.payment_status = 'approved'
    and o.status <> 'cancelled'
    and o.paid_at > p_agora - interval '30 minutes'
    and o.paid_at <= p_agora;

  return jsonb_build_object(
    'lido_em', p_agora,
    'janela_min', 5,
    'production_host', public.store_production_host(),
    'contagem_desde', v_inicio,
    'agora', v_agora,
    'compraram_30min', v_compraram,
    'minutos', v_minutos,
    'joias', v_joias,
    'guia', v_guia,
    'origens', v_origens,
    'aparelho', v_aparelho
  );
end;
$$;

revoke execute on function public.store_live(timestamptz) from public, anon;
grant execute on function public.store_live(timestamptz) to authenticated;
