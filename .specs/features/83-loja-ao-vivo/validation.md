# 83 — Loja ao vivo (Fase 1) · Validação

**Rodada**: 1 (abaixo) e **2** (no fim do arquivo — veredito vigente: ❌ FAIL por cobertura, 5 lacunas de prova no SQL e 2 de precisão de spec; nenhum defeito de produto)
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

---

## Conserto da rodada 1

2026-10-27, na worktree `feature/83-loja-ao-vivo`. Autor do conserto ≠ autor da rodada 1 do
Verificador; os mutantes são os dele, reinjetados nos arquivos reais com o SHA-256 conferido na
restauração. Nenhum código de produto mudou: as cinco lacunas eram de prova e de texto.

| Lacuna | Conserto | Mutante reinjetado | Resultado | Commit |
| --- | --- | --- | --- | --- |
| 1 · S05 (`LAV-73`) | probe: pedido `PROBE-83-A2` pago em `store_day_start(20/10)` exato (`2026-10-20T03:00:00Z`) no savepoint `anteontem`; asserção nova: `comparacao.ontem.vendas` = 1 **e** `periodos.ontem.vendas` = 1 | `paid_at < v_ini_ontem` → `<=` na janela de anteontem | ✅ morto por asserção (`comparacao.ontem = anteontem inteiro…`, 44 `ok` antes da queda) | `67ab635c` |
| 2 · S06 (`LAV-73`) | probe: savepoint `sem_hora_so_hoje` — linha sem hora só em hoje, ontem com visita com hora ⇒ `visitas` e `base_hoje.visitas` null, `vendas` não | `or v_sem_hora_hoje > 0` apagado de `v_sem_cmp_hoje` | ✅ morto por asserção (a do S06) | `26a5b4b9` |
| 3 · S09 (`LAV-73`) | probe: savepoint `nunca_comecou` — sem a linha do contador (`started_at` é `not null`, então "nunca começou" é a ausência da linha), visitas com hora inseridas direto em anteontem, ontem e hoje ⇒ as visitas das comparações de Hoje e de Ontem null | (a) `v_inicio_dia is null` apagado de `v_sem_cmp_hoje`; (b) o mesmo em `v_sem_cmp_ontem` | ✅ os dois mortos por asserção | `ae4e2b57` |
| 4 · `LAV-62` | `inicioAoVivo.test.tsx`: tocar o cartão ⇒ `document.activeElement` é o `h1` "Loja ao vivo" (com `tabindex=-1`); Voltar ⇒ o foco no `h1` da Início (a saudação do `MovementHero`, dentro da faixa) | `h1` do `CabecalhoAoVivo` trocado por `<p role="heading" aria-level={1}>` | ✅ morto por asserção (`expected <body> to be <p role="heading">`) | `7aca7c74` |
| 5 · `LAV-52` | `spec.md` emendada: "a barra em `accent` com o rótulo 'hoje' em `ink`" | — | — | `e008e666` |

**Probe**: 76 `ok —` (eram 70), exit 0, `begin … rollback` contra o Postgres local (a migration da 83
aplicada pelo `\ir` do disco dentro da transação; nada fica no banco compartilhado).

**Gate** (um workspace por vez, exit fora de pipe, `--testTimeout=20000`): mobile-adm **2163/137**
exit 0 (+1 caso), store **6116/327** exit 0 (idêntico). Tipos do mobile-adm 0; lint do mobile-adm 0/0.
Core, backoffice, functions e catalog-import não foram tocados e não foram remedidos.

**A nota do S14** (o `revoke` de `authenticated` em `store_hour` cego no probe local, porque o
`pg_default_acl` local só concede `execute` a `PUBLIC`) fica como lição, não como lacuna: o mutante
morre pelo guarda de fonte.

**Próximo passo**: rodada 2 do Verificador.

---

# Rodada 2

