-- =============================================================================================
-- Acessos — "Com sacola" e a semana contra a semana anterior
--
-- Três mudanças, nenhuma escrita de dado:
--
-- 1. `store_visits` passa a ser podada em 14 dias (hoje e os 13 anteriores): é o necessário para a
--    semana anterior, de segunda até o mesmo dia, estar inteira no banco. Nada além disso.
-- 2. `store_visit_counter.history_since` — o instante a partir do qual o banco guarda os 14 dias de
--    visitas e a marca diária "com sacola". Com a poda antiga, a semana anterior pode ter sido
--    apagada antes deste instante; sem a marca, a comparação mostraria uma base menor que a real.
--    Para a linha que já existe, o valor é o instante em que esta migration roda (o `default` é
--    avaliado uma vez no `add column`); a linha que nascer depois recebe o instante em que nasce.
-- 3. `store_movement` recriada: `periodos` e todas as chaves de antes ficam idênticas; `acessos`
--    ganha `com_sacola` em cada período e em cada comparação, e `comparacao.semana` deixa de ser
--    sempre nula.
--
-- `store_visits` não ganha coluna.
-- =============================================================================================


-- ---------------------------------------------------------------------------------------------
-- 1. A poda — hoje e os 13 dias anteriores ficam
--
-- `security invoker`, escrito por extenso, e sem grant: quem a chama são as duas RPCs definer e o
-- job do pg_cron (que continua chamando esta mesma função, sem mudança).
-- ---------------------------------------------------------------------------------------------

