# 83 — Loja ao vivo (Fase 1) · Validação

**Rodada**: 1
**Data**: 2026-10-27
**Spec**: `.specs/features/83-loja-ao-vivo/spec.md`
**Diff range**: `744da7ea..3f1360fe` (19 commits, `f4d0bd40` … `3f1360fe`, branch `feature/83-loja-ao-vivo`)
**Verificador**: sub-agente independente (autor ≠ verificador). Não herdou o contexto das tasks; leu a
spec, o diff e os testes do zero.

## Veredito: ❌ FAIL — por COBERTURA, nenhum defeito de produto

63 mutantes de comportamento nos arquivos reais: **59 mortos, todos por asserção** (nenhum por
compilação), **4 sobreviventes** — 1 equivalente declarado (S22) e **3 lacunas de prova no SQL**
(S05, S06, S09). O código de hoje faz o certo nos três; o que falta é a régua que o prove. Mais uma
lacuna de precisão da spec (`LAV-62`, o foco no `h1` de `/ao-vivo`, sem caso próprio) e uma nota de
ambiguidade (`LAV-52`, "hoje em `accent`").

---

## Gate (medido pelo verificador, um workspace por vez, exit fora de pipe)

`pnpm --filter @estrelinha/<ws> test --testTimeout=20000` (sem o `--`), logs em
`/private/tmp/claude-503/f83/v/gate-*.log`.

| Workspace | Arquivos | Testes | Exit | Baseline de entrada (`baseline.md`) | Delta |
| --- | --- | --- | --- | --- | --- |
| core | 182 | 4556 | 0 | 178 / 4466 | +4 / +90 |
| mobile-adm | 137 | 2162 | 0 | 126 / 2021 | +11 / +141 |
| store | 327 | 6116 | 0 | 326 / 6013 | +1 / +103 |
| backoffice | 226 | 3922 | 0 | 225 / 3916 | +1 / +6 (só o guarda `notasDoContadorNoCore`) |
| functions | 26 | 1105 | 0 | 26 / 1105 | idêntico |
| **Total** | **898** | **17861** | | **881 / 17521** | **+17 / +340** |

Os números batem exatamente com os do `tasks.md` (T12/T14). Nenhuma queda; backoffice e functions
dentro do esperado do `baseline.md`. Probe `probes/01-acessos.sql` contra o banco local: **exit 0,
70 `ok —`** (`probe-base.log`). `tsc`/eslint não foram remedidos pelo verificador (nenhum código mudou
depois do gate Build da T14, conferido por `git status` limpo antes e depois do sensor).

---

## Checagem ancorada na spec (evidence-or-zero)

