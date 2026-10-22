-- =============================================================================================
-- Feature 71 · Visitas únicas no Dashboard (AD-055)
--
-- Duas tabelas, nove funções e um agendamento opcional. NENHUMA escrita de dado: o contador nasce
-- vazio, e a linha de `store_visit_counter` nasce na primeira gravação.
--
-- O princípio que organiza tudo: o DIA DE BRASÍLIA é decidido num lugar só, este banco. O
-- navegador da cliente nunca envia data; o painel recebe os dias como texto e só os escreve.
--
-- O fuso é cópia deliberada entre SQL e TypeScript (`packages/core/src/time/zone.ts`). Aqui ele
-- aparece UMA vez, em `store_time_zone()`, e `visitasSchema.test.ts` compara os dois.
-- =============================================================================================


-- ---------------------------------------------------------------------------------------------
-- 1. A régua do dia e o host de produção
--
-- As quatro funções de dia NÃO têm `set search_path`, e é escolha: uma função `language sql` com
-- `set` deixa de ser inlinada pelo planejador, e isso custaria o índice no predicado de
-- `orders.paid_at`. Elas não são `security definer`, e todo nome dentro delas é qualificado.
-- `store_day` e `store_day_start` são `stable` (e não `immutable`) porque `at time zone` com nome
-- de fuso depende da base tzdata, que muda entre versões do Postgres.
-- ---------------------------------------------------------------------------------------------

create or replace function public.store_time_zone()
returns text
language sql
immutable
as $$
  select 'America/Sao_Paulo'
$$;

create or replace function public.store_day(p timestamptz)
returns date
language sql
stable
as $$
  select (p at time zone public.store_time_zone())::date
$$;

-- A inversa: o instante em que um dia de Brasília começa.
create or replace function public.store_day_start(p date)
returns timestamptz
language sql
stable
as $$
  select p::timestamp at time zone public.store_time_zone()
$$;

-- A segunda-feira da semana de uma data LOCAL (ISO: segunda = 1, domingo = 7).
create or replace function public.store_week_start(p date)
returns date
language sql
immutable
as $$
  select p - (extract(isodow from p)::int - 1)
$$;

-- "Qual é o host de produção do contador?" — UMA leitura no servidor, chamada pelo relógio da
-- function (`store_clock`) e pela leitura do painel (`store_movement`). Vazio ⇒ tudo é interno.
create or replace function public.store_production_host()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select value->>'production_host' from public.store_settings where key = 'analytics'), '')
$$;

revoke execute on function public.store_time_zone() from public, anon, authenticated;
revoke execute on function public.store_day(timestamptz) from public, anon, authenticated;
revoke execute on function public.store_day_start(date) from public, anon, authenticated;
revoke execute on function public.store_week_start(date) from public, anon, authenticated;
revoke execute on function public.store_production_host() from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 2. As tabelas
--
-- `store_visits` guarda EXATAMENTE o código aleatório do navegador e o dia (VIS-28): sem hora,
-- IP, user agent, página nem `created_at`. A chave começa por `day` porque o teto do dia, a
-- contagem dos períodos e a poda são todos recortes por dia.
--
-- `store_visit_counter` é singleton e guarda instantes DA LOJA, sem ligação com navegador nenhum:
-- desde quando conta, a última gravação, e o último dia em que o teto foi atingido (VIS-44).
--
-- RLS ligada, NENHUMA policy, e `revoke all` dos três papéis: sem o revoke, `anon` leria zero
-- linhas (RLS sem policy) em vez de receber 42501.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.store_visits (
  day        date not null,
  visitor_id uuid not null,
  primary key (day, visitor_id)
);

create table if not exists public.store_visit_counter (
  id               boolean primary key default true check (id),
  started_at       timestamptz not null,
  last_recorded_at timestamptz not null,
  capped_day       date
);

alter table public.store_visits enable row level security;
alter table public.store_visit_counter enable row level security;