**Data**: 2026-10-27
**Diff range**: `744da7ea..4777374f` (a feature inteira, com os 6 commits do conserto da rodada 1:
`7aca7c74`, `67ab635c`, `26a5b4b9`, `ae4e2b57`, `e008e666`, `4777374f`)
**Verificador**: sub-agente independente, novo (não é o autor da feature, nem o da rodada 1, nem o do
conserto). Releu a spec, o diff e os testes do zero; os mutantes desta rodada são novos, mais a
reinjeção dos cinco que a rodada 1 deixou vivos.

## Veredito: ❌ FAIL — por COBERTURA, nenhum defeito de produto

As cinco lacunas da rodada 1 estão **fechadas** (os cinco mutantes reinjetados morrem por asserção).
Mas o sensor desta rodada, com mutantes novos, achou **cinco sobreviventes não equivalentes no SQL**
— todos na comparação (`LAV-73`) e nas faixas (`LAV-71`) — e **dois de precisão de spec** no frescor
(`LAV-07`). Os cinco do SQL foram provados **não equivalentes** por uma sonda à parte que o código de
hoje passa e o mutante reprova: o código faz o certo, falta a régua.

## Gate (medido nesta rodada, um workspace por vez, exit fora de pipe)

`pnpm --filter @estrelinha/<ws> test --testTimeout=20000` (sem o `--`), logs em
`/private/tmp/claude-503/f83/v2/gate-*.log`. Medido ANTES do sensor, com a árvore limpa.

| Workspace | Arquivos | Testes | Exit | Rodada 1 | Delta |
| --- | --- | --- | --- | --- | --- |
| core | 182 | 4556 | 0 | 182 / 4556 | 0 |
| mobile-adm | 137 | 2163 | 0 | 137 / 2162 | +1 (o caso do foco, `LAV-62`) |
| store | 327 | 6116 | 0 | 327 / 6116 | 0 |
| backoffice | 226 | 3922 | 0 | 226 / 3922 | 0 |
| functions | 26 | 1105 | 0 | 26 / 1105 | 0 |
| **Total** | **898** | **17862** | | 898 / 17861 | +1 |

Contra a entrada (`baseline.md`, 881 / 17521): **+17 arquivos / +341 testes**, nenhuma queda.
Probe `probes/01-acessos.sql` contra o banco local: **exit 0, 76 `ok —`** (`v2/probe-base.log`).
`git status` limpo antes do gate, depois do gate e depois de cada mutante.

## As cinco lacunas da rodada 1 — conferidas

| Lacuna | Evidência | Mutante reinjetado nesta rodada | Resultado |
| --- | --- | --- | --- |
| S05 (`LAV-73`) | `probes/01-acessos.sql:226,231-234` (pedido `PROBE-83-A2` em `store_day_start(20/10)` exato) | `R1-S05` | ✅ morto por asserção |
| S06 (`LAV-73`) | `probes/01-acessos.sql:137-151` (savepoint `sem_hora_so_hoje`) | `R1-S06` | ✅ morto por asserção |
| S09 (`LAV-73`) | `probes/01-acessos.sql:264-281` (savepoint `nunca_comecou`) | `R1-S09a` (Hoje) e `R1-S09b` (Ontem) | ✅ os dois mortos por asserção |
| `LAV-62` foco | `apps/mobile-adm/src/pages/__tests__/inicioAoVivo.test.tsx:123-140` — `expect(document.activeElement).toBe(titulo)` e, ao voltar, `toBe(inicio)` | não reinjetado nesta rodada (o `h1` → `<p role="heading">` do conserto morreu por asserção, registrado acima) | ✅ caso existe, lido e conferido |
| `LAV-52` texto | `spec.md:211-213` emendado: barra em `accent`, rótulo "hoje" em `ink` | — | ✅ coerente com `SecaoAcessos.test.tsx` e `GraficoDosAcessos.tsx:51-63` |

## Checagem ancorada na spec