| AC | Resultado da spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| LAV-04 cartão | eyebrow, número pt-BR, nome acessível exato nos 3 estados; ordem hero → cartão → frescor → fila; toque com período; falha relê | `widgets/visits-card/__tests__/CartaoVisitasHoje.test.tsx:33,52,61,69,82`; `pages/__tests__/inicioAoVivo.test.tsx:76,92,99,108,123,139` | ✅ (A01, A02, A13, A18, C10 mortos) |
| LAV-05 ciclo 30 s, nada em 2º plano, para na recusa | +1 a 30 s, 0 a 29,8 s; Realtime e virada sem leitura oculta | `inicioAoVivo.test.tsx:165,175,202`; `app/__tests__/recusaComPapelAdmin.test.tsx`; `core/src/hooks/__tests__/useStoreMovement.test.ts:456-544` | ✅ (A11, A17, H01–H03 mortos) |
| LAV-06 rota sob guarda, sem barra, Voltar | dentro do `RequireAdmin`; `barraNoCaminho` falso; `-1` com `doApp`, `/` por `replace` sem | `app/__tests__/rotasSobGuarda.test.ts`; `widgets/tab-bar/__tests__/barraNoCaminho.test.ts:6`; `pages/__tests__/AoVivoPage.test.tsx:117,128` | ✅ (R01, A13 mortos) |
| LAV-07 cabeçalho e frescor | 60 px, `surface`, fio, `sticky`; "agora" < 2 s, "há {s} s", "há {m} min", `NAO_ATUALIZOU`, nada sem dado; duração local | `AoVivoPage.test.tsx:103,212,220,230,93`; `core/src/live/__tests__/access.test.ts:298` (limiares 1,9/2/59/60) | ✅ (A06, A07, A20, C06 mortos) |
| LAV-08 ciclo 15 s | +1 a 15 s, nada a 14,8 s; 0 oculto atravessando a virada; para na recusa; trocar período não lê | `AoVivoPage.test.tsx:152,169,183,196,249,258,266` | ✅ (A19, H01–H03 mortos) |
| LAV-50 seletor | `h2`, 3 botões 44 px `aria-pressed`, inicial do `history.state`, fora do vocabulário ⇒ Hoje, 0 chamadas | `SecaoAcessos.test.tsx:29,36,45`; `entities/stats/model/__tests__/aoVivo.test.ts`; `AoVivoPage.test.tsx:145,152` | ✅ (A15, A16 mortos) |
| LAV-51 cartões | 3 cartões; conversão 1 casa, "—"; variação simétrica, U+2212, 0% neutro, sem base ⇒ sem linha; "ontem até as {h}h" do servidor; `base_hoje` | `access.test.ts:83,97,104,109,117,126,139,150,160,177,185,196`; `SecaoAcessos.test.tsx:59,69,76,83,98,105,113` | ✅ (C01–C03, C07, C08, C11, C12, A08 mortos) |
| LAV-52 gráfico | 8 faixas, atual `accent` + rótulo `ink`, futuras e pré-contagem trilho 4 px sem número, Ontem só `primary`, Semana seg…hoje, zeros ⇒ 4 px | `SecaoAcessos.test.tsx:125,142,153,163,174,180,191,208`; `access.test.ts:204,220,227,258,269,274,281`; `widgets/store-access/__tests__/barras.test.ts` | ✅ (A04, A05, A14, C04, C09 mortos). ⚠️ precisão: a spec diz "'hoje' em `accent`"; o teste (`:163`) assere a BARRA em `accent` e o RÓTULO em `ink` — leitura coerente com a de Hoje e com `accentText` (ouro proibido como texto), mas a frase da spec é ambígua |
| LAV-53 notas | nota das faixas / da semana; "{n} visitas…" plural, singular, ausente com 0 | `SecaoAcessos.test.tsx:221,230`; `access.test.ts:241,290` | ✅ (C05 morto) |
| LAV-54 notas do contador | "Contando desde", teto, contador parado | `SecaoAcessos.test.tsx:251,266` | ✅ (A09, A10 mortos) |
| LAV-55 estados exclusivos | carregando / falha / dado / releitura falhada / sem `acessos` (frase estática, sem botão) | `SecaoAcessos.test.tsx:285,296,308,317,323` | ✅ (A03, A12 mortos) |
| LAV-60 recusa | `42501` ⇒ Login, nenhum número nem o do cache; 500/rede ⇒ falha | `app/__tests__/aoVivoComClientReal.test.tsx:109,117,128,137,153,188,199`; `AoVivoPage.test.tsx:277,293` | ✅ (A19 morto) |
| LAV-61 sem relógio do aparelho | nenhum `new Date`/`Date.now`/`getHours` fora de `useSegundosDesde` | `shared/lib/__tests__/aoVivoSemRelogioDoAparelho.test.ts:77-115` | ✅ (G05, A20 mortos) |
| LAV-62 `h1`, título, foco | `h1` em todo estado; `document.title` "Loja ao vivo · Ateliê"; foco no `h1` na troca de rota | `AoVivoPage.test.tsx:71,82,93` (`h1` e título nos três estados) | ⚠️ **parcial**: o foco no `h1` ao chegar em `/ao-vivo` não tem caso. Depende do mecanismo genérico de `MobileLayout` (`MAF-29`), provado só para as abas (`app/__tests__/anuncios.test.tsx:60,70`). A21 (título) morto |
| LAV-63 fonte grande | `auto-fit` com piso em rem; gráfico rola no cartão; sem rolagem do `body` | tokens: `SecaoAcessos.test.tsx:105,180`; medida: `prova-navegador.md` (48 telas, 360/390/412/1440 × 100/130/200 %) | ✅ (tokens no jsdom; layout só em navegador, declarado) |
| LAV-64 movimento reduzido | barras sem transição; todo `transition-*`/`animate-*` com par | `SecaoAcessos.test.tsx:208`; `tomDaLojaAoVivo.test.ts:178-190` | ✅ |
| LAV-65 tom | sem nome, emoji, `!`, urgência, "pessoa(s)"/"usuário(s)" | `tomDaLojaAoVivo.test.ts:121-170` | ✅ (G03 morto) |
| LAV-66 política | parágrafo do Apêndice A palavra por palavra; sem a hora reprova | `apps/store/src/pages/__tests__/politicaDoContador.test.ts:55,78,87`; `PrivacyPolicyPage.test.tsx` | ✅ (G02 morto, 14 casos) |
| LAV-67 consentimento | a seção TERMINA com a nota | `SecaoAcessos.test.tsx:275,285` | ✅ (A12 morto) |
| LAV-70 coluna e gravação | `first_hour` 0..23 anulável, hora de Brasília na inserção, repetição não muda, grant intacto | probe `01-acessos.sql` (bordas 02:59/03:00/23:59, repetição, `information_schema`, `service_role`); `visitasPorHoraSchema.test.ts` (1)–(5) | ✅ (S11, S12, S14 mortos) |
| LAV-71 `acessos` | `faixa_atual` com `greatest`, futuras e pré-contagem `null`, `sem_hora`, um snapshot, invariante | probe (00h30, 14h30, invariante, linha do futuro, contagem desde 14h); `visitasPorHoraSchema.test.ts` (11), (12) | ✅ (S03, S07, S10, S17 mortos) |
| LAV-72 `por_dia` | seg→hoje, dia vazio 0, último = `hoje.visitas` | probe (seg, qua, dom) | ✅ (S13 morto) |
| LAV-73 comparação | Hoje em horas completas dos dois lados; os 5 motivos de `visitas null`; vendas null só com h = 0; Ontem = anteontem inteiro; Semana null | probe (15h02, 00h30, sem hora em ambos / só ontem, contagem ontem/anteontem, teto hoje/ontem/anteontem); `visitasPorHoraSchema.test.ts` (13) | ❌ **3 lacunas** — S05, S06, S09 sobrevivem (abaixo) |
| LAV-74 papéis | 42501 antes de ler; definer; `execute` só `authenticated`; `store_hour`/`record_store_visit` fechados | probe (anon, cliente, `store_hour`, `record_store_visit`); `visitasPorHoraSchema.test.ts` (5), (6) | ✅ (S21, S23, S24 mortos; S14 só pelo guarda — ver lição) |
| LAV-75 dono único das notas | o painel reexporta por referência (`toBe`); suíte do painel sem asserção tocada | `apps/backoffice/src/app/__tests__/notasDoContadorNoCore.test.ts:23-35`; backoffice 3916 → 3922 = só o guarda | ✅ (G01 morto) |

