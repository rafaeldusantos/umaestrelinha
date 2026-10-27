# 83 — Loja ao vivo, Fase 1 (Acessos) — Design

**Spec**: `.specs/features/83-loja-ao-vivo/spec.md` · **PRD**: `prd.md` · **Protótipo**: `prototipo.md`
**Status**: Draft · **Decisão**: `AD-066` (abaixo; vai ao `STATE.md` na task 14)

Decisões ativas respeitadas: `AD-012` (tipo à mão é afirmação ⇒ chaves conferidas contra a saída real
da RPC), `AD-017` (migration aplicada é imutável ⇒ migration **nova** recria as funções da `71`),
`AD-055` (o dia, a semana e agora a **hora** de Brasília são decididos no banco), `AD-056`/`AD-057`
(o app lê só RPC admin, sem relógio do aparelho), `AD-058` (`lerComPapel` é para tabela com RLS — não
se aplica a RPC que recusa sozinha). Lições aplicadas: `L-033` (régua por comando), `L-035` (escopo de
guarda), `L-043`/`L-063` (falha por leitura, estados exclusivos), `L-046` (troca de fonte ⇒ emenda da
spec), `L-058` (relógio que discorda), `L-059` (semântica de RPC só por probe), `L-061` (puxar nas
bordas), `L-030` (mocks totais de página), `L-071` (limiar).

---

## 1. Visão

```mermaid
graph TD
  VC[VisitCounter da loja<br/>sem mudança] --> FN[function visit<br/>sem mudança]
  FN --> RSV[record_store_visit<br/>RECRIADA: grava first_hour na inserção]
  RSV --> SV[(store_visits<br/>day · visitor_id · first_hour)]
  SV --> SM[store_movement<br/>RECRIADA: + chave acessos]
  O[(orders)] --> SM
  SM --> H[useStoreMovement<br/>core/hooks · + refetchInterval]
  H --> I[Início: MovementHero + CartaoVisitasHoje<br/>30 s visível]
  H --> AV[/ao-vivo: CabecalhoAoVivo + SecaoAcessos<br/>15 s visível/]
  L[core/live/access.ts<br/>conversão · variação · gráfico · frases] --> AV
  L --> I
  CN[core/stats/counterNotes.ts<br/>3 notas do contador] --> AV
  CN --> P[painel: widgets/store-movement<br/>reexporta]
```

**Uma leitura, uma chave.** A Início e a Loja ao vivo leem a **mesma** query
(`STORE_MOVEMENT_KEY`, `useMovimento`). O critério 1 do PRD ("Visitas e Vendas idênticos") é verdade
por construção: os dois desenham `periodos[p]` da mesma resposta no cache. O React Query usa o menor
`refetchInterval` entre os observadores montados; como a Início e `/ao-vivo` nunca estão montadas ao
mesmo tempo (são rotas irmãs), cada tela tem o seu ciclo.

### Abordagens consideradas

| | Abordagem | Prós | Contras |
| --- | --- | --- | --- |
| **A (escolhida)** | `store_movement` ganha a chave `acessos`; `periodos` não muda | uma RPC, uma chamada, sem RPC nova (`marcacaoSoPorAcao` intacto), painel intocado, Visitas idênticas por construção | a migration recria a função inteira (cópia do corpo da `71`, guardada por régua) |
| B | RPC nova `store_access` | função pequena e isolada | duas leituras ⇒ Visitas da faixa e da tela podem discordar por segundos; RPC nova na lista literal da loja; o PRD pede "a mesma chamada, sem RPC nova" |
| C | `por_faixa`/`por_dia` **dentro** de `periodos[p]` (letra do PRD §6.1) | segue a frase do PRD | `MovementPeriod` é a forma comum dos três períodos (o painel desenha dela); faixas só existem em dois períodos e dias só em um — campos opcionais por período viram três tipos disfarçados de um. `SPEC_DEVIATION` de forma, não de conteúdo |

---

## 2. Banco — a migration `supabase/migrations/20261029120000_83-loja-ao-vivo.sql`

Migration **nova** (`AD-017`): a da `71` está aplicada em produção e não muda uma linha. As funções
recriadas aqui passam a ser as **vigentes**; o guarda novo prova isso (§6).