A tabela da rodada 1 (25 ACs, com `arquivo:linha`) continua valendo: nenhum arquivo de teste mudou
fora do conserto, e o conserto só acrescentou casos. Status por AC depois desta rodada:

| AC | Status | Por quê |
| --- | --- | --- |
| LAV-04..08, 50..55, 60..67, 70, 72, 74, 75 | ✅ | evidência da rodada 1; os mutantes novos desta rodada nessas ACs morreram todos (tabela abaixo) |
| LAV-07 | ⚠️ precisão de spec | "há {s} s" e "há {m} min" não dizem se o número é TRUNCADO ou ARREDONDADO; o código trunca (`Math.floor`) e os casos de `access.test.ts` (1,9 / 2 / 59 / 60 s) não distinguem — V-C03 e V-C04 sobrevivem |
| LAV-71 | ❌ lacuna | "as faixas que terminam antes de `contagem_desde` são `null`" — com a contagem que nunca começou, nenhuma termina antes de nada, e as faixas são `0`. O probe não confere as faixas no savepoint `nunca_comecou`: V-S18 sobrevive |
| LAV-73 | ❌ lacunas | V-S07 (o campo inteiro de anteontem trocado pelo de ontem), V-S04 (fronteira das vendas de `base_hoje`), V-S11 e V-S16 (a janela de anteontem lida só numa QUARTA-feira) sobrevivem |

## Sensor de discriminação — rodada 2

Arnês: `/private/tmp/claude-503/f83/v2/mutar.py` (o da rodada 1, com logs em `v2/`): alvo existindo
exatamente uma vez, um comando, restauração byte a byte e SHA-256 conferido (`sha=ok` em todas as
linhas de `v2/resultados.tsv`). `ASSERÇÃO` = falha de teste/probe; `COMPILAÇÃO` = erro de
transformação ou de sintaxe SQL. Mutante SQL que sobrevive ao probe roda também os guardas de fonte
da loja (`visitasPorHoraSchema`, `visitasSchema`); mutante de `core` que sobrevive à suíte de `core`
roda a suíte do app inteira.

### SQL — `supabase/migrations/20261029120000_83-loja-ao-vivo.sql`

| # | Mutação | Medido por | Resultado |
| --- | --- | --- | --- |
| R1-S05 | vendas de anteontem `paid_at < v_ini_ontem` → `<=` | probe | ✅ asserção |
| R1-S06 | `v_sem_cmp_hoje` sem `v_sem_hora_hoje > 0` | probe | ✅ asserção |
| R1-S09a | `v_sem_cmp_hoje` sem `v_inicio_dia is null` | probe | ✅ asserção |
| R1-S09b | `v_sem_cmp_ontem` sem `v_inicio_dia is null` | probe | ✅ asserção |
| V-S01 | `ontem_base` `first_hour < v_hora` → `<=` | probe | ✅ asserção |
| V-S02 | faixa `v.first_hour / 3` → `(v.first_hour + 1) / 3` | probe | ✅ asserção |
| V-S03 | "antes da contagem" pelo INÍCIO da faixa (`faixa * 3`) em vez do fim | probe | ✅ asserção |
| **V-S04** | vendas de `base_hoje` `paid_at < v_ini_hoje + h` → `<=` | probe **e** guardas | ❌ **SOBREVIVEU** |
| V-S04b | vendas de ontem na comparação `paid_at < least(…)` → `<=` (o par de V-S04) | probe | ✅ asserção (`PROBE-83-S2` às 15:00:00 de ontem) |
| V-S05 | `comparacao.hoje.vendas` sem o `null` com `h = 0` | probe | ✅ asserção |
| V-S06 | `por_dia` sem o último dia (`v_hoje - v_semana - 1`) | probe | ✅ asserção |
| **V-S07** | `comparacao.ontem.vendas` = `v_n_ontem` (o de ONTEM no lugar do de anteontem) | probe **e** guardas | ❌ **SOBREVIVEU** |
| V-S08 | `sem_hora_ontem` sempre 0 | probe | ✅ asserção |
| V-S09 | `v_sem_cmp_hoje` sem `v_sem_hora_ontem > 0` | probe | ✅ asserção |
| V-S10 | teto de `comparacao.ontem` só em ontem (sem anteontem) | probe | ✅ asserção |
| **V-S11** | CTE `v` de `v_desde` em vez de `least(v_desde, v_anteontem)` | probe **e** guardas | ❌ **SOBREVIVEU** |
| V-S12 | piso de `orders` de `v_desde` em vez de `least(…)` | probe: sobrevive; guarda (8) de `visitasPorHoraSchema`: ✅ asserção | ✅ morto pelo guarda |
| V-S13 | `first_hour` gravado de `now()` em vez de `p_agora` | probe | ✅ asserção |
| V-S14 | `faixa_atual` puxada pelo `max(first_hour)` de ONTEM | probe | ✅ asserção |
| V-S15 | Hoje sem o `null` antes da contagem | probe | ✅ asserção |
| **V-S16** | vendas de anteontem sem o piso `paid_at >= v_ini_anteontem` | probe **e** guardas | ❌ **SOBREVIVEU** |
| V-S17 | `ate_hora` = `v_hora + 1` | probe | ✅ asserção |
| **V-S18** | `antes` verdadeiro quando `v_inicio is null` (contagem que nunca começou ⇒ toda faixa `null`) | probe **e** guardas | ❌ **SOBREVIVEU** |
| V-G04 | `add column if not exists referrer text` junto da `first_hour` | guarda (1) | ✅ asserção |