**Status**: 23 de 25 ACs com evidência que discrimina; `LAV-73` com 3 lacunas de prova; `LAV-62`
parcial (foco). Os critérios de sucesso de dois apps (Visitas/Vendas iguais nas duas telas,
`inicioAoVivo.test.tsx:139`; zero leituras em 2º plano, `:175` e `AoVivoPage.test.tsx:183`) estão
provados pelo `<App />` real.

---

## Sensor de discriminação (63 mutantes, arquivos reais, SHA-256 conferido na restauração)

Arnês: `/private/tmp/claude-503/f83/v/mutar.py` — o alvo tem de existir **exatamente uma vez** (senão o
mutante é inválido), a substituição roda o comando, o arquivo volta byte a byte e o SHA-256 é
comparado. Classificação: `ASSERÇÃO` = falha de teste/probe; `COMPILAÇÃO` = erro de transformação. Os
mutantes de SQL rodam o probe (que aplica a migration DO DISCO dentro de `begin … rollback`); os que
sobrevivem ao probe rodam também os guardas de fonte da loja.

### SQL — `supabase/migrations/20261029120000_83-loja-ao-vivo.sql`

| # | Mutação | Medido por | Resultado |
| --- | --- | --- | --- |
| S01 | `v_inicio_dia is null or … >= v_ontem` → `> v_ontem` | probe | ✅ asserção (contagem começando ontem) |
| S02 | idem em `v_sem_cmp_ontem` (`>= v_anteontem` → `>`) | probe | ✅ asserção |
| S03 | faixa "antes da contagem" `<= v_inicio` → `<` | probe | ✅ asserção |
| S04 | `hoje_base` `first_hour < v_hora` → `<=` | probe | ✅ asserção (15h02) |
| **S05** | vendas de **anteontem** `paid_at < v_ini_ontem` → `<=` | probe **e** guardas | ❌ **SOBREVIVEU** |
| **S06** | `v_sem_cmp_hoje` sem `v_sem_hora_hoje > 0` | probe **e** guardas | ❌ **SOBREVIVEU** |
| S07 | `ontem.por_faixa` sem o `null` antes da contagem | probe | ✅ asserção |
| S08 | `base_hoje.vendas` sem o `null` com h = 0 | probe | ✅ asserção (00h30) |
| **S09** | `v_sem_cmp_hoje` sem `v_inicio_dia is null` (contagem nunca começou) | probe **e** guardas | ❌ **SOBREVIVEU** |
| S10 | `faixa_atual` = `v_hora / 3` (sem `greatest`) | probe | ✅ asserção (linha do futuro) |
| S11 | `on conflict do nothing` → `do update set first_hour = excluded.first_hour` | guarda (4) | ✅ asserção |
| S12 | `store_hour` com o fuso literal | guardas (3)/(8) | ✅ asserção |
| S13 | `por_dia` em ordem decrescente | probe | ✅ asserção |
| S14 | `revoke … store_hour` sem `authenticated` | probe: **sobrevive**; guarda (3): ✅ asserção | ✅ morto pelo guarda — o probe é cego (ver lição) |
| S15 | teto em `v_sem_cmp_hoje` só em `v_hoje` | probe | ✅ asserção |
| S16 | vendas de ontem na comparação sem o corte de `h` | probe | ✅ asserção |
| S17 | futuras `faixa > atual` → `>=` | probe | ✅ asserção |
| S21 | `grant execute store_movement … to authenticated, anon` | guarda (6) | ✅ asserção (o probe também seria cego: `has_role` recusa o `anon` de qualquer jeito) |
| S22 | `has_role` movido para depois de `v_hoje := store_day(p_agora)` | guardas | ⚪ sobreviveu — **equivalente**: nenhuma leitura de dado acontece antes do portão (só aritmética de data) |
| S23 | portão `has_role` apagado | probe + guarda (6) | ✅ asserção (os dois) |
| S24 | poda sem `least(…)` | guarda | ✅ asserção |