create or replace function public.prune_store_visits(p_dia date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.store_visits where day < p_dia - 13;
end;
$$;

revoke execute on function public.prune_store_visits(date) from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 2. Desde quando os 14 dias e a marca "com sacola" estão guardados. Instante da LOJA, sem ligação
--    com navegador nenhum, como as outras colunas do singleton.
-- ---------------------------------------------------------------------------------------------

alter table public.store_visit_counter
  add column if not exists history_since timestamptz not null default now();


-- ---------------------------------------------------------------------------------------------
-- 3. A leitura — a anterior, com "Com sacola" e a semana anterior.
--
--    UM SNAPSHOT: tudo o que vem da tabela de visitas (CTE `v`) e da marca de sacola (CTE `c`) sai
--    de UM comando. Assim a soma das faixas fecha com o total, e a marca não passa das visitas por
--    uma gravação que comitou entre dois comandos.
--
--    "Com sacola" de um DIA = navegadores distintos com a marca naquele dia, limitados pelas visitas
--    do dia (`least`): a marca vem de outro id (o da presença), e o número nunca passa de Visitas.
--    Na SEMANA, é a soma dos dias (quem pôs joia na sacola em dois dias conta duas vezes).
--
--    acessos.{hoje,ontem}.com_sacola   = o dia
--    acessos.semana.com_sacola         = a soma dos dias de inicio_semana até hoje
--    acessos.comparacao.hoje           = + com_sacola (ontem pela hora da primeira sacola < h) e
--                                        base_hoje.com_sacola (hoje no mesmo corte), cada um limitado
--                                        pelas visitas do mesmo corte
--    acessos.comparacao.ontem          = + com_sacola (anteontem inteiro)
--    acessos.comparacao.semana         = de segunda até a hora completa atual (h) contra a semana
--                                        anterior de segunda até o mesmo dia e a mesma hora:
--                                        { ate_dia, ate_hora, visitas, vendas, com_sacola,
--                                          base_semana: { visitas, vendas, com_sacola } }
--                                        `null` quando a semana anterior não foi contada até esse
--                                        ponto: nenhuma hora completa (segunda às 0h), a contagem
--                                        começando na semana anterior ou depois, a semana anterior
--                                        anterior a `history_since` menos os 7 dias que a poda antiga
--                                        guardava, linha sem hora num dos dois dias do corte, ou o
--                                        teto em qualquer dia das duas semanas.
--
--    O `com_sacola` de uma comparação é `null` quando a visita dela é `null`, ou quando o período
--    anterior começou antes do dia de `history_since` (a marca não foi medida inteira desde a
--    publicação).
-- ---------------------------------------------------------------------------------------------

create or replace function public.store_movement(p_agora timestamptz default now())
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hoje date;
  v_ontem date;
  v_anteontem date;
  v_semana date;
  v_semana_ant date;
  v_hoje_ant date;
  v_desde date;
  v_ini_hoje timestamptz;
  v_ini_ontem timestamptz;
  v_ini_anteontem timestamptz;
  v_ini_semana timestamptz;
  v_ini_semana_ant timestamptz;
  v_ini_hoje_ant timestamptz;
  v_hora smallint;
  v_faixa smallint;
  v_v_hoje bigint;
  v_v_ontem bigint;
  v_v_semana bigint;
  v_v_anteontem bigint;
  v_v_ontem_base bigint;
  v_v_hoje_base bigint;
  v_v_semana_base bigint;
  v_v_semana_ant bigint;
  v_sem_hora_hoje bigint;
  v_sem_hora_ontem bigint;
  v_sem_hora_hoje_ant bigint;
  v_s_hoje bigint;
  v_s_ontem bigint;
  v_s_semana bigint;
  v_s_anteontem bigint;
  v_s_ontem_base bigint;
  v_s_hoje_base bigint;
  v_s_semana_base bigint;
  v_s_semana_ant bigint;
  v_faixas_hoje jsonb;
  v_faixas_ontem jsonb;
  v_por_dia jsonb;
  v_n_hoje bigint;
  v_n_ontem bigint;
  v_n_semana bigint;
  v_n_anteontem bigint;
  v_n_ontem_base bigint;
  v_n_hoje_base bigint;
  v_n_semana_base bigint;
  v_n_semana_ant bigint;
  v_f_hoje numeric;
  v_f_ontem numeric;
  v_f_semana numeric;
  v_inicio timestamptz;
  v_inicio_dia date;
  v_ultima timestamptz;
  v_teto date;
  v_historico_dia date;
  v_sem_cmp_hoje boolean;
  v_sem_cmp_ontem boolean;
  v_sem_cmp_semana boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;

  v_hoje := public.store_day(p_agora);
  v_ontem := v_hoje - 1;
  v_anteontem := v_hoje - 2;
  v_semana := public.store_week_start(v_hoje);
  v_semana_ant := v_semana - 7;
  v_hoje_ant := v_hoje - 7;
  v_desde := least(v_ontem, v_semana);
  v_ini_hoje := public.store_day_start(v_hoje);
  v_ini_ontem := public.store_day_start(v_ontem);
  v_ini_anteontem := public.store_day_start(v_anteontem);
  v_ini_semana := public.store_day_start(v_semana);
  v_ini_semana_ant := public.store_day_start(v_semana_ant);
  v_ini_hoje_ant := public.store_day_start(v_hoje_ant);
  v_hora := public.store_hour(p_agora);

  perform public.prune_store_visits(least(v_hoje, public.store_day(now())));

  -- O contador vem ANTES das visitas: as faixas anteriores à contagem dependem dele.
  select c.started_at, c.last_recorded_at, c.capped_day, public.store_day(c.history_since)
  into v_inicio, v_ultima, v_teto, v_historico_dia
  from public.store_visit_counter c
  where c.id;

  v_inicio_dia := public.store_day(v_inicio);

  -- UM comando para tudo o que vem da tabela de visitas e da marca de sacola (um snapshot).
  with v as (
    select s.day, s.visitor_id, s.first_hour
    from public.store_visits s
    where s.day between least(v_desde, v_anteontem, v_semana_ant) and v_hoje
  ),
  c as (
    select k.day, k.first_cart_at
    from public.store_presence_carts k
    where k.day between v_semana_ant and v_hoje
  ),
  agg as (
    select
      count(distinct visitor_id) filter (where day = v_hoje) as hoje,
      count(distinct visitor_id) filter (where day = v_ontem) as ontem,
      count(distinct visitor_id) filter (where day between v_semana and v_hoje) as semana,
      count(*) filter (where day = v_anteontem) as anteontem,
      count(*) filter (where day = v_ontem and first_hour < v_hora) as ontem_base,
      count(*) filter (where day = v_hoje and first_hour < v_hora) as hoje_base,
      count(distinct visitor_id) filter (where (day >= v_semana and day < v_hoje) or (day = v_hoje and first_hour < v_hora)) as semana_base,
      count(distinct visitor_id) filter (where (day >= v_semana_ant and day < v_hoje_ant) or (day = v_hoje_ant and first_hour < v_hora)) as semana_ant,
      count(*) filter (where day = v_hoje and first_hour is null) as sem_hora_hoje,
      count(*) filter (where day = v_ontem and first_hour is null) as sem_hora_ontem,
      count(*) filter (where day = v_hoje_ant and first_hour is null) as sem_hora_hoje_ant,
      (greatest(v_hora, coalesce(max(first_hour) filter (where day = v_hoje), 0)) / 3)::smallint as faixa_atual
    from v
  ),
  -- Por dia, das duas semanas: as visitas e a marca, inteiras e no corte da hora completa atual.
  sacola as (
    select g.dia,
           least(coalesce(cd.n, 0), coalesce(vd.n, 0)) as n,
           least(coalesce(cd.n_h, 0), coalesce(vd.n_h, 0)) as n_h
    from (select v_semana_ant + i as dia from generate_series(0, v_hoje - v_semana_ant) as i) g
    left join (
      select day, count(*) as n, count(*) filter (where first_hour < v_hora) as n_h
      from v
      group by day
    ) vd on vd.day = g.dia
    left join (
      select day, count(*) as n,
             count(*) filter (where first_cart_at < public.store_day_start(day) + make_interval(hours => v_hora)) as n_h
      from c
      group by day
    ) cd on cd.day = g.dia
  ),
  sacola_agg as (
    select
      coalesce(sum(n) filter (where dia = v_hoje), 0) as hoje,
      coalesce(sum(n) filter (where dia = v_ontem), 0) as ontem,
      coalesce(sum(n) filter (where dia = v_anteontem), 0) as anteontem,
      coalesce(sum(n) filter (where dia between v_semana and v_hoje), 0) as semana,
      coalesce(sum(n_h) filter (where dia = v_ontem), 0) as ontem_base,
      coalesce(sum(n_h) filter (where dia = v_hoje), 0) as hoje_base,
      coalesce(sum(n) filter (where dia >= v_semana and dia < v_hoje), 0)
        + coalesce(sum(n_h) filter (where dia = v_hoje), 0) as semana_base,
      coalesce(sum(n) filter (where dia >= v_semana_ant and dia < v_hoje_ant), 0)
        + coalesce(sum(n_h) filter (where dia = v_hoje_ant), 0) as semana_ant
    from sacola
  ),
  faixas as (
    select d.dia, f.faixa, count(v.visitor_id) as n,
           v_inicio is not null
             and public.store_day_start(d.dia) + make_interval(hours => f.faixa * 3 + 3) <= v_inicio as antes
    from (values (v_hoje), (v_ontem)) as d(dia)
    cross join generate_series(0, 7) as f(faixa)
    left join v on v.day = d.dia and v.first_hour / 3 = f.faixa
    group by d.dia, f.faixa
  ),
  dias as (
    select g.dia, count(v.visitor_id) as n
    from (select v_semana + i as dia from generate_series(0, v_hoje - v_semana) as i) g
    left join v on v.day = g.dia
    group by g.dia
  )
  select
    a.hoje, a.ontem, a.semana, a.anteontem, a.ontem_base, a.hoje_base, a.semana_base, a.semana_ant,
    a.sem_hora_hoje, a.sem_hora_ontem, a.sem_hora_hoje_ant, a.faixa_atual,
    s.hoje, s.ontem, s.semana, s.anteontem, s.ontem_base, s.hoje_base, s.semana_base, s.semana_ant,
    (select jsonb_agg(case when x.faixa > a.faixa_atual or x.antes then null else x.n end order by x.faixa)
       from faixas x where x.dia = v_hoje),
    (select jsonb_agg(case when x.antes then null else x.n end order by x.faixa)
       from faixas x where x.dia = v_ontem),
    (select coalesce(jsonb_agg(jsonb_build_object('dia', g.dia::text, 'visitas', g.n) order by g.dia), '[]'::jsonb)
       from dias g)
  into v_v_hoje, v_v_ontem, v_v_semana, v_v_anteontem, v_v_ontem_base, v_v_hoje_base, v_v_semana_base, v_v_semana_ant,
       v_sem_hora_hoje, v_sem_hora_ontem, v_sem_hora_hoje_ant, v_faixa,
       v_s_hoje, v_s_ontem, v_s_semana, v_s_anteontem, v_s_ontem_base, v_s_hoje_base, v_s_semana_base, v_s_semana_ant,
       v_faixas_hoje, v_faixas_ontem, v_por_dia
  from agg a cross join sacola_agg s;

  select
    count(*) filter (where o.paid_at >= v_ini_hoje),
    count(*) filter (where o.paid_at >= v_ini_ontem and o.paid_at < v_ini_hoje),
    count(*) filter (where o.paid_at >= v_ini_semana),
    coalesce(sum(o.total) filter (where o.paid_at >= v_ini_hoje), 0),
    coalesce(sum(o.total) filter (where o.paid_at >= v_ini_ontem and o.paid_at < v_ini_hoje), 0),
    coalesce(sum(o.total) filter (where o.paid_at >= v_ini_semana), 0),
    count(*) filter (where o.paid_at >= v_ini_anteontem and o.paid_at < v_ini_ontem),
    count(*) filter (where o.paid_at >= v_ini_ontem
                       and o.paid_at < least(v_ini_ontem + make_interval(hours => v_hora), v_ini_hoje)),
    count(*) filter (where o.paid_at >= v_ini_hoje and o.paid_at < v_ini_hoje + make_interval(hours => v_hora)),
    count(*) filter (where o.paid_at >= v_ini_semana and o.paid_at < v_ini_hoje + make_interval(hours => v_hora)),
    count(*) filter (where o.paid_at >= v_ini_semana_ant and o.paid_at < v_ini_hoje_ant + make_interval(hours => v_hora))
  into v_n_hoje, v_n_ontem, v_n_semana, v_f_hoje, v_f_ontem, v_f_semana, v_n_anteontem, v_n_ontem_base, v_n_hoje_base,
       v_n_semana_base, v_n_semana_ant
  from public.orders o
  where o.payment_status = 'approved'
    and o.status <> 'cancelled'
    and o.paid_at >= public.store_day_start(least(v_desde, v_anteontem, v_semana_ant))
    and o.paid_at <= p_agora;

  v_sem_cmp_hoje := v_hora = 0
    or v_inicio_dia is null or v_inicio_dia >= v_ontem
    or v_sem_hora_hoje > 0 or v_sem_hora_ontem > 0
    or coalesce(v_teto in (v_hoje, v_ontem), false);
  v_sem_cmp_ontem := v_inicio_dia is null or v_inicio_dia >= v_anteontem
    or coalesce(v_teto in (v_ontem, v_anteontem), false);
  v_sem_cmp_semana := (v_hoje = v_semana and v_hora = 0)
    or v_inicio_dia is null or v_inicio_dia >= v_semana_ant
    or v_historico_dia is null or v_historico_dia > v_semana
    or v_sem_hora_hoje > 0 or v_sem_hora_hoje_ant > 0
    or coalesce(v_teto between v_semana_ant and v_hoje, false);

  return jsonb_build_object(
    'hoje', v_hoje::text,
    'ontem', v_ontem::text,
    'inicio_semana', v_semana::text,
    'expira_em', public.store_day_start(v_hoje + 1),
    'lido_em', p_agora,
    'production_host', public.store_production_host(),
    'contagem_desde', v_inicio,
    'contagem_desde_dia', public.store_day(v_inicio)::text,
    'ultima_visita', v_ultima,
    'ultima_visita_dia', public.store_day(v_ultima)::text,
    'teto_dia', case when v_teto >= v_desde then v_teto::text end,
    'periodos', jsonb_build_object(
      'hoje', jsonb_build_object(
        'visitas', v_v_hoje,
        'vendas', v_n_hoje,
        'faturamento', v_f_hoje,
        'ticket', case when v_n_hoje > 0 then round(v_f_hoje / v_n_hoje, 2) end
      ),
      'ontem', jsonb_build_object(
        'visitas', v_v_ontem,
        'vendas', v_n_ontem,
        'faturamento', v_f_ontem,
        'ticket', case when v_n_ontem > 0 then round(v_f_ontem / v_n_ontem, 2) end
      ),
      'semana', jsonb_build_object(
        'visitas', v_v_semana,
        'vendas', v_n_semana,
        'faturamento', v_f_semana,
        'ticket', case when v_n_semana > 0 then round(v_f_semana / v_n_semana, 2) end
      )
    ),
    'acessos', jsonb_build_object(
      'faixa_atual', v_faixa,
      'hoje', jsonb_build_object('por_faixa', v_faixas_hoje, 'sem_hora', v_sem_hora_hoje, 'com_sacola', v_s_hoje),
      'ontem', jsonb_build_object('por_faixa', v_faixas_ontem, 'sem_hora', v_sem_hora_ontem, 'com_sacola', v_s_ontem),
      'semana', jsonb_build_object('por_dia', v_por_dia, 'com_sacola', v_s_semana),
      'comparacao', jsonb_build_object(
        'hoje', jsonb_build_object(
          'ate_hora', v_hora,
          'visitas', case when v_sem_cmp_hoje then null else v_v_ontem_base end,
          'vendas', case when v_hora = 0 then null else v_n_ontem_base end,
          'com_sacola', case when v_sem_cmp_hoje or v_historico_dia is null or v_historico_dia >= v_ontem
                             then null else v_s_ontem_base end,
          'base_hoje', jsonb_build_object(
            'visitas', case when v_sem_cmp_hoje then null else v_v_hoje_base end,
            'vendas', case when v_hora = 0 then null else v_n_hoje_base end,
            'com_sacola', case when v_sem_cmp_hoje or v_historico_dia is null or v_historico_dia >= v_ontem
                               then null else v_s_hoje_base end
          )
        ),
        'ontem', jsonb_build_object(
          'dia', v_anteontem::text,
          'visitas', case when v_sem_cmp_ontem then null else v_v_anteontem end,
          'vendas', v_n_anteontem,
          'com_sacola', case when v_sem_cmp_ontem or v_historico_dia is null or v_historico_dia >= v_anteontem
                             then null else v_s_anteontem end
        ),
        'semana', case when v_sem_cmp_semana then null else jsonb_build_object(
          'ate_dia', v_hoje_ant::text,
          'ate_hora', v_hora,
          'visitas', v_v_semana_ant,
          'vendas', v_n_semana_ant,
          'com_sacola', case when v_historico_dia >= v_semana_ant then null else v_s_semana_ant end,
          'base_semana', jsonb_build_object(
            'visitas', v_v_semana_base,
            'vendas', v_n_semana_base,
            'com_sacola', case when v_historico_dia >= v_semana_ant then null else v_s_semana_base end
          )
        ) end
      )
    )
  );
end;
$$;

revoke execute on function public.store_movement(timestamptz) from public, anon;
grant execute on function public.store_movement(timestamptz) to authenticated;