### `packages/core` (live, stats, hook)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| V-C01 | `live/access.ts` | par de Hoje invertido (atual ↔ anterior) | ✅ asserção |
| V-C02 | `live/access.ts` | "hoje" da Semana = `m.ontem` | ✅ asserção |
| **V-C03** | `live/access.ts` | `Math.floor(s / 60)` → `Math.round` | ⚠️ **SOBREVIVEU** (core e app) — precisão de spec |
| **V-C04** | `live/access.ts` | `Math.floor(s)` → `Math.round` | ⚠️ **SOBREVIVEU** (core e app) — precisão de spec |
| V-C05 | `live/access.ts` | `noHourNote` sem `formatCount` | ✅ asserção |
| V-C06 | `live/access.ts` | `conversion` com `visitas >= 0` | ✅ asserção |
| V-C07 | `live/access.ts` | queda em tom `alta` (verde) | ✅ asserção |
| V-C08 | `stats/counterNotes.ts` | `countingSinceLine` `>` → `>=` | ✅ asserção |
| V-C09 | `stats/counterNotes.ts` | `cappedLine` `>` → `>=` | ✅ asserção |
| V-C10 | `live/access.ts` | faixa ausente vira `0` em vez de `null` | ✅ asserção |
| V-H01 | `hooks/useStoreMovement.ts` | `refetchOnWindowFocus: false` | ✅ asserção |