### `packages/core/src/live/*` e hook

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| C01 | `access.ts` | `anterior <= 0` → `< 0` | ✅ asserção |
| C02 | `access.ts` | `p > 0` → `p >= 0` ("+0%" verde) | ✅ asserção |
| C03 | `access.ts` | variação da Conversão sem `conv !== null` | ✅ asserção |
| C04 | `access.ts` | "hoje" da semana vira o dia da semana | ✅ asserção |
| C05 | `access.ts` | singular de `noHourNote` apagado | ✅ asserção |
| C06 | `access.ts` | `segundos < 60` → `<= 60` | ✅ asserção |
| C07 | `access.ts` | conversão com até 2 casas | ✅ asserção |
| C08 | `access.ts` | "ontem até as {faixa_atual × 3}h" | ✅ asserção |
| C09 | `access.ts` | `null` antes da atual vira `futura` | ✅ asserção |
| C10 | `card.ts` | nome acessível sem `formatCount` | ✅ asserção |
| C11 | `access.ts` | `Math.round(x)` simples (assimétrico) | ✅ asserção |
| C12 | `access.ts` | Ontem comparado com `comparacao.hoje` | ✅ asserção |
| H01 | `hooks/useStoreMovement.ts` | `refetchIntervalInBackground: true` | ✅ asserção |
| H02 | idem | intervalo sem parar na recusa | ✅ asserção |
| H03 | idem | timer da virada sem checar o foco | ✅ asserção |