```sql
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
-- =============================================================================================


-- 1. A hora de Brasília de um instante. Mesma família de `store_day`: `language sql`, `stable`
--    (tzdata), sem `set search_path` (para ser inlinada), nomes qualificados, sem execute a ninguém.
create or replace function public.store_hour(p timestamptz)
returns smallint
language sql
stable
as $$
  select extract(hour from (p at time zone public.store_time_zone()))::smallint
$$;

revoke execute on function public.store_hour(timestamptz) from public, anon, authenticated;


-- 2. A coluna. Anulável: as linhas gravadas antes desta migration não têm hora, e inventar uma
--    seria falso. O `check` vem junto do `add column` — com `if not exists`, rodar de novo é no-op.
alter table public.store_visits
  add column if not exists first_hour smallint check (first_hour between 0 and 23);


-- 3. A gravação — idêntica à da 71, menos a inserção, que leva `first_hour`.
--    A repetição do mesmo (dia, id) NÃO altera a hora: `on conflict do nothing`, e nenhum `update`
--    em `store_visits` existe neste arquivo (o guarda recusa).
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


-- 4. A leitura — a da 71, com a chave `acessos`. A régua de venda (`approved` + `<> 'cancelled'`,
--    fronteiras meio-abertas, `coalesce(sum(`, ticket `round(…, 2)`) e o `count(distinct)` de visitas
--    são os da 71; o guarda aplica as MESMAS réguas da 71 a este arquivo (design §6, régua 7).
--
--    UM SNAPSHOT para as visitas: em READ COMMITTED, cada comando de uma função plpgsql `volatile` tira
--    um snapshot novo. Por isso TUDO o que vem de `store_visits` (periodos, faixas, sem_hora, por_dia,
--    comparação) sai de UM comando (CTE `v`). Com dois comandos, um `record_store_visit` que comitasse
--    entre eles faria `soma(por_faixa) + sem_hora <> visitas` na mesma resposta. O guarda recusa um
--    segundo `from public.store_visits` neste corpo.
--
--    acessos.faixa_atual       = greatest(hora de Brasília de p_agora, maior first_hour de hoje) / 3.
--                                A linha que comitou com hora acima do p_agora da leitura (visita das
--                                15:00:00.001, leitura das 14:59:59.999) PUXA a faixa atual em vez de
--                                sumir do gráfico — e a invariante soma + sem_hora = visitas vale.
--    acessos.hoje.por_faixa    = 8 contagens por `first_hour / 3`; faixas depois da atual = null;
--                                faixas que terminam antes de `contagem_desde` = null (nada contado)
--    acessos.ontem.por_faixa   = 8 contagens, com o mesmo null antes de `contagem_desde`
--    acessos.*.sem_hora        = linhas do dia sem hora (gravadas antes desta migration)
--    acessos.semana.por_dia    = [{dia, visitas}] de inicio_semana até hoje
--    acessos.comparacao.hoje   = HORAS COMPLETAS dos dois lados (h = hora atual): ontem com
--                                first_hour < h e vendas pagas antes de início(ontem) + h; base_hoje
--                                com o mesmo corte em hoje. Visitas null com h = 0, com linha sem hora
--                                em hoje ou ontem, com a contagem começando em ontem ou depois, ou com
--                                o teto em hoje ou ontem. Vendas null com h = 0.
--    acessos.comparacao.ontem  = anteontem inteiro; visitas null com a contagem começando em
--                                anteontem ou depois, ou com o teto em ontem ou anteontem
--    acessos.comparacao.semana = null (a semana anterior das visitas não está no banco: retenção de
--                                8 dias; a opção (b) do portão T00 traria só as vendas)
--
--    Como `(day, visitor_id)` é a chave primária, `count(*)` num dia é o mesmo que
--    `count(distinct visitor_id)`; os três de `periodos` continuam com `distinct`, como na 71.
--    A largura da faixa (`/ 3`) e o número de faixas (`generate_series(0, 7)`) são lidos pelo guarda e
--    comparados com `ACCESS_BAND_LABELS` de `core/live` (cópia deliberada com guarda).
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

  -- UM comando para tudo o que vem de store_visits (um snapshot).
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
    'contagem_desde_dia', v_inicio_dia::text,
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
```

Notas da migration:

- **`store_hour` e o inlining**: mesma escolha de `store_day` (§1 da `71`). Ela é chamada na inserção
  e uma vez na leitura; não entra em predicado indexado.
- **`v_inicio_dia` com `v_inicio` nulo**: `store_day(null)` é `null`, e `null::text` sai `null` no
  JSON — o mesmo que a `71` devolvia em `contagem_desde_dia` (`public.store_day(v_inicio)::text`).
- **`least(…, v_ini_hoje)`** no corte das vendas de ontem: com a hora 23, `ontem + 23 h` fica dentro
  de ontem; o `least` protege de um dia de 25 h se o Brasil voltar a ter horário de verão.
- **Horas completas** (`first_hour < h`, vendas `< início + h`): os dois lados da comparação de Hoje
  cobrem exatamente as mesmas horas. A versão anterior (ontem até o **fim** da hora atual) somava a
  hora corrente inteira de ontem contra minutos de hoje — queda fabricada no começo de cada hora.
- **`teto_dia` não muda**: continua recortado por `v_desde` (o painel lê esta chave; mudar o recorte
  para incluir anteontem mudaria o painel). O teto que cai em anteontem é tratado **dentro** de
  `comparacao.ontem` (`v_sem_cmp_ontem`), sem mudar a chave que o painel lê.
- **O contador é lido antes das visitas**: as faixas anteriores à contagem dependem de
  `started_at`. Ele é outra tabela e outro comando; a invariante que importa (soma × total) é toda de
  `store_visits`, e essa sai de um comando só.
- **Retenção**: anteontem (`hoje − 2`) está dentro da poda (`day >= hoje − 7`).
- **Ordem de publicação**: migration **antes** do bundle do app. O banco novo com o app antigo é
  inofensivo (chave a mais); o app novo com o banco antigo desenha `LAV-55` (sem `acessos`).

---

## 3. `packages/core`

### 3.1 `core/stats/movement.ts` (tipo, editado)

```typescript
export interface StoreAccessDay {
  /** 8 faixas de 3 h (0h..21h). Em `hoje`, as faixas depois da atual são `null`. */
  por_faixa: (number | null)[]
  /** Linhas do dia sem hora (gravadas antes da feature 83). */
  sem_hora: number
}
export interface StoreAccessComparison {
  /** `null` quando o período comparável não foi contado inteiro (o servidor decide). */
  visitas: number | null
  vendas: number
}
export interface StoreAccess {
  faixa_atual: number
  hoje: StoreAccessDay
  ontem: StoreAccessDay
  semana: { por_dia: { dia: string; visitas: number }[] }
  comparacao: {
    hoje: StoreAccessComparison
    ontem: StoreAccessComparison & { dia: string }
    semana: null
  }
}
export interface StoreMovement {
  // …as chaves de antes, sem mudança…
  /** Feature 83. Opcional: o bundle novo pode encontrar o banco antigo (`LAV-55`). */
  acessos?: StoreAccess
}
```

`StoreAccessComparison` de Hoje ganha `ate_hora: number` e `base_hoje: { visitas: number | null;
vendas: number | null }`, e `vendas` passa a `number | null` (nulo com `ate_hora = 0`). Os valores de
`por_faixa` podem ser `null` também **antes** da faixa atual (faixa anterior à contagem).

`useStoreMovement.test.ts` atualiza `CHAVES_DA_RPC` com **`acessos`** e ganha as listas de
`StoreAccess`, todas **copiadas da saída real** da RPC no banco local (`begin … rollback`, como admin)
— e um `Record<keyof StoreAccess, true>` para o `tsc` recusar chave a mais ou a menos (`AD-012`).

### 3.2 `core/hooks/useStoreMovement.ts` (editado, aditivo)

`StoreMovementOptions` ganha `refetchInterval?: number`. O hook passa ao `useQuery`
`refetchInterval: (q) => isAccessDenied(q.state.error) ? false : ms` (com `isAccessDenied` do dono em
`core/hooks/useStoreOverview.ts`) e **`refetchIntervalInBackground: false`** (explícito). Com o papel
ainda admin a Início não desmonta na recusa (`InicioPage.test.tsx`, o caso "`42501` com o papel ainda
admin"), e um intervalo fixo martelaria a RPC recusada. Sem a opção, nada de intervalo (o painel).

**O timer da virada do dia não lê em segundo plano**: ao disparar, ele chama `refetch()` só se
`focusManager.isFocused()`; com a aba oculta ele não faz nada — o dado já é velho (`staleTime: 0`) e a
volta ao primeiro plano relê (`refetchOnWindowFocus`). Isso vale para o painel também (o hook é um
só); lá a aba oculta deixa de reler na virada e relê ao voltar. **O aviso do Realtime** na Início
invalida com `refetchType: focusManager.isFocused() ? 'active' : 'none'`. É o que torna verdadeiro o
critério 5 do PRD ("nenhuma leitura em segundo plano"), e não só "nenhuma por intervalo".

### 3.3 `core/stats/counterNotes.ts` (novo — **sobe** do painel, `LAV-75`)

`countingSinceLine(aba, m)`, `emptyCounterLine(m)` e `cappedLine(aba, m)`, **byte a byte** de
`apps/backoffice/src/widgets/store-movement/model/labels.ts` (com `inicioDo`/`fimDo` privados),
importando `formatDayMonth`/`formatStoreHour` de `../time/format.ts` (com extensão). Exportados pelo
barril de `core/stats` (com `.ts`). O painel troca as três declarações por
`export { countingSinceLine, emptyCounterLine, cappedLine } from '@estrelinha/core/stats'` e **apaga**
`inicioDo`/`fimDo`, que ficam sem uso (o lint não acusaria — `no-unused-vars` está desligado no painel
—, mas código morto que repete a regra do dono é o defeito 01 em semente).

**`formatCount` sobe junto** (`core/stats/counterNotes.ts`, ou `labels.ts` de `core/stats`): o
inteiro pt-BR que a faixa do Início (`INTEIRO` em `movement-hero/model/numeros.ts`), o cartão, a seção
e o painel (`formatCount`) escrevem para **o mesmo número**. O painel reexporta (`toBe`), o hero passa
a chamar o de `core`. Com dois donos, "Visitas" da faixa e da seção poderiam divergir de formatação.

**A âncora de pureza de `core/stats`** (`stats/__tests__/purity.test.ts`) crava cinco arquivos; ela
passa a **seis**, com `counterNotes.ts` — âncora subindo com o fato, não afrouxamento.
Os testes do painel que já existem para as três ficam **sem uma linha alterada** e passam a provar o
dono pela reexportação; `apps/backoffice/src/app/__tests__/notasDoContadorNoCore.test.ts` prova a
referência (`toBe`), com o sensor de que uma cópia com o mesmo texto reprova (molde de
`regrasDoPedidoNoCore`). Os casos de unidade sobem para `core/stats/__tests__/counterNotes.test.ts`
como **cópia** (os do painel ficam — queda nenhuma).

### 3.4 `core/live/` (novo, `./live` no `package.json`)

Puro (sem React, Supabase, Deno, `node:`; especificadores com `.ts`). Só o que a Fase 1 usa (PRD §6.3).

`live/access.ts`:

```typescript
export const ACCESS_BAND_LABELS = ['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'] as const
export const ACCESS_TITLE = 'Acessos'
export const CONSENT_NOTE = 'Conta só quem aceitou cookies de estatística.'
export const BAND_NOTE = 'Faixas de 3 horas, pela hora da primeira visita.'
export const WEEK_NOTE = 'Desde segunda-feira.'

/** vendas ÷ visitas × 100; `null` com visitas ≤ 0. Sem arredondar (quem escreve é `formatConversion`). */
export const conversion = (vendas: number, visitas: number): number | null

/** `null` ⇒ '—'; senão 1 casa pt-BR: 2.1127 ⇒ '2,1%', 0 ⇒ '0,0%', 150 ⇒ '150,0%'. */
export const formatConversion = (c: number | null): string

/**
 * (atual − anterior) ÷ anterior × 100, arredondado com a metade PARA LONGE DO ZERO
 * (`Math.sign(x) * Math.round(Math.abs(x))`: +12,5 ⇒ 13, −12,5 ⇒ −13); `null` se algum é null ou
 * anterior ≤ 0.
 */
export const accessDelta = (atual: number | null, anterior: number | null): number | null

/** Quem é o "anterior": Hoje ⇒ `ontem até as ${ate_hora}h` · Ontem ⇒ 'anteontem' · Semana ⇒ null. */
export const comparisonLabel = (m: StoreMovement, periodo: MovementPeriodKey): string | null

/** '+12% vs ontem até as 15h' (tom 'alta') · '−5% vs anteontem' (U+2212, 'neutra') · '0% vs …' ('neutra'). */
export const deltaLine = (p: number, contra: string): { texto: string; tom: 'alta' | 'neutra' }

export interface AccessCard { rotulo: 'Visitas' | 'Vendas' | 'Conversão'; valor: string; variacao: { texto: string; tom: 'alta' | 'neutra' } | null }
/** Os três cartões de um período, na ordem; sem `acessos` ⇒ variação nula nos três. */
export const accessCards = (m: StoreMovement, periodo: MovementPeriodKey): AccessCard[]

export interface AccessColumn { rotulo: string; valor: number | null; destaque: 'atual' | 'passada' | 'futura' | 'sem_contagem' }
export interface AccessChart { titulo: 'Visitas por horário' | 'Visitas por dia'; colunas: AccessColumn[]; nota: string; semHora: string | null }
/** O gráfico do período; `null` sem `acessos` (o app desenha a falha do bloco, LAV-55). */
export const accessChart = (m: StoreMovement, periodo: MovementPeriodKey): AccessChart | null

/** '{n} visitas deste dia foram contadas antes da contagem por horário.' · singular com 1 · null com 0. */
export const noHourNote = (n: number): string | null

/** <2 s 'Atualizado agora' · <60 s 'Atualizado há {s} s' · senão 'Atualizado há {m} min'. */
export const freshnessLine = (segundos: number): string
```

Regras de `accessChart`:
- Hoje: colunas de `acessos.hoje.por_faixa`; `destaque` = `'futura'` se `valor === null` e o índice é
  maior que `faixa_atual`, `'sem_contagem'` se `valor === null` e o índice é menor (faixa anterior à
  contagem), `'atual'` se o índice é `faixa_atual`, senão `'passada'`. Ontem: `'sem_contagem'` nos
  `null`, `'passada'` no resto. `'futura'` e `'sem_contagem'` se desenham igual (trilho de 4 px em
  `line`, sem número); a distinção existe para o teste e para o nome acessível.
- Em Hoje, os cartões comparam `comparacao.hoje.base_hoje` (horas completas de hoje) com
  `comparacao.hoje` (as mesmas horas de ontem); o número grande é `periodos.hoje`.
- Semana: uma coluna por `por_dia`, rótulo `weekdayShort(isoWeekday(dia))` (de `core/stats/labels`,
  aritmética de texto), o item com `dia === m.hoje` com rótulo `'hoje'` e `destaque: 'atual'`.
- `semHora`: `noHourNote(acessos[p].sem_hora)` em Hoje/Ontem; `null` em Semana.

Frases do cartão do Início, no mesmo arquivo (`live/card.ts`):

```typescript
export const VISITS_TODAY_TITLE = 'Visitas hoje'
export const VISITS_TODAY_HINT = 'Hoje, ontem e a semana, por horário'
/** 'Visitas hoje, 41. Abrir loja ao vivo' */
export const visitsTodayLabel = (n: number): string
```

`live/__tests__/purity.test.ts` (âncora: os arquivos de `live` lidos ≥ 3) recusa React, Supabase,
Deno, `node:`, alias e especificador relativo sem `.ts`.

`card.ts` também tem `visitsTodayLoadingLabel = 'Visitas hoje, carregando. Abrir loja ao vivo'` e
`visitsTodayFailedLabel = 'Visitas hoje: não consegui carregar. Tentar de novo'` (o nome acessível
muda com o que o toque faz). `access.ts` tem `CHART_UNAVAILABLE = 'O gráfico por horário ainda não
está disponível.'` (resposta sem `acessos`, frase sem botão).

---

## 4. App (`apps/mobile-adm`, FSD)

| Camada | Arquivo | O quê |
| --- | --- | --- |
| entities | `entities/stats/model/periodos.ts` (**sobe** de `widgets/movement-hero/model/numeros.ts`) | `PERIODOS` (id, rótulo, forma falada) e `ehPeriodo`. **Dono único** do vocabulário de período no app (`AD-033`: dois widgets do mesmo app ⇒ `entities/`). `movement-hero` passa a importar daqui (`numeros.ts` reexporta por referência, para os testes da `73` não mudarem); `entities` não importa de `widgets` e `store-access` não importa de outro widget — as duas saídas violariam a fronteira (o lint do app é 0/0) ou criariam um segundo vocabulário |
| entities | `entities/stats/model/aoVivo.ts` | `AO_VIVO_PATH = '/ao-vivo'`; `estadoDaEntrada(periodo) ⇒ { doApp: true, periodo }`; `periodoDaEntrada(state): MovementPeriodKey` (lê `ehPeriodo` de `periodos.ts`; resto ⇒ `'hoje'`); `periodoDoInicio(state)` / `gravarPeriodoDoInicio(periodo)` (`history.replaceState` na entrada da Início, molde de `useTermoDaEntrada`). Exportado pelo barril de `entities/stats` |
| entities | `entities/stats/api/leituras.ts` (editado) | `useMovimento({ refetchInterval? } = {})` repassa ao hook de `core`, mantendo `retry: retryUnlessDenied` |
| shared | `shared/lib/useSegundosDesde.ts` | `(instante: number) ⇒ number`: segundos desde `instante` (o `dataUpdatedAt` da query), relidos a cada 1 s por `setInterval`. **O único arquivo do escopo do guarda autorizado a ler `Date.now()`** (duração local, `LAV-07`) |
| widgets | `widgets/movement-hero/ui/MovementHero.tsx` (editado) | props opcionais `periodo`/`aoTrocarPeriodo` (controlado quando vierem; sem elas, o estado interno de hoje — testes da `73` intactos) |
| widgets | `widgets/visits-card/ui/CartaoVisitasHoje.tsx` + `index.ts` | o cartão de `LAV-04` (recebe `leitura: Leitura<StoreMovement>` e `periodo`; com dado ou carregando, grava o período na entrada da Início e navega com `estadoDaEntrada`; falha ⇒ `tentarDeNovo`); `aria-label` por estado (`visitsTodayLabel` / `…LoadingLabel` / `…FailedLabel`) |
| widgets | `widgets/store-access/ui/SecaoAcessos.tsx` | `h2`, seletor (estado próprio, inicial de `periodoDaEntrada`, rótulos de `PERIODOS`), os três cartões (`accessCards`, cada um `role="group"` com `aria-label`), o cartão do gráfico (`accessChart`; sem `acessos` ⇒ `CHART_UNAVAILABLE`, sem botão), as notas (`LAV-53`/`54`/`67`), os estados de `LAV-55`. Grade `grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 [&>*:last-child]:col-span-full` (Conversão em largura inteira) |
| widgets | `widgets/store-access/ui/GraficoDosAcessos.tsx` | a área de 120 px, as colunas, as cores por `destaque`. O contêiner das colunas é `overflow-x-auto` e cada coluna tem `min-w-[2.75rem]` (rem, cresce com a fonte): a 200 % com valores de 4 dígitos o gráfico rola **dentro** do cartão, sem sobreposição e sem rolagem do `body` |
| widgets | `widgets/store-access/model/barras.ts` | `alturaDaBarra(v, max) = v === null ? 4 : max(4, round(v / max × 84))`, `max = 0` ⇒ 4 (molde de `week-chart/model/barras.ts`) |
| widgets | `widgets/store-access/ui/CabecalhoAoVivo.tsx` | voltar (molde de `BotaoVoltar` do pedido, destino `/`), `h1`, linha de frescor (`freshnessLine(useSegundosDesde(dataUpdatedAt))` ou `NAO_ATUALIZOU`). Sangra o recuo do `<main>` como `CabecalhoDoPedido`: `sticky top-0 z-10 -mx-4 -mt-4 min-h-[60px] border-b border-estrelinha-line bg-estrelinha-surface` (régua de token no teste) |
| pages | `pages/AoVivoPage.tsx` | `useMovimento({ refetchInterval: 15_000 })`, `useRecusaDePapel`, `leituraDe` (o mesmo da Início), `PullToRefresh` (invalida `STORE_MOVEMENT_KEY`), `document.title = 'Loja ao vivo · Ateliê'`, compõe cabeçalho + seção |
| pages | `pages/InicioPage.tsx` (editado) | estado `periodo` na página, inicial de `periodoDoInicio(history.state)` (passa ao hero e ao cartão); `useMovimento({ refetchInterval: 30_000 })`; ordem hero → cartão → `LinhaDeFrescor` → `QueueTiles`; o aviso do Realtime invalida com `refetchType: 'none'` com a aba oculta |
| app | `app/App.tsx` (editado) | `<Route path="/ao-vivo" element={<AoVivoPage />} />` dentro do bloco do `RequireAdmin` |
| widgets | `widgets/tab-bar/model/tabs.ts` (editado) | `barraNoCaminho` devolve `false` também para `/ao-vivo` |

`leituraDe` hoje mora dentro de `InicioPage.tsx`. A Loja ao vivo precisa dele: sobe para
`shared/ui/leitura.tsx` (export `leituraDe`), a Início importa de lá — sem mudar o comportamento.

O estilo segue o protótipo (`prototipo.md` §3.1 e §3.3) com as divergências da spec: cartão padrão
(`rounded-[20px] border border-estrelinha-line bg-estrelinha-surface p-4`), eyebrow
`text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft`, números
`font-display text-[22px] font-bold text-estrelinha-primary`, variação `text-xs` em
`text-estrelinha-done`/`text-estrelinha-ink-soft`, grade
`grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 [&>*:last-child]:col-span-full`.
Nenhuma `transition-*` nas barras.

### 4.1 Por que sem `lerComPapel`

`lerComPapel` (`AD-058`) existe porque a RLS de `orders` devolve à conta SEM papel os pedidos DELA,
sem erro. `store_movement` é `security definer` e recusa no primeiro comando (`has_role` ⇒ `42501`):
a mesma resposta que confirma o papel traz o dado. O guarda `leituraSoComPapel` mede só os hooks de
pedido; a Início (`MAI-23`) já lê `store_movement` sem ele. Registrado como `SPEC_DEVIATION` do texto
do PRD em `LAV-60`.

---

## 5. Política de privacidade

`apps/store/src/pages/PrivacyPolicyPage.tsx`: o parágrafo da `71` dá lugar ao do **Apêndice A** da
spec (só o trecho da hora muda), com o comentário apontando a `83`. `politicaDoContador.test.ts`:
`PARAGRAFO` passa a ser o novo; os sensores de antes continuam (as frases que eles trocam existem no
novo); sensor novo "sem 'a hora cheia' reprova". `PrivacyPolicyPage.test.tsx` acompanha o literal.
A folha de cookies (`CookiePreferencesSheet`) **não** muda: a frase da categoria não fala em data.

---

## 6. Guardas — manter verdes sem afrouxar

| Guarda | O que acontece | O que fazer |
| --- | --- | --- |
| `visitasSchema.test.ts` (loja) | lê **só** a migration da `71`, que não muda ⇒ verde. Mas passa a medir uma versão que não é mais a vigente — as ~40 réguas de venda e visita dele deixariam passar uma regressão na `83` (PRF-05) | **as funções de asserção** (portão `has_role`, lista positiva `approved`/`<> 'cancelled'`, fronteiras meio-abertas, `coalesce(sum(`, ticket `round(…, 2)`, `count(distinct)` por período, poda com `least(…)`) **mudam de endereço** para `shared/lib/__tests__/visitasRegras.ts` e são aplicadas aos DOIS arquivos: a `71` (como hoje) e a migration **vigente** (a última, por prefixo, que cria `store_movement`/`record_store_visit`, `L-035`). Nenhuma régua afrouxada: mudança de endereço, com os mutantes de venda (ex.: tirar `and o.status <> 'cancelled'`) reinjetados no arquivo da `83` e mortos. A contagem do arquivo sobe; nenhuma asserção dele muda de régua |
| **`visitasPorHoraSchema.test.ts`** (loja, **novo**) | — | Lê a migration da `83` e **todas** as que alteram `store_visits`. Uma régua por comando (`L-033`), `mutar()` que lança, sem comentário antes de mutar. Réguas: (1) colunas de `store_visits` = `day`, `visitor_id` (da `71`) + **exatamente** `first_hour` — cada comando `alter table [only] [public.]store_visits …` é recortado até o `;` e dele sai TODA cláusula `add [column] [if not exists] <nome>` (com ou sem `column`, várias numa vírgula), `rename column` e `alter column … type` (estes dois reprovam), em qualquer migration (`L-035`); sensores para `only`, sem `column`, duas adições num comando, `rename`; (2) `first_hour smallint` com `check (first_hour between 0 and 23)`; (3) `store_hour` usa `public.store_time_zone()`, `stable`, sem `execute` a ninguém; (4) o `insert` de `record_store_visit` leva `first_hour` com `public.store_hour(p_agora)`, `on conflict do nothing`, e **nenhum** `update public.store_visits` no arquivo; (5) `record_store_visit` `security definer`, `search_path = ''`, `grant execute … to service_role`, sem `anon`; teto `>= 5000` e `prune_store_visits(v_dia)` presentes; (6) `store_movement`: `has_role` ⇒ `42501` antes de qualquer `select`, `security definer`, `search_path = ''`, `execute` a `authenticated` e `revoke` de `anon`/`public`; (7) **por fragmento**, comparado byte a byte depois de normalizar espaço, contra a `71`: (a) os três `count(distinct visitor_id) filter (…)` de `periodos`; (b) as seis expressões de venda e faturamento de `periodos`; (c) o par `o.payment_status = 'approved'` + `o.status <> 'cancelled'` e `o.paid_at <= p_agora`; (d) o bloco `'periodos', jsonb_build_object(…)` inteiro — cada fragmento com o seu sensor por `mutar()`. A igualdade **numérica** de `periodos` fica com o probe (a fixtura da `71` dando os mesmos números). O resto da régua de venda é medido pelas funções compartilhadas de `visitasSchema` (linha acima); (8) nada de `current_date`, `now()::date`, `date_trunc`, offset fixo, nome de fuso literal (o `STORE_TIME_ZONE` importado não aparece); (9) nenhuma escrita de dado fora de função; (10) **a vigente**: a última migration (por prefixo) que cria `store_movement` e `record_store_visit` é a da `83`; (11) **a faixa**: o divisor de `first_hour / N` e o fim de `generate_series(0, M)` extraídos da migration vigente e comparados com `ACCESS_BAND_LABELS` (**importado** de `core/live`): comprimento `M + 1` e rótulo `i` = `${i * N}h`, com sensor por `mutar()`; (12) **um snapshot**: no corpo de `store_movement`, exatamente UM `from public.store_visits` (sensor: um segundo comando reprova). Âncora: arquivo lido + 3 funções + 1 `alter table` |
| `marcacaoSoPorAcao.test.ts` (loja) | nenhuma RPC nova chamada por app (`store_movement` já está na lista); `store_hour` não é chamada por app | nada. Se o executor acrescentar RPC, o guarda grita — é o trabalho dele |
| `politicaDoContador.test.ts` (loja) | reprova assim que o parágrafo muda | `PARAGRAFO` novo + sensor da hora (§5) — a régua fica igual, o objeto medido muda |
| `contadorSemGa`, `idDoVisitanteSoNoEnvio`, `visitanteComDonoUnico`, `parametroNaoContarComDonoUnico` (loja) | nada da loja muda | nada |
| `fusoComDonoUnico` (loja) | varre `packages/*/src`: `core/live` não escreve o fuso (usa `storeHour`/`formatStoreHour` de quem já o importa) | nada; se o executor escrever `'America/Sao_Paulo'` em `core/live`, o guarda acusa |
| `useStoreMovement.test.ts` (core) | `CHAVES_DA_RPC` sem `acessos` reprova o `Record<keyof StoreMovement, true>` | acrescentar `acessos` e as listas de `StoreAccess`, **copiadas da saída real** (task 03) |
| `stats/__tests__/purity.test.ts` (core) | a âncora crava **cinco** arquivos (`index`, `labels`, `movement`, `overview`, `turn`); `counterNotes.ts` a reprova | a âncora passa a **seis**, com `counterNotes.ts` — âncora de contagem subindo com o fato (T05); a régua do `.ts` explícito alcança o arquivo novo |
| `abasSaoAsRotas.test.ts` (app) | `/ao-vivo` seria "rota sem aba"; e **três** asserções antigas reprovam com a rota no `App.tsx`: a âncora `rotasDoApp(fonte).toHaveLength(4)`, "as duas listas são a mesma" e o sensor "sem a lista, `/avisos` seria acusada" (`semLista` filtra só subrotas e passaria a dar `['/avisos','/ao-vivo']`) | lista literal nova `ROTAS_DE_TELA = ['/ao-vivo']`, com âncora (`toEqual(['/ao-vivo'])`); `rotasDoApp` passa a excluir `ROTAS_DA_CONTA ∪ ROTAS_DE_TELA`; o sensor de `/avisos` passa a filtrar `ROTAS_DE_TELA` antes (continua medindo só a lista da conta) e ganha o **irmão simétrico** "sem `ROTAS_DE_TELA`, `/ao-vivo` seria acusada" (filtrando `ROTAS_DA_CONTA`). Essas três linhas antigas mudam de **fixture**, não de régua — o motivo vai no comentário do caso (T06 escreve a lista, T08 a ativa com a rota) |
| `rotasSobGuarda.test.ts` (app) | a âncora literal "a varredura encontra as **doze** rotas" (`toEqual([... '/avisos', '*'])`) reprova com a décima terceira | a âncora sobe para **treze**, com `'/ao-vivo'` na posição real do `App.tsx` e o título reescrito; caso novo "`/ao-vivo` está DENTRO do bloco — e movê-la para fora é acusado", no molde do de `/pedidos/:id` (T08). Âncora de contagem subindo com o fato, como o `CLAUDE.md` raiz descreve |
| `InicioPage.test.tsx` (app) | com o ciclo de 30 s, **dois** casos conhecidos reprovam: "`42501` com o papel ainda admin" (a recusa **não** desmonta a página — `pathname` segue `/` —, e o caso exige `toHaveLength(3)` depois de `andar(30_000)`) e "a virada do dia relê pela DURAÇÃO do servidor" (`andar(50_000)` exige 1 chamada; o ciclo de 30 s daria 2, e o `≥ 2` final passaria mesmo sem o timer — verdadeiro nos dois mundos) | o primeiro fica **intacto** e passa a ser a prova de que o intervalo para na recusa (`refetchInterval` função). O segundo passa a medir a virada **dentro** de uma janela menor que o ciclo: a fixtura põe a virada a 10 s (`lido_em` 02:59:50Z, `expira_em` 03:00:00Z); `andar(9_000)` ⇒ 1 chamada, `andar(2_000)` ⇒ 2 — antes dos 30 s, então só o timer explica a segunda (`focusManager.setFocused(false)` não serve: o timer agora respeita o foco). O mutante "timer apagado" é reinjetado e o caso morre. É mudança de fixture com o motivo escrito; a régua (`toHaveLength`) fica. Cada outro caso que anda ≥ 30 s é **lido**: onde a contagem exata é a régua, ela passa a contar o ciclo **explicitamente** (asserção nova ao lado, nunca `toBeGreaterThanOrEqual` no lugar de `toHaveLength`). `L-030`: listar os `vi.mock` totais |
| Os outros testes que montam `/` (app) | o ciclo de 30 s pode mudar contagens exatas de `store_movement` | lista gerada por grep (`montarApp('/'`, `pushState(… '/')`): `app/__tests__/{anuncios,App.smoke,inicioComClientReal,semConexao}.test.tsx`, `pages/__tests__/PedidoPage.test.tsx`, `widgets/account-menu/__tests__/AccountMenu{,.avisos}.test.tsx`, `widgets/tab-bar/__tests__/{TabBar,seloDaAba}.test.tsx` (mais `InicioPage.test.tsx`). Cada um anotado no Status da T09 |
| `semPessoas.test.ts` (painel) | as três notas saem de `labels.ts` para `core` — o escopo dele encolhe (`L-035`) | o escopo passa a ler também `packages/core/src/stats/counterNotes.ts`, com âncora que o nomeia (quem mexe só no painel roda este guarda, não o do app); a âncora `VISIT_INFO_TEXT` não muda |
| **`notasDoContadorNoCore.test.ts`** (painel, **novo**) | — | as três notas **e** `formatCount` do painel `toBe` as de `core`; sensor: cópia com o mesmo texto reprova |
| **`periodosComDonoUnico.test.ts`** (app, **novo**) | — | nenhum arquivo de `apps/mobile-adm/src` (fora de `entities/stats/model/periodos.ts`) declara a lista de períodos (`id: 'hoje'` junto de `rotulo`/`falado`, ou os três rótulos `'Hoje'`,`'Ontem'`,`'Semana'` num array); `movement-hero/model/numeros.ts` reexporta `PERIODOS` por referência (`toBe`). Âncora + sensor |
| **`aoVivoSemRelogioDoAparelho.test.ts`** (app, **novo**) | — | `LAV-61`: nos arquivos da `83` (escopo literal) e em `core/live/**`, nenhum `new Date(`, `Date.now(`, `getHours`, `getDay`, `toLocaleDateString`; allowlist de UM: `shared/lib/useSegundosDesde.ts`. Âncora: arquivos lidos ≥ N; sensores com cada forma, CRLF/LF, e o inverso (comentário não é acusado) |
| **`tomDaLojaAoVivo.test.ts`** (app, **novo**) | — | `LAV-64`/`LAV-65`: nos literais dos arquivos **da Fase 1, nomeados um a um** (`core/live/access.ts`, `core/live/card.ts`, `core/stats/counterNotes.ts` e os do app da `83`), com âncora que nomeia cada um: emoji, `!`, urgência ("corra", "não perca", "últimas", "agora mesmo"), "pessoa(s)"/"usuário(s)" (`VIS-41`); e `transition-*`/`animate-*` sem par `motion-reduce:` que desligue, na mesma linha (régua de `movimentoDeClientes`). **Não** varre `core/live/**` inteiro: a Fase 2 escreve "pessoas" (presença conta pessoas) e terá régua própria — o conflito com `VIS-41` está em `BL-057`. Âncora + sensores + inverso |
| `semDadoSensivelDeClienteNoApp`, `fraseDaAcaoSoNoCore`, `regraDePedidoSoNoCore`, `tomMemorialDosAvisos` (app) | nenhum arquivo novo toca cliente, pedido, ação ou aviso | nada; o gate os roda |
| **`aoVivoComClientReal.test.tsx`** (app, **novo**) | — | sobre o supabase-js REAL (`src/test/clientReal.ts`): `store_movement` em 403 `42501` na primeira leitura ⇒ a recusa e nenhum número em `/ao-vivo` nem no cartão; **200 e depois 403 na releitura de 15 s** ⇒ nenhum número e nenhuma linha "Atualizado há" em instante nenhum (nem o do cache); 500 e rede caída ⇒ falha do bloco, nunca recusa |

### Probes (`L-059`)

`probes/01-acessos.sql` (`begin … rollback`, preâmbulo `_comum.sql` no molde da `71`: derruba os
objetos, aplica **a `71` e a `83`** do disco, auxiliares `confere`/`movimento`/`recusado`). Prova:
`store_hour` em 02:59/03:00/23:59 de Brasília (e o 23:59 já no dia seguinte em UTC); a inserção grava a
hora e a repetição às 15h não a muda; `faixa_atual` e `null` nas futuras; `soma + sem_hora = visitas`
em hoje e ontem; `por_dia` de segunda a hoje com zero no dia vazio, e o caso segunda-feira (1 item);
`comparacao.hoje` com o corte no fim da hora (visita de ontem às 15h59 entra às 15h; às 16h, fora) e
venda no mesmo limite; `null` com linha sem hora em ontem e com a contagem começando ontem;
`comparacao.ontem` inteira e `null` com a contagem começando em anteontem; `periodos` idêntico ao da
`71` para a mesma fixtura (os números da fixtura de `visitas.sql` e `vendas.sql` da `71`); `teto_dia`
igual; `anon` e cliente recusados com `42501` em `store_movement`, e `store_hour` sem `execute` para
`anon`/`authenticated`; **`service_role` executa `record_store_visit`** (a recriação não perdeu o
`grant`); `information_schema.columns` de `store_visits` = `{day, visitor_id, first_hour}` no banco
aplicado. Casos novos da revisão adversarial: **a comparação simétrica** — a mesma distribuição em
ontem e hoje, lida às 15h02, dá `base_hoje.visitas = comparacao.hoje.visitas` (variação 0) e
`ate_hora = 15`; lida às 00h30 dá `null`; a venda de ontem às 14h59 entra e a das 15h00 não;
**a linha "do futuro"** — uma visita com `first_hour = 15` lida com `p_agora` às 14h59 entra na faixa
5 (`faixa_atual = 5`) e `soma + sem_hora = visitas`; **o teto** — `capped_day = ontem` ⇒
`comparacao.hoje.visitas` e `comparacao.ontem.visitas` `null`; **antes da contagem** — `started_at`
hoje às 14h ⇒ faixas 0..3 de hoje `null` e a 4 (12h–15h) contada. Mais: os probes da `71` rodam de
novo, verdes, **por nome** (`dia.sql`, `papeis.sql`, `relogio.sql`, `teto.sql`, `vendas.sql`,
`visitas.sql` — `concorrencia.sql` exige `-v id -v espera` e não é `begin … rollback`); e os `.sh`
que comprometem (`concorrencia.sh`, `ponta-a-ponta.sh`) rodam à parte depois de `migration up --local`,
conferindo `first_hour` não nulo e igual à hora de Brasília da chamada — o caminho REAL da gravação
(function `visit` com a chave de serviço), que o `01-acessos.sql` não alcança.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 \
  -f .specs/features/83-loja-ao-vivo/probes/01-acessos.sql
```

Exit 0 e só `ok —`. **Não roda no CI** (`BL-050`, mesma família): entra no gate da task 02 e no de
toda migration futura que recrie `store_movement` ou `record_store_visit` (registrado em `BL-056`).

---

## 7. Tratamento de erro

| Cenário | Tratamento | O que a Adri vê |
| --- | --- | --- |
| `store_movement` `42501` | `useRecusaDePapel` ⇒ `retryAdminCheck` ⇒ `RequireAdmin` | Login com "Esta conta não tem acesso ao painel." |
| Rede caída / 500 na primeira leitura | `Leitura.falhou` | "Não consegui carregar." + "Tentar de novo" (seção e cartão) |
| Releitura (15 s / 30 s) falha com dado | dado mantido | "Não consegui atualizar agora." no lugar do frescor (tela); Início: a `LinhaDeFrescor` de sempre |
| Resposta sem `acessos` (banco antigo) | `accessChart` ⇒ `null`; `accessCards` sem variação | números sem variação; gráfico com a falha do bloco |
| App em segundo plano | `refetchIntervalInBackground: false`; o timer da virada só relê com foco; o Realtime invalida com `refetchType: 'none'` | nada sai; na volta, uma leitura |
| Recusa com o papel ainda admin | `refetchInterval` devolve `false` com `isAccessDenied` | o bloco diz que não carregou; a RPC recusada não é martelada |
| Sem rede no aparelho | `OfflineScreen` (a `72`) | a tela de sem conexão |

---

## 8. Riscos

| Risco | Onde | Impacto | Mitigação |
| --- | --- | --- | --- |
| Duas cópias do corpo de `store_movement` (a da `71`, aplicada, e a da `83`) divergirem em regra de venda/visita | `20261021…sql` × `20261029…sql` | a régua de venda da `71` (`AD-055`) muda em silêncio | as funções de asserção de `visitasSchema` aplicadas também à migration vigente; régua (7) por fragmento; o probe compara os números de `periodos` com a fixtura da `71` |
| Uma visita comitar entre dois comandos da leitura | `store_movement` | `soma(por_faixa) + sem_hora ≠ visitas` na mesma resposta | um comando só para `store_visits` (régua 12) + `faixa_atual` com `greatest(…)` + fixtura do probe |
| A largura da faixa mudar num lado só (SQL × `ACCESS_BAND_LABELS`) | migration × `core/live` | rótulos errados com tudo verde | régua (11) lê os dois e compara |
| A recriação perder o `grant … to service_role` de `record_store_visit` | migration | toda visita dá 500, e a loja "conta zero" | régua (5) + probe (`service_role` executa) |
| Ciclo de 30 s mudar contagens exatas da suíte da `73` | `InicioPage.test.tsx` e os outros nove arquivos que montam `/` | testes verdes por afrouxamento, ou vermelhos sem razão de produto | §6, linhas do `InicioPage.test.tsx` e dos outros testes; a lista vai no Status da T09 |
| Visitas sem hora no dia do deploy | dados | faixas somam menos que o total | `sem_hora` + nota de `LAV-53`; `comparacao.hoje` vira `null` no dia seguinte ao deploy |
| As três notas saírem do escopo de `semPessoas` | painel | "pessoas" entra numa nota sem acusar | `tomDaLojaAoVivo` lê `core/stats/counterNotes.ts` |
| O "há {s} s" re-renderiza a cada segundo | `CabecalhoAoVivo` | custo baixo; leitor de tela anunciando a cada segundo | a linha de frescor **não** é região viva (`aria-live` ausente); só `NAO_ATUALIZOU` é `role="status"` |
| Hero controlado divergir do não controlado | `MovementHero` | a Início perde o período ao re-renderizar | testes da `73` intactos + caso novo: trocar na faixa e tocar o cartão leva o período |

---

## 9. Decisões técnicas

| Decisão | Escolha | Razão |
| --- | --- | --- |
| Forma da resposta | chave `acessos` ao lado de `periodos` (abordagem A) | `MovementPeriod` intacto; uma chamada |
| Onde as regras moram | `core/live/` (PRD §6.3) para conversão, variação, gráfico e frases; `core/stats/counterNotes.ts` para as notas que o painel já tinha | um dono por regra; `core/live` é a casa das Fases 2–4 |
| Quem decide comparabilidade | o banco (`visitas: null`) | `LAV-61`; a decisão depende de `contagem_desde` e `sem_hora`, que o banco tem |
| Frescor | duração local desde a chegada, a cada 1 s | o relógio de parede do aparelho não entra (`turnDelayMs` é o precedente) |
| Seletor | estado da seção, inicial do `history.state` | `LAV-50`; F5 preserva, URL limpa |
| Barras | sem transição | `LAV-64` por construção |

### `AD-066` (proposta, vai ao `STATE.md` na task 14)

- **Decision**: a Loja ao vivo, Fase 1, guarda **só a hora cheia de Brasília (0–23) da primeira visita
  do dia** em `store_visits.first_hour`, decidida pelo banco na **inserção** (`store_hour(p_agora)`,
  `on conflict do nothing`) — emenda a `VIS-28` da `71`. Os acessos (faixas de 3 h, dias da semana,
  comparações) saem da **mesma** `store_movement`, numa chave `acessos`, sem RPC nova; a faixa em
  andamento, o "hoje" e a comparabilidade são decididos no banco.
- **Decision**: Hoje compara **horas completas dos dois lados** (de 0h até o início da hora atual,
  hoje × ontem); Semana não tem comparação de visitas enquanto a retenção for de 8 dias (`BL-055`) —
  a de vendas depende do portão `T00`.
- **Decision**: tudo o que a leitura tira de `store_visits` sai de **um** comando SQL (um snapshot), e
  a faixa em andamento é `greatest(hora do servidor, maior first_hour de hoje) / 3`.
- **Decision**: as notas do contador ("Contando desde", teto, contador parado) têm **um** dono,
  `core/stats/counterNotes.ts`, lido pelo painel (reexporta, `toBe`) e pelo app.
- **Reason**: a hora cheia é o mínimo que responde "a que horas"; uma leitura só faz a faixa do Início
  e a Loja ao vivo mostrarem o mesmo número por construção; comparar um dia em curso com um dia
  inteiro fabrica queda toda manhã, e comparar a hora parcial de hoje com a hora cheia de ontem
  fabrica queda a cada começo de hora.
- **Revisit when**: a Fase 2 trouxer presença (a tabela efêmera do PRD §3, Opção A) — ou a Adri pedir
  "vs semana anterior" (retenção de 14 dias).

---

## 10. Revisão adversarial do plano

Três revisores (lentes: fidelidade, arquitetura, testabilidade) leram `spec.md`, `design.md` e
`tasks.md` em 2026-10-26. Cada achado foi **conferido no disco** antes de ser aceito: o arquivo e a
linha citados foram abertos, e a afirmação do plano que o achado contesta foi medida contra o código.
Achados repetidos entre lentes estão agrupados (F = fidelidade, A = arquitetura, T = testabilidade).

| # | Achado | Lentes | Veredito | Motivo (o que o disco mostrou) e onde foi aplicado |
| --- | --- | --- | --- | --- |
| 1 | `abasSaoAsRotas`: o plano dizia que `ROTAS_DA_CONTA` e as asserções dela ficavam intactas | F1 · A4 · T2 | **aceito** | `abasSaoAsRotas.test.ts:39,53-56,69-72`: `rotasDoApp` só exclui `ROTAS_DA_CONTA` (âncora `toHaveLength(4)` e "as duas listas são a mesma" reprovam) e o sensor de `/avisos` faz `toEqual(['/avisos'])` sobre todas as rotas de primeiro nível. §6, T06, T08: `rotasDoApp` exclui `ROTAS_DA_CONTA ∪ ROTAS_DE_TELA`, o sensor filtra `ROTAS_DE_TELA`, sensor-irmão para `/ao-vivo`, declarado como mudança de fixture |
| 2 | `rotasSobGuarda` reprova com a 13ª rota | F2 · A4 · T1 | **aceito** | `rotasSobGuarda.test.ts:66-79`: âncora literal com as doze rotas. §6 e T08: âncora para treze, título reescrito, caso novo "`/ao-vivo` dentro do bloco" |
| 3 | `core/stats/purity.test.ts` crava cinco arquivos | F3 | **aceito** | `purity.test.ts:22-24`. §3.3, §6 e T05: âncora para seis, `counterNotes.ts` com `../time/format.ts` |
| 4 | `PERIODOS` mora em `widgets/movement-hero`: importar de `entities` ou de outro widget viola o FSD; copiar é segundo dono. E o inteiro pt-BR tem dois donos | F4 · A5 · T5 | **aceito** | `numeros.ts:7-13` (`PERIODOS`, `INTEIRO`) e `labels.ts:23-26` do painel (`formatCount`); `eslint.fsd.mjs` em `warn` e o lint do app 0/0. §4 (`entities/stats/model/periodos.ts`), §3.3 (`formatCount` em `core/stats`, painel reexporta `toBe`), §6 (`periodosComDonoUnico`), T05, T06 com eslint 0/0 |
| 5 | Régua (7) "trechos idênticos por texto" não passa sobre o SQL do próprio design, e afrouxada deixa `visitasSchema` medindo a versão não vigente | F5 · A2 · T3 | **aceito** | design §2 contra `20261021120000_71-visitas-unicas.sql:292-312`: os SELECTs mudam de colunas e de piso; `visitasSchema.test.ts:29` lê só a `71`. §6: régua (7) por fragmento (a–d) + funções de `visitasSchema` em `visitasRegras.ts` aplicadas à migration vigente; T01 com os mutantes de venda no arquivo da `83` |
| 6 | "Nenhuma leitura em segundo plano" (PRD critério 5, `LAV-08`) não é garantido: o timer da virada e o Realtime leem | F6 · T4 | **aceito, caminho (b)** | `useStoreMovement.ts:49-58` (`setTimeout` → `refetch()` sem olhar o foco) e `InicioPage.tsx` (Realtime → `invalidateQueries`). Escolhido corrigir o código, não estreitar a AC: o timer só relê com `focusManager.isFocused()`, o Realtime invalida com `refetchType: 'none'` sem foco. §3.2, §7, spec (`LAV-05`, `LAV-08`, Success Criteria, Assumptions), T03, T08, T09 com fixtura em que a virada cai **dentro** da janela em segundo plano (a de `movimento.ts`, a 12,5 h, era verdadeira nos dois mundos) |
| 7 | Comparação de Hoje junta hora parcial de hoje com hora cheia de ontem: queda fabricada em todo começo de hora | F7 · A6 · T14 | **aceito** | design §2 antigo: `make_interval(hours => v_hora + 1)` e `first_hour <= v_hora`. Novo: **horas completas dos dois lados** (`first_hour < h`; vendas `< início + h`), `base_hoje` devolvido pelo servidor, `ate_hora` para o texto "vs ontem até as {h}h"; sem linha com `h = 0`. Spec (Assumptions, `LAV-51`, `LAV-73`, edge cases), §2, §3.1, §3.4, AD-066, probe às 15h02 e 00h30. Marcado `n — confirmar` no portão T00 |
| 8 | Desvios com copy/número visível seriam implementados antes de alguém confirmar; Semana descartada como "incoerente" sem perguntar | F8 | **aceito** | `tasks.md` não tinha portão; spec dizia "incoerente". Task **T00** (portão antes da T01, porque a comparação e a Semana mudam o SQL) e a linha de Semana com as três opções e o custo de cada |
| 9 | O guarda de tom recusa "pessoa(s)" em todo `core/live/**`, que o PRD define como casa da Fase 2 (que escreve "pessoas") | F9 · A8 · T21 | **aceito** | `prd.md` `LAV-01/02/10/30`. §6: escopo literal nos arquivos da Fase 1, nomeados; `BL-057` registra o conflito `VIS-41` × copy da Fase 2 (T14) |
| 10 | Três cartões numa grade pensada para quatro: a Conversão sozinha com célula vazia | F10 | **aceito** | `prototipo.md:153` (2 colunas, quatro cartões). Conversão em largura inteira (`[&>*:last-child]:col-span-full`), spec (Assumptions, `LAV-51`), §4, T07 (token), T13 (medida) |
| 11 | Resposta sem `acessos` desenhava `FalhaDoBloco`, com "Tentar de novo" que nunca resolve | F11 · T20 | **aceito** | `leitura.tsx:42-61`: `FalhaDoBloco` sempre tem o botão. Frase estática sem botão (`CHART_UNAVAILABLE`), spec `LAV-55`, §3.4, §4, T07 |
| 12 | Nome acessível do cartão só definido com dado; na falha o toque relê e o nome mentiria | F12 | **aceito** | spec `LAV-04` só tinha o estado com dado. Três nomes (com dado, carregando, falha), §3.4 (`card.ts`), T09 |
| 13 | A posição do cartão em relação à `LinhaDeFrescor` não estava escrita | F13 | **aceito** | `InicioPage.tsx`: `LinhaDeFrescor` entre o hero e `QueueTiles`. Ordem hero → cartão → `LinhaDeFrescor` → `QueueTiles` na spec, §4 e T09 |
| 14 | Voltar de `/ao-vivo` perde o período da Início (a página desmonta) | F14 | **aceito** | `MovementHero.tsx:25` (estado local) e §4 (estado na página). `history.replaceState` na entrada da Início (molde de `useTermoDaEntrada`), spec, §4, T06, T09 |
| 15 | Faixas anteriores a `contagem_desde` desenham `0` ("ninguém veio"); teto não anula a comparação | F15 · A11 | **aceito** | design §2 antigo devolvia `coalesce(c.n, 0)`; `teto_dia` recortado por `v_desde` não cobre anteontem. Servidor devolve `null` nas faixas antes da contagem (`sem_contagem` no app) e `visitas: null` na comparação com o teto em hoje/ontem/anteontem, sem mudar a chave `teto_dia` que o painel lê. Spec, §2, §3.4, probe |
| 16 | Cabeçalho do PRD dizia que o protótipo não está no disco | F16 | **aceito** | `prototipo.md:3-6` e `prototipo/Atelie-Admin.dc.html` existem. Nota trocada por ponteiro em `prd.md` |
| 17 | Coerência gráfico × Visitas não é "por construção": quatro SELECTs em READ COMMITTED, e a linha com hora acima do `p_agora` some do gráfico | A1 | **aceito** | design §2 antigo: visitas, faixas de hoje, de ontem e `por_dia` em comandos separados, `volatile`; `case when f.faixa > v_faixa then null`. Novo: **um comando** com CTE `v`; `faixa_atual = greatest(hora, max(first_hour) de hoje) / 3`; régua (12) recusa um segundo `from public.store_visits`; fixtura "do futuro" no probe |
| 18 | `refetchInterval` fixo continua com a recusa `42501` e o papel admin (a página não desmonta); e subsume o teste da virada | A3 | **aceito** | `InicioPage.test.tsx:257-281` (`pathname` segue `/`, `toHaveLength(3)` depois de `andar(30_000)`) e `:390-401` (`andar(50_000)` ⇒ 1: com o ciclo seriam 2, e o `≥ 2` final passaria sem o timer). `refetchInterval` função com `isAccessDenied`; o caso da recusa fica intacto e vira a prova; o da virada mede a 10 s. §3.2, §6, T03, T08, T09 |
| 19 | `inicioDo`/`fimDo` ficam sem uso no painel e o lint sai de 23/5 | A7 | **aceito em parte** | Ficam sem uso, sim (`labels.ts:29-33`, usados só nas linhas 79 e 113). Mas o lint **não** acusaria: `apps/backoffice/eslint.config.js:25` desliga `@typescript-eslint/no-unused-vars` e `tsconfig.base.json` tem `noUnusedLocals: false`. Aceita a remoção (código morto que repete a regra do dono); recusada a razão do lint. T05 apaga e mede o eslint (23/5) |
| 20 | Largura da faixa (`/ 3`, `generate_series(0, 7)`) em SQL e os rótulos em TS, sem guarda | A9 | **aceito** | design §2 e §3.4. Régua (11) lê a migration vigente e compara com `ACCESS_BAND_LABELS` importado; entra como `it.todo` na T01 e vira asserção na T04 (o módulo nasce lá) |
| 21 | Régua (1) só reconhece `alter table … store_visits add column` | A10 | **aceito** | design §6 antigo. Recorte por comando até o `;`, todas as cláusulas `add [column]`, `rename column`, `alter column … type`, `only`, vírgula; sensores para cada forma (T01) |
| 22 | Critério 1 do PRD ("idênticos") não tinha prova entre as DUAS telas | T6 | **aceito** | T09 só comparava cartão × faixa em Hoje. Caso pelo `<App />` atravessando `/` → `/ao-vivo` nos três períodos com fixtura distinta (`L-013`) e mutante; Success Criteria |
| 23 | "Trocar não chama a RPC" no teste do widget é verdade por construção | T7 | **aceito** | A seção recebe a leitura por prop (§4). Asserção movida para a T08, pelo `<App />` em `/ao-vivo`, com o mutante "período na `queryKey`" |
| 24 | A lista de testes afetados pelo ciclo de 30 s era "por pasta" e deixava arquivos de fora | T8 | **aceito** | grep no disco: dez arquivos montam `/`, incluindo `widgets/tab-bar`, `widgets/account-menu` e `PedidoPage.test.tsx`. Lista nominal em §6 e T09, regerada na hora |
| 25 | Faltava a recusa na **releitura** (dado no cache, depois 403) e o laço de reconferência a cada ciclo | T9 | **aceito** | `useRecusaDePapel.ts:60-64` encerra o episódio com leitura boa. T11: 200 → 403 sem número nem "Atualizado há"; T09: `recusaComPapelAdmin` por ≥ 4 ciclos ⇒ uma reconferência. O laço em si fica coberto por construção pelo intervalo que para na recusa (#18) |
| 26 | O gráfico com fonte grande não tinha saída decidida | T10 | **aceito** | 8 colunas em ~360 px. Contêiner `overflow-x-auto` + `min-w-[2.75rem]` por coluna (rem), régua de token (T07) e medida com 4 dígitos a 200 % (T13). Spec `LAV-52` |
| 27 | Nenhuma task provava a gravação REAL (function `visit` com a chave de serviço) nem a concorrência | T11 | **aceito** | os `.sh` da `71` existem e não estavam no gate. T02 e o gate Probe rodam `concorrencia.sh` e `ponta-a-ponta.sh`; o probe confere `service_role` em `record_store_visit` |
| 28 | O glob dos probes da `71` incluía `concorrencia.sql`, que não roda sozinho | T12 | **aceito** | `concorrencia.sql:3-11` exige `-v id`/`-v espera` e compromete. Lista por nome no gate e no §6 |
| 29 | "`store_visits` tem exatamente três colunas" só provado pela fonte | T13 | **aceito** | design §6. `information_schema.columns` no probe (T02, Success Criteria) |
| 30 | "Nome acessível" num `div` sem papel | T15 | **aceito** | spec `LAV-51`. `role="group"` + `aria-label`, teste por `getByRole('group', { name })` (T07) |
| 31 | Arredondamento do meio negativo indefinido | T16 | **aceito** | `Math.round(-12.5) = −12`. Metade para longe do zero, `n — confirmar`; casos ±12,5 (T04) |
| 32 | O cabeçalho sticky de borda a borda depende de `-mx-4 -mt-4` | T17 | **aceito** | `CabecalhoDoPedido.tsx:42-44` e `MobileLayout.tsx:64` (`px-4 pt-4`). Classes no §4, régua de token na T08, medida na T13 |
| 33 | A matriz de testes mandava rodar core e mobile-adm sem `--testTimeout=20000` | T18 | **aceito** | `baseline.md` mediu todos com o teto. Matriz e gate Quick corrigidos |
| 34 | `semPessoas` do painel perde as três notas, e a compensação é um guarda de outro workspace | T19 | **aceito** | `labels.ts` (comentário do topo). `semPessoas` passa a ler `core/stats/counterNotes.ts`, com âncora (T05) |

**Contagem**: 48 achados recebidos, agrupados em 34 itens. **47 aceitos** e **1 aceito em parte**
(#19: a remoção dos helpers mortos foi aceita; a afirmação de que o lint do painel sairia de 23/5 foi
recusada — a regra está desligada). Nenhum achado foi recusado por inteiro: todas as afirmações
factuais conferidas no disco eram verdadeiras.