### App (`apps/mobile-adm/src`) e guardas

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| V-A01 | `SecaoAcessos.tsx` | seletor habilitado ao carregar | ✅ asserção |
| V-A02 | `SecaoAcessos.tsx` | variação sempre `ink-soft` (alta sem `done`) | ✅ asserção |
| V-A03 | `AoVivoPage.tsx` | `NAO_ATUALIZOU` sem exigir dado | ✅ asserção |
| V-A04 | `CabecalhoAoVivo.tsx` | Voltar sem `doApp` sem `replace` | ✅ asserção |
| V-A05 | `GraficoDosAcessos.tsx` | futura/sem contagem com número "0" | ✅ asserção |
| V-A06 | `model/barras.ts` | `max <= 0` → `max < 0` (NaN com tudo zero) | ✅ asserção |
| V-A07 | `CartaoVisitasHoje.tsx` | sem `gravarPeriodoDoInicio` | ✅ asserção |
| V-A08 | `InicioPage.tsx` | período da Início sempre Hoje | ✅ asserção |
| V-A09 | `tab-bar/model/tabs.ts` | barra de abas em `/ao-vivo` | ✅ asserção |
| V-A10 | `SecaoAcessos.tsx` | período falado = rótulo ("Semana") | ✅ asserção (34 falhas) |
| V-A11 | `AoVivoPage.tsx` | período inicial sempre Hoje | ✅ asserção |
| V-A12 | `CartaoVisitasHoje.tsx` | navega sempre com Hoje | ✅ asserção |
| V-A13 | `SecaoAcessos.tsx` | sem a nota de consentimento | ✅ asserção |
| V-A14 | `GraficoDosAcessos.tsx` | sem a nota "sem hora" | ✅ asserção |
| V-A15 | `MovementHero.tsx` | ignora o período controlado | ✅ asserção |
| V-A16 | `CartaoVisitasHoje.tsx` | em falha navega em vez de reler | ✅ asserção |
| V-G01 | `live/access.ts` | `!` em `CHART_UNAVAILABLE` | ✅ asserção (o caso de `LAV-55` cobra a frase inteira) |
| V-G02 | `GraficoDosAcessos.tsx` | `new Date().getHours()` | ✅ asserção (`aoVivoSemRelogioDoAparelho`) |
| V-G03 | `CartaoVisitasHoje.tsx` | segunda lista de períodos | ✅ asserção (`periodosComDonoUnico`) |
| V-G05 | `store/src/pages/PrivacyPolicyPage.tsx` | sem "(por exemplo, 14h)" | ✅ asserção (14 falhas) |
| V-G06 | `backoffice/.../labels.ts` | `cappedLine` como embrulho, não referência | ✅ asserção (`toBe`) |
| V-G07 | `SecaoAcessos.tsx` | `transition-opacity` sem par `motion-reduce:` | ✅ asserção (`tomDaLojaAoVivo`) |

**Resultado**: **58 mutantes** (4 reinjeções + 54 novos) · **51 mortos, todos por asserção** (0 por
compilação; V-S12 pelo guarda) · **7 sobreviventes**: 5 no SQL (lacunas de prova) e 2 de precisão de
spec (V-C03, V-C04).

### Os sobreviventes do SQL NÃO são equivalentes — sonda

`/private/tmp/claude-503/f83/v2/sonda-calendario.sql` (`begin … rollback`, aplica a migration do disco
pelo `_comum.sql`): passa no código de hoje (3 `ok —`, exit 0) e reprova cada mutante por asserção:

| Mutante | Asserção da sonda que o derruba |
| --- | --- |
| Z-S16 (= V-S16) | leitura numa **quinta** (22/10): anteontem = terça, com uma venda na segunda (início da semana) ⇒ `comparacao.ontem.vendas` = 1; o mutante conta 2 |
| Z-S07 (= V-S07) | a mesma: o mutante devolve as vendas de ONTEM (0) |
| Z-S11 (= V-S11) | leitura numa **segunda** (26/10): `v_desde` = domingo, anteontem = sábado com uma visita ⇒ `comparacao.ontem.visitas` = 1; o mutante devolve 0 (a variação de Ontem sumiria toda segunda e terça) |
| Z-S18 (= V-S18) | sem contador e sem visita ⇒ `ontem.por_faixa` = `[0,…,0]`; o mutante devolve 8 `null` (a loja recém-ligada desenharia "antes da contagem" no lugar de "0") |

V-S04 é de fronteira e dispensa sonda: o par do lado de ontem (V-S04b) morre por `PROBE-83-S2` às
15:00:00 exatas, e o lado de hoje só tem `PROBE-83-S4` às **15:01** — 15:00:00 de hoje não existe na
fixtura.

## Lacunas, ranqueadas

