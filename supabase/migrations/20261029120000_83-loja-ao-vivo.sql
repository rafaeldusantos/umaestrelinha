-- =============================================================================================
-- Feature 83 · Loja ao vivo, Fase 1 (Acessos) — AD-066
--
-- EMENDA a VIS-28 (feature 71): `store_visits` passa a guardar a HORA CHEIA de Brasília (0–23) da
-- primeira visita do dia — e só ela. Sem minuto, instante, IP, user agent, página ou referrer.
-- A hora é decidida AQUI, a partir do instante do servidor; o navegador não envia nada novo.
--
-- Recria `record_store_visit` (grava a hora só na INSERÇÃO) e `store_movement` (acrescenta a chave
-- `acessos`; `periodos` e todas as chaves de antes ficam idênticas). Nenhuma tabela nova, nenhuma
-- RPC nova chamada por app, NENHUMA escrita de dado.
--
-- A migration da 71 está aplicada e não muda uma linha (AD-017): as funções recriadas aqui passam
-- a ser as VIGENTES, e `visitasPorHoraSchema.test.ts` prova isso. As réguas de venda e de visita
-- da 71 (`visitasRegras.ts`) são aplicadas também a este arquivo.
-- =============================================================================================


-- ---------------------------------------------------------------------------------------------
-- 1. A hora de Brasília de um instante. Mesma família de `store_day`: `language sql`, `stable`
--    (tzdata), sem `set search_path` (para ser inlinada), nomes qualificados, sem execute a ninguém.
-- ---------------------------------------------------------------------------------------------

create or replace function public.store_hour(p timestamptz)
returns smallint
language sql
stable
as $$
  select extract(hour from (p at time zone public.store_time_zone()))::smallint
$$;

revoke execute on function public.store_hour(timestamptz) from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 2. A coluna. Anulável: as linhas gravadas antes desta migration não têm hora, e inventar uma
--    seria falso. O `check` vem junto do `add column` — com `if not exists`, rodar de novo é no-op.
-- ---------------------------------------------------------------------------------------------

alter table public.store_visits
  add column if not exists first_hour smallint check (first_hour between 0 and 23);


-- ---------------------------------------------------------------------------------------------
-- 3. A gravação — idêntica à da 71, menos a inserção, que leva `first_hour`.
--    A repetição do mesmo (dia, id) NÃO altera a hora: `on conflict do nothing`, e nenhuma
--    atualização da tabela de visitas existe neste arquivo (o guarda recusa).
--    O `grant … to service_role` continua OBRIGATÓRIO (sem ele, toda visita daria 500).
-- ---------------------------------------------------------------------------------------------

create or replace function public.record_store_visit(p_id uuid, p_agora timestamptz default now())
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_dia date := public.store_day(p_agora);
  v_ate timestamptz := public.store_day_start(v_dia + 1);
  v_desfecho text;
begin
  perform public.prune_store_visits(v_dia);

  if exists (select 1 from public.store_visits where day = v_dia and visitor_id = p_id) then
    v_desfecho := 'repetida';
  elsif (select count(*) from public.store_visits where day = v_dia) >= 5000 then
    v_desfecho := 'teto';
    update public.store_visit_counter set capped_day = v_dia where id;
  else
    insert into public.store_visits (day, visitor_id, first_hour)
    values (v_dia, p_id, public.store_hour(p_agora))
    on conflict do nothing;
    if found then
      v_desfecho := 'gravada';
      insert into public.store_visit_counter (id, started_at, last_recorded_at)
      values (true, p_agora, p_agora)
      on conflict (id) do update
        set last_recorded_at = greatest(public.store_visit_counter.last_recorded_at, excluded.last_recorded_at);
    else
      v_desfecho := 'repetida';
    end if;
  end if;

  return jsonb_build_object(
    'desfecho', v_desfecho,
    'dia', v_dia::text,
    'ate', (extract(epoch from v_ate) * 1000)::bigint,
    'agora', (extract(epoch from p_agora) * 1000)::bigint
  );
end;
$$;