### App (`apps/mobile-adm/src`)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| A01 | `CartaoVisitasHoje.tsx` | carregando tratado como falha (o toque relê) | ✅ asserção |
| A02 | idem | sem `aria-busy` | ✅ asserção |
| A03 | `SecaoAcessos.tsx` | sem `acessos` ⇒ `FalhaDoBloco` com botão | ✅ asserção |
| A04 | `model/barras.ts` | `Math.round` → `Math.floor` | ✅ asserção |
| A05 | `GraficoDosAcessos.tsx` | rótulo da atual em `ink-soft` | ✅ asserção |
| A06 | `AoVivoPage.tsx` | `NAO_ATUALIZOU` sem dado na tela | ✅ asserção |
| A07 | `useSegundosDesde.ts` | relógio de 60 s em vez de 1 s | ✅ asserção |
| A08 | `entities/stats/model/periodos.ts` | `falado` "semana" | ✅ asserção |
| A09 | `SecaoAcessos.tsx` | sem a nota do contador parado | ✅ asserção |
| A10 | idem | sem a nota do teto | ✅ asserção |
| A11 | `InicioPage.tsx` | ciclo de 15 s em vez de 30 s | ✅ asserção |
| A12 | `SecaoAcessos.tsx` | consentimento no estado de carregamento | ✅ asserção |
| A13 | `CartaoVisitasHoje.tsx` | navega sem `doApp` | ✅ asserção |
| A14 | `GraficoDosAcessos.tsx` | trilho sem número em `primary` | ✅ asserção |
| A15 | `SecaoAcessos.tsx` | `aria-pressed` invertido | ✅ asserção |
| A16 | `entities/stats/model/aoVivo.ts` | qualquer string vira período | ✅ asserção |
| A17 | `InicioPage.tsx` | Realtime sempre `active` | ✅ asserção |
| A18 | `CartaoVisitasHoje.tsx` | número de Ontem no cartão | ✅ asserção |
| A19 | `AoVivoPage.tsx` | sem `useRecusaDePapel` | ✅ asserção |
| A20 | `CabecalhoAoVivo.tsx` | frescor medido de `Date.now()` | ✅ asserção (o guarda e o caso do frescor) |
| A21 | `AoVivoPage.tsx` | título sem "· Ateliê" | ✅ asserção |
| R01 | `app/App.tsx` | `/ao-vivo` fora do bloco do `RequireAdmin` | ✅ asserção |

### Guardas

| # | Alvo | Mutação | Resultado |
| --- | --- | --- | --- |
| G01 | `backoffice/.../store-movement/model/labels.ts` | `emptyCounterLine` como cópia embrulhada | ✅ asserção (`toBe`) |
| G02 | `store/src/pages/PrivacyPolicyPage.tsx` | sem "(por exemplo, 14h)" | ✅ asserção (14 casos) |
| G03 | `SecaoAcessos.tsx` | literal com "pessoas" | ✅ asserção |
| G04 | idem | segunda lista de períodos | ✅ asserção |
| G05 | `CartaoVisitasHoje.tsx` | `new Date().getHours()` | ✅ asserção |