1. **V-S07 — `comparacao.ontem.vendas` pode trazer as vendas de ONTEM com o probe verde** (`LAV-73`).
   O conserto de S05 pôs a venda da fronteira em Ontem, e com isso Ontem e anteontem ficaram com **1
   venda cada** no savepoint `anteontem` (`01-acessos.sql:229-234`): trocar o campo inteiro passa. A
   variação de Vendas em Ontem seria sempre 0% (ou some), sem nada acusar. **Fix**: no savepoint
   `anteontem`, um segundo pedido em ontem (ex.: ter 12h) para Ontem = 2 vendas ≠ anteontem = 1, e a
   asserção nos dois valores (`L-013`).
2. **V-S16 e V-S11 — a janela de anteontem só é medida numa QUARTA-feira** (`LAV-73`). Na quarta,
   `least(v_desde, v_anteontem)` = anteontem = início da semana, e as duas reescritas que esquecem
   `least` ou o piso de anteontem dão o mesmo número. Na quinta a domingo as vendas de anteontem
   inflariam com as de segunda em diante (V-S16); na segunda e na terça as visitas de anteontem
   sumiriam e a variação de Ontem desapareceria (V-S11). **Fix**: levar ao probe as três leituras da
   sonda (quinta com venda na segunda; segunda com visita no sábado) — a sonda já está escrita.
3. **V-S04 — a fronteira das vendas de `base_hoje` não tem fixtura** (`LAV-73`). Ontem tem pedido às
   15:00:00 exatas; hoje, às 15:01. **Fix**: no savepoint `simetrica`, trocar (ou acrescentar) o pedido
   de hoje para `2026-10-21T18:00:00Z` (15:00:00 de Brasília) e manter `base_hoje.vendas` = 1.
4. **V-S18 — as faixas da contagem que nunca começou não são conferidas** (`LAV-71`). **Fix**: no
   savepoint `nunca_comecou` (ou num sem visita nenhuma), asserir `ontem.por_faixa` sem `null` e
   `soma + sem_hora = visitas` também ali.