revoke all on table public.store_visits from public, anon, authenticated;
revoke all on table public.store_visit_counter from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 3. A poda — hoje e os 7 dias anteriores ficam (VIS-30)
--
-- `security invoker`, escrito por extenso, e sem grant nenhum. Chamada de fora ela esbarra duas
-- vezes: não há `execute`, e o invocador não tem `delete` na tabela. Chamada de dentro das funções
-- `security definer` (ou pelo job do pg_cron), roda como o dono. Nascida definer e aberta, a chave
-- publicável apagaria a tabela inteira com um dia no futuro.
-- ---------------------------------------------------------------------------------------------

create or replace function public.prune_store_visits(p_dia date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.store_visits where day < p_dia - 7;
end;
$$;

revoke execute on function public.prune_store_visits(date) from public, anon, authenticated;


-- ---------------------------------------------------------------------------------------------
-- 4. A gravação — chamada só pela function `visit`, com a chave de serviço (VIS-14, VIS-27)
--
-- Grava (dia de Brasília, id) uma vez. Desfechos: `gravada`, `repetida` (já existia, ou perdeu a
-- corrida para outra chamada simultânea) e `teto` (o dia já tem 5.000 linhas — anota o dia).
-- O teto pode passar um pouco sob concorrência: a contagem e a gravação não são atômicas.
--
-- `p_agora` existe só para os probes; a function chama com `p_id` e nada mais.
-- `ate`/`agora` saem em milissegundos como `bigint` — sem a conversão o JSON traz `.000000`.
--
-- O `grant … to service_role` é OBRIGATÓRIO: o `revoke … from public` tira também o papel de
-- serviço, e sem a concessão toda visita daria 500 (precedente: `account_exists`, feature 49).
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
    insert into public.store_visits (day, visitor_id) values (v_dia, p_id) on conflict do nothing;
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
-- 5. O relógio — o dia, o prazo e o host, sem gravar nada (VIS-23, VIS-27)
--
-- A function o lê ANTES de decidir robô e origem, e é dele que vem o `ate` das respostas que não
-- chegam à gravação. O host é lido a cada chamada, sem cache.
-- ---------------------------------------------------------------------------------------------

create or replace function public.store_clock(p_agora timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dia date := public.store_day(p_agora);
  v_ate timestamptz := public.store_day_start(v_dia + 1);
begin
  return jsonb_build_object(
    'dia', v_dia::text,
    'ate', (extract(epoch from v_ate) * 1000)::bigint,
    'agora', (extract(epoch from p_agora) * 1000)::bigint,
    'production_host', public.store_production_host()
  );
end;
$$;

revoke execute on function public.store_clock(timestamptz) from public, anon, authenticated;
grant execute on function public.store_clock(timestamptz) to service_role;


-- ---------------------------------------------------------------------------------------------
-- 6. A leitura do painel — três períodos × quatro medidas, numa chamada, só para admin (VIS-33)
--
-- Hoje = [00:00 de hoje, agora]; Ontem = [00:00 de ontem, 00:00 de hoje); Esta semana =
-- [00:00 da segunda-feira, agora] — intervalos meio-abertos, decididos por `store_day` (VIS-03).
--
-- Visitas são `count(distinct visitor_id)` POR PERÍODO, nunca a soma dos dias (VIS-15): o mesmo
-- navegador em segunda, terça e quarta conta UMA vez em Esta semana.
--
-- Venda é lista positiva — `payment_status = 'approved'` e `status <> 'cancelled'` —, o mesmo
-- critério de dinheiro da tela de Clientes (CLI-04). Pedido marcado como pago à mão (sem
-- `paid_at`) não conta, e pedido pago e depois cancelado sai do período em que foi pago.
-- Pedidos importados da Nuvemshop CONTAM: não há recorte de origem (assunção ainda pendente com
-- o usuário, padrão "contam" — spec, *Assumptions*).
--
-- SPEC_DEVIATION (D5): o predicado compara `paid_at` contra `store_day_start(…)`, a inversa da
-- mesma régua, em vez de aplicar `store_day` a cada linha. É o mesmo dia, e o predicado fica
-- indexável.
--
-- Faturamento sem venda é 0 (o `coalesce`; `sum` sobre zero linhas é NULL) e o ticket é NULL —
-- ticket de R$ 0,00 afirmaria uma média que não existe.
--
-- A poda roda aqui também, com `least(v_hoje, store_day(now()))`: um `p_agora` futuro passado à
-- mão por um admin não pode apagar as linhas do presente.
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
  v_semana date;
  v_desde date;
  v_ini_hoje timestamptz;
  v_ini_ontem timestamptz;
  v_ini_semana timestamptz;
  v_v_hoje bigint;
  v_v_ontem bigint;
  v_v_semana bigint;
  v_n_hoje bigint;
  v_n_ontem bigint;
  v_n_semana bigint;
  v_f_hoje numeric;
  v_f_ontem numeric;
  v_f_semana numeric;
  v_inicio timestamptz;
  v_ultima timestamptz;
  v_teto date;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'acesso restrito ao painel' using errcode = '42501';
  end if;

  v_hoje := public.store_day(p_agora);
  v_ontem := v_hoje - 1;
  v_semana := public.store_week_start(v_hoje);
  v_desde := least(v_ontem, v_semana);
  v_ini_hoje := public.store_day_start(v_hoje);
  v_ini_ontem := public.store_day_start(v_ontem);
  v_ini_semana := public.store_day_start(v_semana);

  perform public.prune_store_visits(least(v_hoje, public.store_day(now())));

  select
    count(distinct visitor_id) filter (where day = v_hoje),
    count(distinct visitor_id) filter (where day = v_ontem),
    count(distinct visitor_id) filter (where day between v_semana and v_hoje)
  into v_v_hoje, v_v_ontem, v_v_semana
  from public.store_visits
  where day between v_desde and v_hoje;

  select
    count(*) filter (where o.paid_at >= v_ini_hoje),
    count(*) filter (where o.paid_at >= v_ini_ontem and o.paid_at < v_ini_hoje),
    count(*) filter (where o.paid_at >= v_ini_semana),
    coalesce(sum(o.total) filter (where o.paid_at >= v_ini_hoje), 0),
    coalesce(sum(o.total) filter (where o.paid_at >= v_ini_ontem and o.paid_at < v_ini_hoje), 0),
    coalesce(sum(o.total) filter (where o.paid_at >= v_ini_semana), 0)
  into v_n_hoje, v_n_ontem, v_n_semana, v_f_hoje, v_f_ontem, v_f_semana
  from public.orders o
  where o.payment_status = 'approved'
    and o.status <> 'cancelled'
    and o.paid_at >= public.store_day_start(v_desde)
    and o.paid_at <= p_agora;

  select c.started_at, c.last_recorded_at, c.capped_day
  into v_inicio, v_ultima, v_teto
  from public.store_visit_counter c
  where c.id;

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
    )
  );
end;
$$;

revoke execute on function public.store_movement(timestamptz) from public, anon;
grant execute on function public.store_movement(timestamptz) to authenticated;


-- ---------------------------------------------------------------------------------------------
-- 7. O terceiro caminho da poda — um job diário, SÓ se o pg_cron já estiver instalado
--
-- Mais estreito que o precedente da feature de pagamento: NÃO cria a extensão. Sem ela, a poda
-- continua acontecendo na gravação e na leitura. `cron.schedule` com nome é upsert, então rodar de
-- novo não duplica o job. O job chama a função — nunca uma remoção escrita aqui.
-- ---------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'prune-store-visits',
      '15 3 * * *',
      $job$ select public.prune_store_visits(public.store_day(now())) $job$
    );
  else
    raise notice 'pg_cron ausente: a poda de store_visits roda só na gravação e na leitura';
  end if;
end $$;