**Resultado**: 63 injetados · 59 mortos (todos por asserção, 0 por compilação) · 1 equivalente (S22) ·
**3 sobreviventes não equivalentes** (S05, S06, S09). Árvore limpa depois do sensor (`git status`
vazio; cada restauração com SHA-256 igual ao original).

---

## Lacunas, ranqueadas

1. **S05 — a fronteira da venda de anteontem não tem régua** (`LAV-73`, `comparacao.ontem.vendas`).
   `paid_at < v_ini_ontem` trocado por `<=` deixa o probe (70 `ok`) e os guardas verdes. Consequência
   real: uma venda paga exatamente às 00:00:00 de ontem contaria em Ontem **e** em anteontem, e a
   variação de Vendas em Ontem mentiria. A régua da `71` (`visitasRegras.ts`, "fronteiras
   meio-abertas") só alcança os fragmentos de `periodos`; esta janela é nova. **Fix**: no probe, um
   pedido pago em `store_day_start(v_ontem)` exato ⇒ `comparacao.ontem.vendas` não o conta e
   `periodos.ontem.vendas` conta; e/ou estender a régua meio-aberta do guarda à janela de anteontem e
   às duas da comparação de Hoje.
2. **S06 — "linha sem hora SÓ em hoje" não tem caso** (`LAV-73`, motivo 2 de `visitas null`). O probe
   cobre "em hoje e ontem" e "só em ontem"; o primeiro é verdadeiro com o disjunto de hoje apagado.
   Na prática a combinação só existe no dia do deploy com ontem sem visita (e aí a variação some por
   `anterior = 0`), mas a resposta do servidor muda (`base_hoje.visitas` deixa de ser `null`). **Fix**:
   savepoint com linha sem hora só em hoje e ontem com visitas com hora ⇒ `visitas` e
   `base_hoje.visitas` `null`.
3. **S09 — "a contagem nunca começou" não tem caso para a comparação de Hoje** (`LAV-73`, "(ou nunca
   começou)"). Com `v_inicio` nulo, `v_inicio_dia >= v_ontem` é `NULL`, e sem o `is null` explícito o
   `case when NULL` cai no ramo do valor. Hoje é quase equivalente (sem contador não há visitas, então
   o valor é 0 e a variação some), mas é exatamente o tipo de disjunção que um refator "simplifica".
   **Fix**: `pg_temp.contador` com `started_at` nulo (ou sem linha) ⇒ as duas `visitas` da comparação
   de Hoje e a de Ontem `null`.
4. **`LAV-62` parcial — o foco no `h1` ao entrar em `/ao-vivo` não tem caso.** O `h1` existe nos três
   estados (provado), e o mecanismo genérico do `MobileLayout` está provado para as abas, mas nenhum
   teste toca o cartão e confere `document.activeElement` = o `h1` "Loja ao vivo". **Fix**: um caso em
   `inicioAoVivo.test.tsx` (tocar o cartão ⇒ foco no `h1`) e o voltar (foco no título da Início).
5. **Precisão de spec, `LAV-52`** — "no último, 'hoje' em `accent`" não diz se é a barra ou o rótulo.
   A implementação pinta a barra e deixa o rótulo em `ink` (coerente com Hoje e com `accentText`).
   Emendar a frase da spec para "a barra do último em `accent`, o rótulo 'hoje' em `ink`".

### Fix tasks propostas

| Fix | Onde | Done when |
| --- | --- | --- |
| F1 (S05) | `probes/01-acessos.sql` (+ régua opcional em `visitasPorHoraSchema.test.ts`) | o mutante S05 reinjetado derruba o probe por asserção; SHA-256 restaurado |
| F2 (S06) | `probes/01-acessos.sql` | o mutante S06 derruba o probe |
| F3 (S09) | `probes/01-acessos.sql` | o mutante S09 derruba o probe |
| F4 (`LAV-62`) | `apps/mobile-adm/src/pages/__tests__/inicioAoVivo.test.tsx` | apagar o `h1` do cabeçalho (ou trocar por `<p role="heading">` fora do `conteudo`) derruba o caso do foco |
| F5 (`LAV-52`) | `spec.md` | a frase emendada |

---

## Casos de borda (spec)

- [x] segunda ⇒ 1 coluna; domingo ⇒ 7 (probe + `access.test.ts:269,274`)
- [x] 00:30 ⇒ `faixa_atual` 0, 1..7 null, sem comparação (probe)
- [x] 23:59 BRT ⇒ dia de hoje, `first_hour` 23, faixa 7 (probe)
- [x] 02:59 / 03:00 (probe)
- [x] o mesmo navegador às 09h e às 15h ⇒ uma vez, faixa 9h (probe)
- [x] virada com a tela aberta (timer do hook, `useStoreMovement.test.ts:230-544`)
- [x] dia do deploy com visitas sem hora ⇒ nota (`SecaoAcessos.test.tsx:230`)
- [x] visitas 0 e vendas > 0 ⇒ "—" sem variação (`access.test.ts:177`)
- [x] resposta sem `acessos` (`SecaoAcessos.test.tsx:323`)
- [x] conta perde o papel com a tela aberta (`aoVivoComClientReal.test.tsx:137,153`)
- [x] 2º plano e volta (`AoVivoPage.test.tsx:183`)
- [~] dois `record_store_visit` simultâneos — provado pelo autor (`concorrencia.sh`, `02-gravacao-real.sh`, T02); **não** reexecutado pelo verificador (compromete dados no banco compartilhado com a `82`)
- [x] 15h02 com a mesma distribuição ⇒ 0% (probe)
- [x] visita com `first_hour` acima da hora da leitura (probe)
- [x] contagem desde 14h ⇒ 0h..9h null (probe)

---

## Qualidade de código

| Princípio | Status |
| --- | --- |
| Mínimo de código, sem escopo extra (nada da Fase 2 antecipado) | ✅ |
| Mudanças cirúrgicas (painel só reexporta; `functions` idêntico) | ✅ |
| Segue os padrões (dono único em `core`, `entities/` para dois widgets, guardas com âncora e sensor) | ✅ |
| Asserções com o valor da spec | ✅ (exceto as lacunas acima) |
| Cobertura por camada (domínio 1:1; páginas pelo `<App />` real; client real; probe) | ✅ |
| Cada teste mapeia a uma AC / borda / Done-when | ✅ |
| Guias seguidos: `CLAUDE.md` raiz, `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md` | ✅ |

`SPEC_DEVIATION` declarado: `LAV-60` sem `lerComPapel` (spec, *Assumptions*; código em
`AoVivoPage.tsx`) — coerente com `MAI-23`, provado pelo client real.

---

## Rastreabilidade (proposta — a `spec.md` não foi editada nesta rodada)

| Req | Novo status |
| --- | --- |
| LAV-04..08, 50..55, 60, 61, 63..67, 70..72, 74, 75 | ✅ Verified |
| LAV-62 | ⚠️ Verified com lacuna (foco) |
| LAV-73 | ❌ Needs Fix (prova: S05, S06, S09) |

---

## Resumo

**Geral**: ❌ não pronto — por cobertura. Nenhum defeito de produto encontrado.
**Ancorada na spec**: 23/25 ACs discriminam; 1 com 3 lacunas (`LAV-73`), 1 parcial (`LAV-62`), 1
ambiguidade de texto (`LAV-52`).
**Sensor**: 59/63 mortos por asserção; 1 equivalente; 3 sobreviventes.
**Gate**: 17861 testes em 898 arquivos, 5 workspaces exit 0; probe 70 `ok —`.
**Próximo passo**: F1–F4 (probe e um caso de foco) e F5 (emenda de texto); depois rodada 2.