5. **V-C03 / V-C04 — precisão de spec em `LAV-07`**: "há {s} s" e "há {m} min" não dizem truncar ou
   arredondar. **Fix**: emendar a spec ("segundos e minutos inteiros COMPLETOS: 2,9 s ⇒ 2 s; 119 s ⇒
   1 min") e um caso em `access.test.ts` com 2,9 s e 119 s (ou 90 s).

### Fix tasks propostas

| Fix | Onde | Done when |
| --- | --- | --- |
| F6 (V-S07) | `probes/01-acessos.sql`, savepoint `anteontem` | V-S07 reinjetado derruba o probe por asserção |
| F7 (V-S16, V-S11) | `probes/01-acessos.sql`, leituras de quinta e de segunda (molde: `v2/sonda-calendario.sql`) | V-S16 e V-S11 derrubam o probe |
| F8 (V-S04) | `probes/01-acessos.sql`, savepoint `simetrica` | V-S04 derruba o probe |
| F9 (V-S18) | `probes/01-acessos.sql`, savepoint `nunca_comecou` | V-S18 derruba o probe |
| F10 (V-C03/V-C04) | `spec.md` `LAV-07` + `packages/core/src/live/__tests__/access.test.ts` | V-C03 e V-C04 derrubam `access.test.ts` |

Nenhuma fix toca código de produto. Esta é a rodada 2 de 3 do laço de conserto.

## Qualidade de código (rodada 2)

O conserto da rodada 1 tocou só probe, um arquivo de teste, a spec e este relatório
(`git diff --stat a54fe79f..4777374f`) — cirúrgico, sem código de produto, sem asserção afrouxada.
Os 6 commits seguem o estilo do repositório. O resto da tabela de qualidade da rodada 1 continua.

## Rastreabilidade (proposta — a `spec.md` não foi editada por este verificador)

| Req | Status |
| --- | --- |
| LAV-04..06, 08, 50..55, 60..67, 70, 72, 74, 75 | ✅ Verified |
| LAV-62 | ✅ Verified (o foco tem caso desde o conserto) |
| LAV-07 | ⚠️ Verified com lacuna de precisão (truncar × arredondar) |
| LAV-71 | ❌ Needs Fix (prova: V-S18) |
| LAV-73 | ❌ Needs Fix (prova: V-S07, V-S16, V-S11, V-S04) |

## Resumo da rodada 2

**Geral**: ❌ não pronto — por cobertura. Nenhum defeito de produto.
**Rodada 1**: as 5 lacunas fechadas, os 5 mutantes reinjetados mortos por asserção.
**Sensor**: 58 mutantes, 51 mortos (todos por asserção), 5 sobreviventes de SQL provados não
equivalentes pela sonda, 2 de precisão de spec.
**Gate**: 17862 testes em 898 arquivos, 5 workspaces exit 0; probe 76 `ok —`.
**Próximo passo**: F6–F10 (probe, um caso em `access.test.ts` e uma emenda de texto); depois rodada 3.

## Conserto da rodada 2

As cinco lacunas da rodada 2 foram fechadas **só com prova** — nenhum código de produto mudou. Cada
mutante foi reinjetado no arquivo real pelo arnês (`/private/tmp/claude-503/f83/v3/mutar.py`, cópia do
da rodada 2: o alvo tem de existir uma vez, SHA-256 conferido na restauração) e morreu por asserção.

| Fix | Lacuna | O que entrou | Mutante reinjetado | Resultado | Commit |
| --- | --- | --- | --- | --- | --- |
| F6 | V-S07 | savepoint `anteontem`: 2ª venda em ontem (`PROBE-83-A3`, ter 12h) ⇒ Ontem 2 ≠ anteontem 1, e a asserção de que os dois discordam | `'vendas', v_n_anteontem` → `v_n_ontem` | ✅ asserção | `05f4b038` |
| F7 | V-S16, V-S11 | savepoints `calendario_quinta` (venda na segunda e na terça, lida na quinta 22/10) e `calendario_segunda` (visita no sábado e duas no domingo, lida na segunda 26/10), molde da sonda | piso `paid_at >= v_ini_anteontem` removido · CTE `v` de `v_desde` sem `least` | ✅ asserção (os dois) | `729aacc4` |
| F8 | V-S04 | savepoint `simetrica`: pedido de hoje às 15:00:00 exatas (`PROBE-83-S5`); `base_hoje.vendas` segue 1 e `periodos.hoje.vendas` passa a 3 (a fixtura ganhou um pedido; não é régua afrouxada) | `paid_at < v_ini_hoje + h` → `<=` | ✅ asserção | `3ec9a714` |
| F9 | V-S18 | savepoint `nunca_comecou`: `ontem.por_faixa = [0,0,0,1,0,0,0,0]`, `hoje.por_faixa` só com a futura `null`, e a invariante de ontem | `antes` verdadeiro com `v_inicio is null` | ✅ asserção | `98b36198` |
| F10 | V-C03, V-C04 | `LAV-07` emendada (segundos e minutos inteiros completos, truncados: 2,9 s ⇒ "2 s"; 90 s e 119 s ⇒ "1 min") e 4 casos em `access.test.ts` (2,9 · 59,9 · 90 · 119) | `Math.floor` → `Math.round` (segundos e minutos) | ✅ asserção (os dois) | `13165064` |

**Probe**: `01-acessos.sql` 76 → **84** `ok —`, exit 0 (`/private/tmp/claude-503/f83/v3/probe-F9.log`).

**Gate** (2026-10-27, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem `--`):
core **4560/182** (+4, os casos de F10), exit 0; store **6116/327** (idêntico), exit 0. Mobile-adm,
backoffice e functions não foram tocados e não foram remedidos (2163 · 3922 · 1105 na rodada 2).
`tsc` de `packages/core`: 11, os herdados.