revoke execute on function public.record_store_visit(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.record_store_visit(uuid, timestamptz) to service_role;


-- ---------------------------------------------------------------------------------------------
-- 4. A leitura — a da 71, com a chave `acessos`. A régua de venda (`approved` + `<> 'cancelled'`,
--    fronteiras meio-abertas, `coalesce(sum(`, ticket `round(…, 2)`) e o `count(distinct)` de
--    visitas são os da 71; o guarda aplica as MESMAS réguas da 71 a este arquivo.
--
--    UM SNAPSHOT para as visitas: em READ COMMITTED, cada comando de uma função plpgsql `volatile`
--    tira um snapshot novo. Por isso TUDO o que vem da tabela de visitas (periodos, faixas,
--    sem_hora, por_dia, comparação) sai de UM comando (CTE `v`). Com dois comandos, uma gravação
--    que comitasse entre eles faria `soma(por_faixa) + sem_hora <> visitas` na mesma resposta.
--
--    acessos.faixa_atual       = greatest(hora de Brasília de p_agora, maior first_hour de hoje) / 3.
--                                A linha que comitou com hora acima do p_agora da leitura PUXA a
--                                faixa atual em vez de sumir do gráfico.
--    acessos.hoje.por_faixa    = 8 contagens por `first_hour / 3`; faixas depois da atual = null;
--                                faixas que terminam antes de `contagem_desde` = null (nada contado)
--    acessos.ontem.por_faixa   = 8 contagens, com o mesmo null antes de `contagem_desde`
--    acessos.*.sem_hora        = linhas do dia sem hora (gravadas antes desta migration)
--    acessos.semana.por_dia    = [{dia, visitas}] de inicio_semana até hoje
--    acessos.comparacao.hoje   = HORAS COMPLETAS dos dois lados (h = hora atual): ontem com
--                                first_hour < h e vendas pagas antes de início(ontem) + h; base_hoje
--                                com o mesmo corte em hoje. Visitas null com h = 0, com linha sem
--                                hora em hoje ou ontem, com a contagem começando em ontem ou depois,
--                                ou com o teto em hoje ou ontem. Vendas null com h = 0.
--    acessos.comparacao.ontem  = anteontem inteiro; visitas null com a contagem começando em
--                                anteontem ou depois, ou com o teto em ontem ou anteontem
--    acessos.comparacao.semana = null (a semana anterior das visitas não está no banco: retenção
--                                de 8 dias, BL-056)
--
--    Como `(day, visitor_id)` é a chave primária, `count(*)` num dia é o mesmo que
--    `count(distinct visitor_id)`; os três de `periodos` continuam com `distinct`, como na 71.
--    A largura da faixa (`/ 3`) e o número de faixas (`generate_series(0, 7)`) são lidos pelo guarda
--    e comparados com `ACCESS_BAND_LABELS` de `core/live` (cópia deliberada com guarda).
--
--    `teto_dia` NÃO muda (recortado por `v_desde`, como na 71: o painel lê esta chave); o teto em
--    anteontem é tratado dentro de `comparacao.ontem`.
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
  v_desde date;
  v_ini_hoje timestamptz;
  v_ini_ontem timestamptz;
  v_ini_anteontem timestamptz;
  v_ini_semana timestamptz;
  v_hora smallint;
  v_faixa smallint;
  v_v_hoje bigint;
  v_v_ontem bigint;
  v_v_semana bigint;
  v_v_anteontem bigint;
  v_v_ontem_base bigint;
  v_v_hoje_base bigint;
  v_sem_hora_hoje bigint;
  v_sem_hora_ontem bigint;
  v_faixas_hoje jsonb;
  v_faixas_ontem jsonb;
  v_por_dia jsonb;
  v_n_hoje bigint;
  v_n_ontem bigint;
  v_n_semana bigint;
  v_n_anteontem bigint;
  v_n_ontem_base bigint;
  v_n_hoje_base bigint;
  v_f_hoje numeric;
  v_f_ontem numeric;
  v_f_semana numeric;
  v_inicio timestamptz;
  v_inicio_dia date;
  v_ultima timestamptz;
  v_teto date;
  v_sem_cmp_hoje boolean;
  v_sem_cmp_ontem boolean;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;

  v_hoje := public.store_day(p_agora);
  v_ontem := v_hoje - 1;
  v_anteontem := v_hoje - 2;
  v_semana := public.store_week_start(v_hoje);
  v_desde := least(v_ontem, v_semana);
  v_ini_hoje := public.store_day_start(v_hoje);
  v_ini_ontem := public.store_day_start(v_ontem);
  v_ini_anteontem := public.store_day_start(v_anteontem);
  v_ini_semana := public.store_day_start(v_semana);
  v_hora := public.store_hour(p_agora);

  perform public.prune_store_visits(least(v_hoje, public.store_day(now())));

  -- O contador vem ANTES das visitas: as faixas anteriores à contagem dependem dele.
  select c.started_at, c.last_recorded_at, c.capped_day
  into v_inicio, v_ultima, v_teto
  from public.store_visit_counter c
  where c.id;

  v_inicio_dia := public.store_day(v_inicio);

  -- UM comando para tudo o que vem da tabela de visitas (um snapshot).
  with v as (
    select s.day, s.visitor_id, s.first_hour
    from public.store_visits s
    where s.day between least(v_desde, v_anteontem) and v_hoje
  ),
  agg as (
    select
      count(distinct visitor_id) filter (where day = v_hoje) as hoje,
      count(distinct visitor_id) filter (where day = v_ontem) as ontem,
      count(distinct visitor_id) filter (where day between v_semana and v_hoje) as semana,
      count(*) filter (where day = v_anteontem) as anteontem,
      count(*) filter (where day = v_ontem and first_hour < v_hora) as ontem_base,
      count(*) filter (where day = v_hoje and first_hour < v_hora) as hoje_base,
      count(*) filter (where day = v_hoje and first_hour is null) as sem_hora_hoje,
      count(*) filter (where day = v_ontem and first_hour is null) as sem_hora_ontem,
      (greatest(v_hora, coalesce(max(first_hour) filter (where day = v_hoje), 0)) / 3)::smallint as faixa_atual
    from v
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
    a.hoje, a.ontem, a.semana, a.anteontem, a.ontem_base, a.hoje_base,
    a.sem_hora_hoje, a.sem_hora_ontem, a.faixa_atual,
    (select jsonb_agg(case when x.faixa > a.faixa_atual or x.antes then null else x.n end order by x.faixa)
       from faixas x where x.dia = v_hoje),
    (select jsonb_agg(case when x.antes then null else x.n end order by x.faixa)
       from faixas x where x.dia = v_ontem),
    (select coalesce(jsonb_agg(jsonb_build_object('dia', g.dia::text, 'visitas', g.n) order by g.dia), '[]'::jsonb)
       from dias g)
  into v_v_hoje, v_v_ontem, v_v_semana, v_v_anteontem, v_v_ontem_base, v_v_hoje_base,
       v_sem_hora_hoje, v_sem_hora_ontem, v_faixa, v_faixas_hoje, v_faixas_ontem, v_por_dia
  from agg a;

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
    count(*) filter (where o.paid_at >= v_ini_hoje and o.paid_at < v_ini_hoje + make_interval(hours => v_hora))
  into v_n_hoje, v_n_ontem, v_n_semana, v_f_hoje, v_f_ontem, v_f_semana, v_n_anteontem, v_n_ontem_base, v_n_hoje_base
  from public.orders o
  where o.payment_status = 'approved'
    and o.status <> 'cancelled'
    and o.paid_at >= public.store_day_start(least(v_desde, v_anteontem))
    and o.paid_at <= p_agora;

  v_sem_cmp_hoje := v_hora = 0
    or v_inicio_dia is null or v_inicio_dia >= v_ontem
    or v_sem_hora_hoje > 0 or v_sem_hora_ontem > 0
    or coalesce(v_teto in (v_hoje, v_ontem), false);
  v_sem_cmp_ontem := v_inicio_dia is null or v_inicio_dia >= v_anteontem
    or coalesce(v_teto in (v_ontem, v_anteontem), false);

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
      'hoje', jsonb_build_object('por_faixa', v_faixas_hoje, 'sem_hora', v_sem_hora_hoje),
      'ontem', jsonb_build_object('por_faixa', v_faixas_ontem, 'sem_hora', v_sem_hora_ontem),
      'semana', jsonb_build_object('por_dia', v_por_dia),
      'comparacao', jsonb_build_object(
        'hoje', jsonb_build_object(
          'ate_hora', v_hora,
          'visitas', case when v_sem_cmp_hoje then null else v_v_ontem_base end,
          'vendas', case when v_hora = 0 then null else v_n_ontem_base end,
          'base_hoje', jsonb_build_object(
            'visitas', case when v_sem_cmp_hoje then null else v_v_hoje_base end,
            'vendas', case when v_hora = 0 then null else v_n_hoje_base end
          )
        ),
        'ontem', jsonb_build_object(
          'dia', v_anteontem::text,
          'visitas', case when v_sem_cmp_ontem then null else v_v_anteontem end,
          'vendas', v_n_anteontem
        ),
        'semana', null
      )
    )
  );
end;
$$;

revoke execute on function public.store_movement(timestamptz) from public, anon;
grant execute on function public.store_movement(timestamptz) to authenticated;
