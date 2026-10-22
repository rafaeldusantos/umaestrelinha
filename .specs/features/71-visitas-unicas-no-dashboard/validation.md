# 71 · Visitas únicas no Dashboard — Validação

## Rodada 1 — 2026-10-22

- **Spec**: `.specs/features/71-visitas-unicas-no-dashboard/spec.md` (terceira escrita, 44 ACs)
- **Faixa do diff**: `9270c03a` (HEAD, o mesmo da `baseline.md`) .. árvore de trabalho, **sem commit**.
  33 arquivos rastreados alterados (+950/−148) e 48 arquivos novos de código (7.177 linhas, das quais
  1.753 de produção), mais os documentos de `.specs/`. Uma migration
  (`20261021120000_71-visitas-unicas.sql`), aplicada só no banco local.
- **Verificador**: sub-agente independente (autor ≠ verificador). Li `validate.md`, a spec, o
  design, o `tasks.md`, a `baseline.md` e o diff inteiro, e conferi cada AC contra o teste que a prova
  **antes** de ler as notas de fecho das tasks. Nenhum commit, stash ou push; banco só o local
  (54441/54442), nada com `--linked`, nada de `db reset`.

### Veredito: ❌ FAIL — por cobertura, e um defeito raro confirmado

Nenhuma suíte reprova, os gates batem com o fecho do autor ao número, e o comportamento do produto
está certo em quase todos os caminhos que este verificador mutou e mediu — inclusive nos três pontos
de SQL em que a suíte é cega: a fixtura `extra.sql` deste verificador passa no código atual e mata os
três sobreviventes de SQL (E10, E19, E20).

**A exceção é um defeito, raro e confirmado (G4)**: a recusa de cookies que chega enquanto a trava do
id espera deixa um código **novo** gravado no navegador — a sonda R01 acrescenta uma asserção ao caso
que já existia e ele reprova com `expected '0400ba17-…' to be null`. Nenhuma visita é gravada, mas o
Apêndice A promete à cliente que desligar Estatísticas "apaga o código do seu navegador".

O resto do FAIL vem de **afirmações da spec que nenhum teste ou probe discrimina**: 6 mutantes de
comportamento sobrevivem a toda a suíte (e, os de SQL, aos cinco probes), e cada um aponta uma AC
escrita como `SHALL`. O `validate.md` manda transformar sobrevivente em tarefa de conserto antes de
fechar.

```
## Validation: 71 · Visitas únicas no Dashboard — FAIL ❌

Spec-anchored check: 44 ACs conferidas; 37 provadas no valor da spec (2 com nota de precisão: VIS-10, VIS-12); 7 com lacuna (G1–G6: VIS-03, 19, 22, 24, 29, 38, 40)
Gate: 14287 passed, 0 failed (core 3507 · functions 952 · store 5672 · backoffice 3644 · catalog-import 512); tsc 0×4; lint 25/7 (−1); build verde
Sensor: 93 mutantes de comportamento (lote 1: 85 · lote 2: 8) — 87 mortos, 6 sobreviventes (S10, S19, S20, V09, V23, X01), 0 mortes por compilação; lote 3 (confirmações): sonda R01 confirma o defeito de G4; a fixtura extra.sql mata S10/S19/S20 (E10, E19, E20)
Report: .specs/features/71-visitas-unicas-no-dashboard/validation.md

Ranked gaps:
1. G1 · VIS-29 — `[functions.visit] verify_jwt = false` sem guarda (X01): invertido, todas as suítes passam — e, pelo comentário do próprio config.toml, o gateway passaria a exigir um JWT que a loja não manda — supabase/config.toml:573-574
2. G4 · VIS-24 — DEFEITO (raro): recusa durante a trava do id deixa um id NOVO gravado (sonda R01 reprova) — apps/store/src/app/VisitCounter.tsx:79-82
3. G2 · VIS-38/40 — started_at "uma vez" e last_recorded_at "a cada linha nova" sem prova (S19, S20) — supabase/migrations/20261021120000_71-visitas-unicas.sql:171-174
4. G3 · VIS-03/D5 — a fronteira EXATA de Ontem nas vendas sem fixtura (S10) — 20261021120000_71-visitas-unicas.sql:302,305
5. G5 · VIS-19 — fiação do VisitCounter sem armazenamento que grava (V09) — apps/store/src/app/VisitCounter.tsx:80
6. G6 · VIS-22 — "a loja espera store_settings" sem fixtura que discrimine (V23) — apps/store/src/app/VisitCounter.tsx:133
```

### Tarefas

| Tasks | Status | Notas |
| --- | --- | --- |
| 01–04 (core) | ✅ | `core/time` e `core/visits`, folhas alcançáveis pelo Deno |
| 05–07 (banco) | ✅ | migration + guarda + probes; a migration aplicada no banco local é idêntica ao arquivo (conferido) |
| 08–11 (fuso e function) | ✅ | `fusoComDonoUnico`, `_shared/rateLimit.ts`, `visit/handlers.ts` e `index.ts` |
| 12–14 (política e marcador) | ✅ | |
| 15–20 (loja) | ✅ | ver G4, G5 e G6 |
| 21–25 (painel: dados e bloco) | ✅ | |
| 26–28 (Dashboard e menu da conta) | ✅ | a 27 é **assunção pendente de confirmação do usuário** (`VIS-35`), isolada para poder ser revertida |
| 29 (prova em navegador) | ✅ | `prova-em-navegador.md` |
| 30–32 (documentos e baselines) | ✅ | os números de fecho batem com os medidos aqui |

Higiene de documento (não bloqueia): o cabeçalho do `tasks.md:28` ainda diz "Draft — aguarda
aprovação", e a tabela de rastreabilidade da `spec.md` (`:654-703`) segue "Pending" e "0 mapped" — o
`tasks.md:1078-1127` tem o mapeamento real (44 de 44).

### Gates (medidos por este verificador, com a árvore sem mutação)

Um workspace por vez, `--testTimeout=20000` **sem** o `--` nos dois apps, exit code fora de pipe.

| Medida | Entrada (`baseline.md`) | Medido agora | Delta | Exit |
| --- | --- | --- | --- | --- |
| core | 3414/133 | **3507/138** | +93/+5 | 0 |
| functions | 890/19 | **952/21** | +62/+2 | 0 |
| store | 5350/299 | **5672/311** | +322/+12 | 0 |
| backoffice | 3511/199 | **3644/206** | +133/+7 | 0 |
| catalog-import | 512/23 | **512/23** | 0 | 0 |
| **Total** | **13677/673** | **14287/699** | **+610/+26** | |
| `tsc` store · backoffice · `tsconfig.server.json` · catalog-import | 0 · 0 · 0 · — | **0 · 0 · 0 · 0** | — | 0 |
| Lint | 26/7 (backoffice 24/5 · store 2/2) | **25/7** (backoffice **23/5** · store 2/2) | −1 erro | 1 (esperado) |

- Os números batem **exatamente** com o fecho do autor (`tasks.md`, task 32). Nenhuma queda em
  workspace nenhum. Os arquivos com problema de lint são todos anteriores à feature (nenhum arquivo
  novo aparece); `useAdminStats.ts` continua com o `any` de `monthRevenue`, o de `revenueToday` saiu.
- `git diff --name-only -- packages/core/src/payment` e `git status --porcelain -- packages/core/src/payment`:
  **vazios**.
- `pnpm build`: exit 0 nos dois apps, gerando `apps/store/.server/page.mjs`. O build da loja veio do
  cache do turbo, então foi refeito sem cache (`pnpm --filter @estrelinha/store build`): exit 0.
- Depois do sensor, os 95 arquivos do diff têm o SHA-256 do início, e as nove funções do banco local
  continuam idênticas ao arquivo da migration (comparação refeita no fim).
- A migration **aplicada** no banco local é byte a byte a do arquivo: corpo (`md5(prosrc)`),
  `security definer`, volatilidade e ACL das nove funções conferidos numa transação desfeita.

### Probes no banco local (rodados por este verificador, todos em `begin … rollback`)

| Probe | Resultado | O que prova |
| --- | --- | --- |
| `dia.sql` | exit 0, 9 `ok` | VIS-03 (as três fixturas de fronteira, a segunda-feira, a inversa) |
| `visitas.sql` | exit 0, 17 `ok` | VIS-14, VIS-15 (2/1/**2** e 1/1/1), VIS-30 (poda e `p_agora` futuro) |
| `vendas.sql` | exit 0, 15 `ok` | VIS-31 (a)–(f), VIS-32, VIS-33 (>1.000, só escalares, `production_host`) |
| `teto.sql` | exit 0, 10 `ok` | VIS-27, VIS-44 |
| `papeis.sql` | exit 0, 32 `ok` | VIS-28, VIS-33 (`anon` e não-admin ⇒ 42501; `service_role` grava) |
| `concorrencia.sh` | exit 0 | VIS-14: duas sessões simultâneas ⇒ **1** linha, `gravada` + `repetida`, banco limpo |
| `extra.sql` (**deste verificador** — o texto está no apêndice) | exit 0, 5 `ok` | a fronteira EXATA de Ontem nas vendas e os dois instantes do contador — ver *Lacunas* |

Estado do banco local antes e depois de tudo: `store_visits` 0 linhas, `store_visit_counter` 0
linhas, nenhum pedido `PROBE-`/`VERIF-`, `orders_number_seq` em 183, o job `prune-store-visits`
presente. `function-visit.sh` (a function servida) **não** foi refeito por este verificador — o
autor o rodou na task 11 —; o caminho real do gateway está coberto em `prova-em-navegador.md`.

### Checagem ancorada na spec — as 44 ACs

| AC | Resultado definido pela spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| VIS-01 | `h2` "Movimento da loja"; abas Hoje · Ontem · Esta semana, Hoje selecionada; cards Visitas únicas · Vendas · Faturamento · Ticket médio; **primeira seção depois do `PageHeader`** | `StoreMovement.test.tsx:90` — `abas.map(textContent)` `toEqual(['Hoje','Ontem','Esta semana'])`, `aria-selected` `'true'` na primeira; `:102` — rótulos `toEqual([…4…])`; `AdminDashboard.test.tsx:126` — `filhos[1]` `toBe(secaoMovimento())` com o `h1` em `filhos[0]` (página real) | ✅ (B03 morto) |
| VIS-02 | sem nova chamada (RPC em 1); exatamente uma `aria-selected`; `tablist` "Período"; setas ←/→ | `StoreMovement.test.tsx:111` — `rpc` `toHaveBeenCalledTimes(1)` e `selecionadas` `toEqual(['Esta semana'])`; `:130` — `getByRole('tablist',{name:'Período'})`, `ArrowRight`/`ArrowLeft`; `AdminDashboard.test.tsx:190` — `rpc` e `from` sem chamada nova | ✅ |
| VIS-03 | intervalos meio-abertos por `store_day`; fixtures `02:59:59.900Z⇒20/10`, `03:00:00Z⇒21/10`, domingo 23h30 ⇒ 18/10 na semana de 12/10 | probe `dia.sql:12-25` (9 `ok`, rodado por mim); `visitasSchema.test.ts:362,393` (régua de `store_day`/`store_week_start`) | ⚠️ **lacuna** — a fronteira EXATA de Ontem nas vendas não tem fixture: S10 (`paid_at <= v_ini_hoje`) sobrevive à suíte e aos 5 probes |
| VIS-04 | uma RPC, sem data nem `p_agora`; o teste assere as chaves exatas do argumento | `useStoreMovement.test.ts:135` — `rpc.mock.calls[0]` `toEqual(['store_movement'])` e `toHaveLength(1)` | ✅ |
| VIS-05 | esqueleto ×4 + `aria-busy="true"`; nenhum `0`, `R$ 0,00` ou `—` com a resposta segurada | `StoreMovement.test.tsx:149` — `[data-skeleton="valor"]` `toHaveLength(4)`, texto `not.toMatch(/\d/)`, sem `R$` e sem `—`; `:168` — releitura segurada mantém os valores sem `aria-busy` | ✅ (B14, B17 mortos) |
| VIS-06 | **uma** mensagem exata, **um** botão "Tentar de novo" com 44px, nenhum valor; tocar relê | `StoreMovement.test.tsx:189` — `mensagens` `toHaveLength(1)`, botão `h-11` por token, grade ausente, `rpc` +1 depois do clique | ✅ (B01, B15 mortos) |
| VIS-07 | `1.234`; `formatPrice`; ticket do banco; sem venda: `0`, `R$ 0,00`, `—` + `sr-only` "sem vendas no período"; contador ativo sem visita: `0` | `labels.test.ts:82-122` (99,99 do banco, nunca 33,33; `visitas '0'`); `StoreMovement.test.tsx:230` — `—` `aria-hidden` e o `sr-only` | ✅ (B13 morto) |
| VIS-08 | `<button>` com `aria-label` e `aria-expanded`, 44px sem crescer o desenho; Popover (nunca Tooltip) por toque/clique/Enter/Espaço; Esc devolve o foco; texto **exato** em constante única | `labels.test.ts:240` — `VISIT_INFO_TEXT` `toBe(…texto inteiro…)`; `StoreMovement.test.tsx:311` (tag, `type`, `aria-expanded`, `h-11`/`w-11`), `:327` (diálogo com o texto inteiro, sem `tooltip`, Esc ⇒ foco no botão); toque, Enter, Espaço e toque fora: `prova-em-navegador.md:97-100` | ✅ |
| VIS-09 | quatro linhas montadas por corte de texto; fuso UTC com `hoje='2026-10-21'` diz 21/10 | `labels.test.ts:62-79` num `describe.each` de três fusos com sensor de troca (`:251`); `time/__tests__/format.test.ts:60-70` | ✅ (C04, B07 mortos) |
| VIS-10 | relê ao montar, no foco, em `expira_em` (duração do servidor, piso 1 s) e no aviso do canal; aba nunca relê; "Atualizado às HHhMM"; relógio adiantado 2 h ⇒ uma chamada; releitura falha mantém valores e hora | `useStoreMovement.test.ts:175` (chamada no instante, `data.hoje` vira `2026-10-22`), `:195` (adiantado 2 h ⇒ exatamente 1), `:219` (NaN não agenda), `:245` (piso), `:288` (foco); `AdminDashboard.test.tsx:158` (aviso ⇒ os dois números mudam na tela); `StoreMovement.test.tsx:212` (falha com dados mantém "Atualizado às 15h32") | ✅ (B04, B05, B06, B16, X20, X23, X24 mortos) — ⚠️ precisão: "a LINHA passa de Hoje, 21/10 a Hoje, 22/10" é provada por composição (dado do hook + `periodLine`), não no widget com relógio falso |
| VIS-11 | 2 colunas em 390; `R$ 99.999,99`/`9.999` sem quebrar; ≤2 linhas no rótulo; sem rolagem horizontal; 44px | proxies `StoreMovement.test.tsx:349,361` (token exato); medida `prova-em-navegador.md:86-95` (390 e 1440) | ✅ |
| VIS-12 | id de `randomUUID` gravado como `{v:1,id,ate,em}`; não deriva de dado pessoal nem do GA; **não vai em nenhuma outra requisição**; só o dono cita a chave | `visitor.test.ts:63` — `toEqual({v:1,id,ate:null,em:null})`; `:70` — `randomUUID` `toHaveBeenCalledTimes(1)`; guarda `visitanteComDonoUnico.test.ts:85` (V28 morto) | ⚠️ **precisão** — "não vai em nenhuma outra requisição" não tem asserção: nada impede um segundo consumidor de `ensureVisitorId`/`readMarker` (hoje só o `VisitCounter` e o `send.ts` o tocam — verdade por leitura, não por teste) |
| VIS-13 | `POST` com corpo **exatamente** `{"id"}`; só a chave publicável; com sessão ativa, `Authorization` não é o token | `send.test.ts:68` — `Object.keys(corpo)` `toEqual(['id'])`; `:76` — `headers.has('authorization')` `false`, nenhum cabeçalho com o token; `:88` — `invoke` não chamado | ✅ (V17, V18 mortos) |
| VIS-14 | `on conflict do nothing`: N chamadas, inclusive simultâneas, deixam 1 linha e respondem 200; resposta `{dia, ate, agora}` inteiros, do banco | `handlers.test.ts:423` (chaves `['p_id']`), `:432` (JSON inteiro repassado); probe `visitas.sql:17-36`; `concorrencia.sh` **rodado por mim**: 1 linha, `gravada` + `repetida`, banco limpo | ✅ (F08, S22 mortos) |
| VIS-15 | `count(distinct)` por período; seg/ter/qua ⇒ 2/1/**2**; dom/seg ⇒ 1/1/1 | probe `visitas.sql:38-41,54-57` (rodado por mim); `visitasSchema.test.ts:637` | ✅ (S01, S02, S11 mortos) |
| VIS-16 | `ate = Date.now() + (ate − agora)`; não chama em `em ≤ agora < ate`; chama em `agora ≥ ate` ou `agora < em`; adiantado 2 h + 5 navegações ⇒ ≤1 chamada; resposta sem relógio = falha | `marker.test.ts:105-118`, `:122` (duração), `:132` (adiantado 2 h ⇒ `chamadas` `toBe(1)`); `VisitCounter.test.tsx:217,229`; `send.test.ts:116` | ✅ (V10, V11, X03, X04 mortos) |
| VIS-17 | no `App.tsx`, fora das `Routes`, fora da prévia; `requestIdleCallback` → `setTimeout` direto com `readyState==='complete'` → depois do `load`; nenhum `fetch` síncrono | `VisitCounter.test.tsx:177` (zero `fetch` antes do agendador), `:187` (`complete` ⇒ chama na troca de rota), `:202` (espera o `load`); `contadorMontado.test.tsx:56` | ✅ (V06, V12, V13, V24 mortos) |
| VIS-18 | 400/5xx/rede ⇒ sem marcador, **no máximo mais uma** tentativa na próxima navegação; 429 ⇒ grava o prazo | `VisitCounter.test.tsx:256` (429), `:266` (`it.each` de 5 falhas: 1 → 2 → 2 chamadas), `:285`, `:293` | ✅ (V01, V19, V20 mortos) |
| VIS-19 | armazenamento que lança (leitura ou escrita) ou sem `randomUUID` ⇒ não registra e não guarda id em memória | `visitor.test.ts:110-152` (unidade de `ensureVisitorId`) | ⚠️ **lacuna de fiação** — V09 (o `VisitCounter` chama mesmo com `id` nulo) sobrevive: nenhum caso do componente monta armazenamento que não grava. Hoje o servidor recusaria o corpo (`400`), então o efeito é tráfego, não contagem |
| VIS-20 | criação dentro de `navigator.locks.request('estrelinha-visitor')`, relendo a chave dentro da trava | `visitor.test.ts:156` (nome da trava), `:167` (a outra aba grava ⇒ usa ESSE id, `randomUUID` 0 vezes), `:182`; duas abas reais: `prova-em-navegador.md:75` | ✅ (V14 morto) |
| VIS-21 | JSON inválido, id não v4 (sem diferenciar maiúsculas), qualquer chave além de `id` ⇒ `400`, nada gravado | `handlers.test.ts:260-296` (15 corpos hostis: `supabase.rpcs` `toEqual([])`, `400`, log `inválido`; maiúsculas aceitas) | ✅ (F04, C02 mortos) |
| VIS-22 | não chama: não-produção, prévia, configuração carregando (espera), host interno, recusa, marca, `webdriver`, robô; **não lê** `enabled`/`measurement_id`/`canMeasure`; GA4 desligado ⇒ chama; `localhost` com host de produção ⇒ não chama | `refusal.test.ts:34-79`; `VisitCounter.test.tsx:304` (GA4 desligado ⇒ chama), `:311` (localhost ⇒ nada, nenhum id), `:320` (carregando ⇒ espera), `:331,338,350,359,366`; guarda `contadorSemGa.test.ts` | ⚠️ **lacuna de fiação** — V23 (a fiação não espera a configuração) **sobrevive**: o host padrão (`umaestrelinha.com.br`) já recusa em `localhost`, então "esperar" e "não esperar" dão o mesmo resultado na fixture (G6). O resto da AC está provado (V03b, V06b, V07, V08, V08b, V22 mortos) |
| VIS-23 | servidor: robô ⇒ `200 robô`; sem `Origin` ou host interno ⇒ `200 interno`, sem gravar; `production_host` lido pela function; lista de 20 em `core`, com fixture cada, 5 inversos | `handlers.test.ts:335-415`; `bots.test.ts:72-109` | ✅ (F01, F02, F03, C01 mortos) |
| VIS-24 | `save(false)` apaga o `id` mantendo `ate`/`em`, na mesma ação; nenhuma chamada depois; resposta tardia não traz o id de volta | `cookieConsentStore.test.ts:157`; `VisitCounter.test.tsx:376,388,404` (store real) | ❌ **defeito raro** — a sonda R01 reprova: a recusa que chega enquanto a trava do id espera deixa um id NOVO no marcador (G4). A metade "nenhuma chamada depois" está provada (V02, V03a, V03b, X02 mortos) |
| VIS-25 | a decisão relê a escolha no instante da chamada; aplica só registro válido; recusa em memória nunca desfeita | `cookieConsentStore.test.ts:180-258`; `VisitCounter.test.tsx:437,448,456` | ✅ (V04, V05, X19 mortos) |
| VIS-26 | Estatísticas sempre na folha; "Salvar escolhas" grava o interruptor; caso de `AVS-02` invertido; frase do Apêndice A | `CookieNotice.test.tsx:235` (invertido), `:254` (grava `statistics: false` com o GA4 desligado), `:175` (frase nova, sem "anônim") | ✅ (V25 morto) |
| VIS-27 | 30/min por IP ⇒ `429 {dia, ate, agora}` sem gravar; sem IP libera; `429` sem relógio continua `limite`; `toBe` no reexport; teto de 5.000 ⇒ `200 teto` | `handlers.test.ts:165-253`; `rateLimit.test.ts:85`; probe `teto.sql` (rodado por mim) | ✅ (F05, F09, F10, S13 mortos) |
| VIS-28 | RLS, `revoke all` dos três, nenhuma policy; só `service_role` executa a gravação; colunas exatas; `anon` e `authenticated` não-admin ⇒ `42501` | `visitasSchema.test.ts:226-306,461-509`; probe `papeis.sql` (32 `ok`, rodado por mim) | ✅ (S15, S17 mortos) |
| VIS-29 | uma linha de log por resposta (menos `OPTIONS`), um dos 8 desfechos, sem id/IP/UA; não lê `Authorization`; `405 inválido`; `handlers.ts` + `_shared/http.ts`; **`verify_jwt = false` no `config.toml`** | `handlers.test.ts:125-132` (`conferirLog` em todo caso), `:139,150` (OPTIONS e 405), `:471` (o proxy que lança) | ✅ para o handler (F06, F07 mortos) — ⚠️ **lacuna**: X01 (`[functions.visit] verify_jwt = true`) sobrevive às suítes de functions e da loja (G1) |
| VIS-30 | a gravação apaga `day < store_day(p_agora) − 7` na mesma transação; os 8 dias ficam | probe `visitas.sql:64-92` (rodado por mim); `visitasSchema.test.ts:440-449`; job `prune-store-visits` presente em `cron.job` local (conferido) | ✅ (S12 morto) |
| VIS-31 | lista positiva por `paid_at` no dia de Brasília; fixtures (a)–(f) | probe `vendas.sql:26-53` (15 `ok`, rodado por mim) | ✅ (S04, S07, S07b mortos) |
| VIS-32 | soma em `numeric`, `round(…, 2)` no banco: 33,33; 10,01; sem venda ⇒ ticket `NULL` | probe `vendas.sql:59-89` | ✅ (S08, S08b mortos — S08b só pelo probe) |
| VIS-33 | só escalares; dias como texto; `expira_em`/`lido_em`; `production_host`; `contagem_desde(_dia)`, `ultima_visita(_dia)`, `teto_dia`; faturamento `0` sem venda; `definer` + `has_role` no corpo; `execute` só a `authenticated`; >1.000 ⇒ exato | probe `vendas.sql:95-131`, `papeis.sql`; `visitasSchema.test.ts:577-625,736-742`; tipo × saída real `useStoreMovement.test.ts:322` | ✅ (S16, S18 mortos) |
| VIS-34 | o literal do fuso UMA vez em `store_time_zone()`; formas proibidas recusadas; o literal do SQL comparado ao dono em TS; quatro escritas TS importam o dono, sem allowlist | `visitasSchema.test.ts:340-402`; `fusoComDonoUnico.test.ts` | ✅ (S03, S05, S06, V27 mortos) |
| VIS-35 *(assunção pendente)* | "Pedidos Hoje" e "Fat. Hoje" ausentes; os quatro em `grid-cols-2 lg:grid-cols-4`; sem campo morto | `AdminDashboard.test.tsx:222-246`; `useAdminStats.test.ts:50-92` | ✅ (B02 morto) |
| VIS-36 | quatro parágrafos, os três antigos intactos, o do Apêndice A palavra por palavra | `PrivacyPolicyPage.test.tsx:299-320` | ✅ (V26 morto) |
| VIS-37 | o contador não existe sem o parágrafo | `politicaDoContador.test.ts:50-75` | ✅ (V26 morto) |
| VIS-38 | "Contando desde DD/MM às HHhMM" quando o período começa antes de `contagem_desde`; fixture 21/10 15h32 ⇒ Ontem e Semana sim, Hoje não | `labels.test.ts:135-158`; `StoreMovement.test.tsx:283` | ✅ na tela (B08 morto) — ⚠️ **lacuna no dado**: S19 (`started_at` recalculado a cada gravação) sobrevive à suíte e aos probes |
| VIS-39 | contador nunca usado ⇒ `—` (nunca `0`) e um dos dois textos, pelo host do BANCO | `labels.test.ts:118,160-185`; `StoreMovement.test.tsx:249` | ✅ (B09, B12 mortos) |
| VIS-40 | "Última visita registrada: hoje/ontem/em DD/MM às HHhMM", comparando com o `hoje` do banco | `labels.test.ts:187-207` (três fusos) | ✅ na tela (B10 morto) — ⚠️ **lacuna no dado**: S20 (`last_recorded_at` congelado) sobrevive |
| VIS-41 | nenhum literal do bloco diz "pessoas" ou "usuários" | `semPessoas.test.ts:43-66` | ✅ (B22 morto) |
| VIS-44 | o teto do dia no período aberto ⇒ a frase; aparece em Hoje e Semana, some em Ontem | `labels.test.ts:209-238`; `StoreMovement.test.tsx:267`; probe `teto.sql` | ✅ (B11, S18, S21 mortos) |
| VIS-42 | `=1` grava a marca, apaga o id, tira o parâmetro por `replace` preservando os outros, avisa; `=0` desfaz; com a marca, nenhuma chamada; dono único em `core` | `VisitCounter.test.tsx:483,502,513`; `optOut.test.ts`; guarda `parametroNaoContarComDonoUnico.test.ts` | ✅ (V15, V16, V22, C03 mortos) |
| VIS-43 | "Abrir a loja sem contar" com `optOutHref(storeOrigin(), true)`, nova aba, some sem `VITE_STORE_URL` | `AccountMenu.test.tsx:150-182` | ✅ |

### Sensor de discriminação

**Método.** Arnês próprio (`scratchpad/sensor/sensor.mjs`, fora do repositório): para cada mutante,
lê os bytes do arquivo REAL e o SHA-256, exige que cada alvo apareça **exatamente uma vez** (ou
`todas`) e **lança** se não achar — os alvos das 97 execuções (93 mutantes e 4 confirmações) foram
validados antes de qualquer escrita —, aplica a troca, roda a suíte com o repórter JSON do vitest e
classifica a morte: **asserção** (o teste rodou o código e a expectativa falhou; as consultas do
Testing Library que não acham o texto aparecem à parte), **erro em teste** (exceção do código sob
teste — só F07, o dublê que lança de propósito ao ler `Authorization`, marcado na tabela como "arame
do dublê"), **compilação/carga** (o arquivo de teste nem carregou — nenhum caso). Restaura os bytes
e confere o SHA-256 a cada mutante; ao fim, os 95 arquivos do diff têm o SHA do início. Nada de
`git stash`. A numeração tem buracos (S09, S14, V21, B18, B20, B21): ids descartados no rascunho,
antes da primeira execução — todo mutante que rodou está na tabela.

- **Mutantes de SQL** rodam o automatizado — as seis suítes da loja que leem `supabase/migrations` —
  **e** os cinco probes transacionais (o `_comum.sql` aplica o arquivo mutado do zero dentro da
  transação). A tabela mostra os dois lados, porque **os probes não rodam no CI**: um mutante morto só
  por probe é um mutante que só a disciplina de rodar o probe mata.
- **Mutantes de TypeScript** rodam a suíte INTEIRA do workspace dono; sobrevivendo, as vizinhas que
  poderiam pegá-lo (a da loja carrega os guardas que varrem os dois apps).
- "**Incidental**" = a suíte reprovou só porque um `mutar()` de um sensor do guarda perdeu o alvo
  (o sensor muta o texto real e lança quando ele muda) — a **régua** aprovava o mutante.

| # | Req. | Mutação (comportamento) | Arquivo | Suíte automatizada | Probes no banco local |
| --- | --- | --- | --- | --- | --- |
| S01 | VIS-15 | semana somando dias: count(visitor_id) no lugar de count(distinct) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — visitas por `count(distinct)` em cada período (VI…) | **morto** — `visitas`: seg/ter/qua: Esta semana = 2, e NÃO 4 |
| S02 | VIS-15 | semana somando dias, com o texto que o guarda procura intacto (recálculo depois do select) | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | **morto** — `visitas`: seg/ter/qua: Esta semana = 2, e NÃO 4 |
| S03 | VIS-03/34 | fronteira de dia em UTC: store_day por UTC | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 2. o fuso — UM literal, dentro de `store_time_zone`, igual ao dono em…) | **morto** — `dia`: 2026-10-21T02:59:59.900Z ⇒ 20/10 |
| S04 | VIS-31/34 | fronteira de dia em UTC só nas vendas: v_ini_hoje = v_hoje::timestamptz (fuso da sessão) | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | **morto** — `vendas`: (a) pago às 00h10 de 21/10 conta em Hoje, e só ele |
| S05 | VIS-03 | semana começando no domingo (dow) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 2. formas proibidas de decidir o dia (VIS-34) `store_week_start` trun…) | **morto** — `dia`: o domingo 18/10 está na semana iniciada em 12/10 |
| S06 | VIS-03 | semana começando no domingo, com o prefixo que o guarda procura intacto | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | **morto** — `dia`: o domingo 18/10 está na semana iniciada em 12/10 |
| S07 | VIS-31 | vendas contando pedido NÃO pago: sem recorte de pagamento, por created_at | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (5 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) ven…) | **morto** — `vendas`: (a) pago às 00h10 de 21/10 conta em Hoje, e só ele |
| S07b | VIS-31 | vendas contando estorno, com o texto `payment_status = 'approved'` intacto | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | **morto** — `vendas`: (f) 23h59:59.900 de 20/10 conta em Ontem; (b) (c) (d) (e) não contam |
| S08 | VIS-32 | ticket dividindo por zero (sem o case) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) o t…) | **morto** — `dia`: division by zero |
| S08b | VIS-32 | ticket de Hoje dividindo a soma da semana (o padrão do guarda casa qualquer v_f_/v_n_) | `migrations/20261021120000_71-visitas-unicas.sql` | incidental (sensor do guarda perdeu o alvo: `o ticket sem o `round` reprova`) | **morto** — `vendas`: 3 vendas que somam R$ 100,00 ⇒ ticket 33,33 |
| S10 | VIS-03/31 | Ontem fechado à direita: paid_at <= 00:00 de hoje (o pedido da meia-noite conta em Hoje E Ontem) | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S11 | VIS-15 | v_desde = segunda-feira (numa segunda, Ontem perde o domingo) | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | **morto** — `visitas`: dom/seg: Ontem = 1 |
| S12 | VIS-30 | poda de 7 em vez de 8 dias (day < p_dia - 6) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 3. prune_store_visits apaga `day < p_dia - 7` (hoje e os 7 anteriores…) | **morto** — `visitas`: poda: os 8 dias (14/10 a 21/10) continuam lá |
| S13 | VIS-27 | teto diário off-by-one (> 5000) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o teto é 5.000 linhas no dia…) | **morto** — `teto`: a 5.001ª ⇒ desfecho `teto` |
| S15 | VIS-28 | record_store_visit sem grant ao service_role | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — definer, só o service_role `grant execute … t…) | **morto** — `papeis`: permission denied for function record_store_visit |
| S16 | VIS-33 | store_movement sem o portão has_role(admin) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (4 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — só admin, pela RPC `has_role(auth.uid(), 'admin')…) | **morto** — `papeis`: authenticated recusado (42501): select public.store_movement() |
| S17 | VIS-28 | store_visits sem o revoke all (anon leria zero linhas, não 42501) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 1. store_visits — RLS, revoke e nenhuma policy `revoke all` de public…) | **morto** — `papeis`: anon recusado (42501): select * from public.store_visits |
| S18 | VIS-44 | teto_dia sempre devolvido (fora do período aberto também) | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) `teto…) | **morto** — `teto`: lido em 28/10 ⇒ teto_dia null (fora do período aberto) |
| S19 | VIS-38 | started_at recalculado a cada gravação ("contando desde" anda sozinho) | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S20 | VIS-40 | last_recorded_at congelado ("última visita" nunca avança) | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S21 | VIS-44 | o teto não anota capped_day | `migrations/20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o teto anota o dia em `cappe…) | **morto** — `teto`: `capped_day` = 21/10 em store_visit_counter |
| S22 | VIS-14 | a visita repetida responde 'gravada' | `migrations/20261021120000_71-visitas-unicas.sql` | vivo (store: 406 casos) | **morto** — `visitas`: A de novo na segunda ⇒ repetida |
| F01 | VIS-23 | robô gravando (portão 4 desligado) | `visit/handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar user agent HeadlessChrome ⇒ …) | — |
| F02 | VIS-23 | host interno contando no servidor (só a ausência de Origin recusa) | `visit/handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar origem de homologação https:…) | — |
| F03 | VIS-23 | sem Origin contando no servidor | `visit/handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar sem `Origin` ⇒ `interno`) | — |
| F04 | VIS-21 | id inválido / chave extra gravando (só JSON ilegível recusa) | `visit/handlers.ts` | **morto — asserção** (10 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado sem `id`) | — |
| F05 | VIS-27 | sem IP vira balde único ('sem-ip') | `visit/handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP SEM IP, a 31ª chamada ⇒ 200 —…) | — |
| F06 | VIS-29 | o log da gravação leva o id | `visit/handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado UUID v4 em MAIÚ…) | — |
| F07 | VIS-29 | o handler lê Authorization | `visit/handlers.ts` | **morto — arame do dublê** (50 casos; ex.: `handlers.test.ts` — VIS-29 — preflight e método GET ⇒ 405, log `inválido`, nenhuma RPC) | — |
| F08 | VIS-14 | o handler manda p_agora (o servidor de borda decide o dia) | `visit/handlers.ts` | **morto — asserção** (2 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado UUID v4 em MAIÚ…) | — |
| F09 | VIS-27/16 | o 429 do cache devolve o `agora` velho do cache | `visit/handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP a 31ª chamada do mesmo IP no …) | — |
| F10 | VIS-27 | teto por IP off-by-one (31 por minuto) | `_shared/rateLimit.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP a 31ª chamada do mesmo IP no …) | — |
| C01 | VIS-23 | robô por prefixo (startsWith) em vez de substring | `visits/bots.ts` | **morto — asserção** (16 casos; ex.: `bots.test.ts` — isBotUserAgent Googlebot é robô) | — |
| C02 | VIS-21 | uma chave extra no corpo aceita | `visits/visitor.ts` | **morto — asserção** (5 casos; ex.: `visitor.test.ts` — visitBodyRefusal — o que o servidor recusa chave extra `force` ⇒ `cha…) | — |
| C03 | VIS-42/43 | o link liga quando devia desligar | `visits/optOut.ts` | **morto — asserção** (3 casos; ex.: `optOut.test.ts` — optOutHref — o link que o painel abre ligar ⇒ `/?nao-contar=1` na ori…) | — |
| C04 | VIS-09 | o dia escrito por new Date (meia-noite UTC vira o dia anterior) | `time/format.ts` | **morto — asserção** (2 casos; ex.: `format.test.ts` — no fuso de processo America/Sao_Paulo formatDayMonth escreve DD/MM po…) | — |
| V01 | VIS-18 | marcador gravado ANTES do sucesso (falha não tenta de novo) | `app/VisitCounter.tsx` | **morto — asserção** (6 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 500 ⇒ sem prazo; UMA tentativa a mais na próxima nav…) | — |
| V03a | VIS-24/22 | a recusa de cookies não para o contador (statistics fixo em true na fiação) | `app/VisitCounter.tsx` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama Estatísticas recusada ⇒ nenhuma chamada, e …) | — |
| V04 | VIS-25 | a recusa feita em outra aba é ignorada (sem syncFromStorage) | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-25 — a recusa feita em outra aba aba A com statistics em memória,…) | — |
| V08b | VIS-22 | webdriver ignorado na fiação | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama navigator.webdriver ⇒ nenhuma chamada) | — |
| V09 | VIS-19 | sem id (armazenamento que não grava), chama assim mesmo | `app/VisitCounter.tsx` | vivo (store: 5672 casos) | — |
| V12 | VIS-17 | tentativa síncrona na montagem (fora do agendador) | `app/VisitCounter.tsx` | **morto — asserção** (8 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico nenhum fetch antes de o agendador di…) | — |
| V13 | VIS-17 | sem requestIdleCallback, a troca de rota espera um load que não vem | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico sem requestIdleCallback e com o docu…) | — |
| V15 | VIS-42 | ?nao-contar sai do endereço com entrada nova no histórico (push) | `app/VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL =1: grava a marca, apaga…) | — |
| V16 | VIS-42 | ?nao-contar=1 não apaga o id | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL =1: grava a marca, apaga…) | — |
| V19 | VIS-18 | duas tentativas a mais em vez de uma | `app/VisitCounter.tsx` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 500 ⇒ sem prazo; UMA tentativa a mais na próxima nav…) | — |
| V20 | VIS-18/16 | 429 com relógio tratado como falha | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 429 com relógio ⇒ grava o prazo e não tenta mais no …) | — |
| V22 | VIS-42/22 | a marca de não contar ignorada na fiação | `app/VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama a marca de não contar ⇒ nenhuma chamada) | — |
| V23 | VIS-22 | não espera store_settings (settingsLoaded sempre true na fiação) | `app/VisitCounter.tsx` | vivo (store: 5672 casos) | — |
| V24 | VIS-22/17 | a chegada da configuração não reagenda (deps só pathname) | `app/VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico sem requestIdleCallback e com o docu…) | — |
| V28 | VIS-12 | a chave do visitante escrita fora do dono | `app/VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `visitanteComDonoUnico.test.ts` — VIS-12 — as chaves do contador têm um dono só só o dono cita as chaves) | — |
| V03b | VIS-22/24 | a decisão pura ignora a recusa de Estatísticas | `visits/refusal.ts` | **morto — asserção** (6 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama Estatísticas recusada ⇒ nenhuma chamada, e …) | — |
| V06b | VIS-22 | a decisão pura conta na prévia | `visits/refusal.ts` | **morto — asserção** (1 caso; ex.: `refusal.test.ts` — VIS-22 — a decisão de contar janela de prévia do painel ⇒ não conta) | — |
| V07 | VIS-22 | a decisão pura conta em host interno | `visits/refusal.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama host de produção configurado e a loja em lo…) | — |
| V08 | VIS-22 | a decisão pura ignora webdriver | `visits/refusal.ts` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama navigator.webdriver ⇒ nenhuma chamada) | — |
| V10 | VIS-16 | o prazo guardado é o do relógio do SERVIDOR (sem converter por duração) | `visits/visitor.ts` | **morto — asserção** (2 casos; ex.: `marker.test.ts` — saveClock — o prazo no relógio LOCAL, por duração grava `ate = Date.n…) | — |
| V11 | VIS-16 | relógio que voltou não chama de novo | `visits/visitor.ts` | **morto — asserção** (1 caso; ex.: `marker.test.ts` — markerAllowsCall — VIS-16 `agora < em` (o relógio voltou) ⇒ chama) | — |
| V14 | VIS-20 | dentro da trava, cria sem reler a chave | `visits/visitor.ts` | **morto — asserção** (1 caso; ex.: `visitor.test.ts` — VIS-20 — a trava `navigator.locks`, com releitura DENTRO dela outra a…) | — |
| V02 | VIS-24 | a recusa de cookies não apaga o id | `model/cookieConsentStore.ts` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-24 — a recusa com a store REAL save(false) + navegar (já no dia s…) | — |
| V05 | VIS-25 | a releitura aplica armazenamento ausente (volta a "aceito") | `model/cookieConsentStore.ts` | **morto — asserção** (3 casos; ex.: `cookieConsentStore.test.ts` — VIS-25 — syncFromStorage relê a escolha feita em outra aba armazename…) | — |
| V17 | VIS-13 | o corpo leva uma chave a mais | `visits/send.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo 5 navegações ⇒ 1 chamada; o marcador g…) | — |
| V18 | VIS-13 | o envio leva os cookies (credentials include) | `visits/send.ts` | **morto — asserção** (1 caso; ex.: `send.test.ts` — VIS-13 — o pedido sem cookies (credentials omit) e sem keepalive) | — |
| V06 | VIS-22 | o contador montado também na prévia | `app/App.tsx` | **morto — asserção** (2 casos; ex.: `contadorMontado.test.tsx` — VIS-17 — o contador está montado no App âncora: o App foi lido e a fo…) | — |
| V25 | VIS-26 | "Salvar escolhas" ignora o interruptor de Estatísticas | `ui/CookiePreferencesSheet.tsx` | **morto — asserção** (2 casos; ex.: `CookieNotice.test.tsx` — a folha "Preferências de cookies" (AVS-04) medição DESLIGADA: "Salvar…) | — |
| V26 | VIS-36/37 | a política diz 90 dias | `pages/PrivacyPolicyPage.tsx` | **morto — asserção** (5 casos; ex.: `PrivacyPolicyPage.test.tsx` — PrivacyPolicyPage — a medição de audiência (PRV-01) tem exatamente qu…) | — |
| V27 | VIS-34 | o fuso escrito à mão fora do dono | `lib/orderMeta.ts` | **morto — asserção** (3 casos; ex.: `fusoComDonoUnico.test.ts` — VIS-34 — o fuso da loja tem um dono só em TypeScript só o dono escrev…) | — |
| B01 | VIS-06 | erro de leitura vira ZERO (o painel mostra 0 em vez do erro) | `api/useStoreMovement.ts` | **morto — asserção** (3 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) o `{ error }` do supaba…) | — |
| B02 | VIS-35 | o card "Pedidos Hoje" de volta | `admin/AdminDashboard.tsx` | **morto — asserção** (2 casos; ex.: `AdminDashboard.test.tsx` — VIS-35 — saem "Pedidos Hoje" e "Fat. Hoje" o Dashboard renderizado nã…) | — |
| B03 | VIS-01 | o Dashboard não monta o bloco | `admin/AdminDashboard.tsx` | **morto — asserção (consulta do Testing Library)** (9 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` a raiz da …) | — |
| B04 | VIS-10d | o canal depende do callback (recria a cada render) | `api/useOrdersRealtime.ts` | **morto — asserção** (4 casos; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras o Dashboard montado…) | — |
| B05 | VIS-10c | a virada medida pelo relógio da dona (expira_em − Date.now()) | `api/useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c…) | — |
| B06 | VIS-10c | a virada sem o piso de 1 s | `api/useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c…) | — |
| B19 | VIS-06 | três novas tentativas em vez de uma | `api/useStoreMovement.ts` | **morto — asserção** (3 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) o `{ error }` do supaba…) | — |
| B07 | VIS-09 | a linha de Hoje escrita por new Date (dia anterior em fuso negativo) | `model/labels.ts` | **morto — asserção (consulta do Testing Library)** (27 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` a raiz da …) | — |
| B08 | VIS-38 | "Contando desde" some no dia da contagem (>=) | `model/labels.ts` | **morto — asserção** (4 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-38 — "Contando desde", quando o período c…) | — |
| B09 | VIS-39 | o host do texto escrito à mão (não o do banco) | `model/labels.ts` | **morto — asserção** (6 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-39 — o contador sem nenhuma visita regist…) | — |
| B10 | VIS-40 | "hoje" comparado com o relógio do navegador | `model/labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-40 — a última visita, comparada com o `ho…) | — |
| B11 | VIS-44 | o teto aparece em toda aba | `model/labels.ts` | **morto — asserção** (10 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-44 — o teto do dia, só nos períodos que c…) | — |
| B12 | VIS-39 | contador nunca usado mostra 0 | `model/labels.ts` | **morto — asserção** (4 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-07 — os valores VIS-39: contador nunca us…) | — |
| B13 | VIS-07/32 | o ticket recalculado na tela | `model/labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-07 — os valores Visitas e Vendas inteiros…) | — |
| B14 | VIS-05 | sem aria-busy na primeira carga | `ui/StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-05 — carregando resposta segurada: esqueleto nos quatro cards, `a…) | — |
| B15 | VIS-06 | erro na primeira carga não mostra a mensagem | `ui/StoreMovement.tsx` | **morto — asserção (consulta do Testing Library)** (2 casos; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha primeira carga com `{ error }`: UMA mensagem…) | — |
| B16 | VIS-10 | releitura que falha esconde os valores | `ui/StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha releitura que FALHA com dados na tela: os va…) | — |
| B22 | VIS-41 | o rótulo vira "Pessoas únicas" | `ui/StoreMovement.tsx` | **morto — asserção (consulta do Testing Library)** (5 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` o bloco é …) | — |
| B17 | VIS-05 | o StatCard mostra o valor enquanto carrega | `ui/StatCard.tsx` | **morto — asserção** (3 casos; ex.: `StatCard.test.tsx` — StatCard — carregando e ⓘ (feature 71) carregando: nenhum `<p>` de va…) | — |
| X01 | VIS-29 | [functions.visit] com verify_jwt = true (a loja manda só a chave publicável: pelo comentário do config.toml, o gateway recusaria toda visita) | `supabase/config.toml` | vivo (functions: 952 casos, store: 5672 casos) | — |
| X02 | VIS-24/20 | sem a segunda decisão depois da trava do id | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera trav…) | — |
| X03 | VIS-16 | sem a trava de "uma em voo" | `app/VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo uma chamada em voo por vez: navegar co…) | — |
| X04 | VIS-16/18 | resposta com `ate` e sem `agora` aceita como relógio | `visits/send.ts` | **morto — asserção** (1 caso; ex.: `send.test.ts` — VIS-16/VIS-18 — a resposta agora ausente ⇒ sem relógio (conta como fa…) | — |
| X19 | VIS-25 | sem a marca memoriaSemGravar (o aceite antigo do armazenamento desfaz a recusa) | `model/cookieConsentStore.ts` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-25 — a recusa feita em outra aba gravação que lança + recusa + na…) | — |
| X20 | VIS-10d | o aviso do canal chama a seta da primeira montagem | `api/useOrdersRealtime.ts` | **morto — asserção** (1 caso; ex.: `useOrdersRealtime.test.ts` — useOrdersRealtime — o canal de pedidos do Dashboard o aviso chama o c…) | — |
| X23 | VIS-10b | o foco da janela não relê | `api/useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — foco da janela (VIS-10 b) a janela volta a ter foc…) | — |
| X24 | VIS-10b | staleTime de 1 min (o foco não relê dado "fresco") | `api/useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — foco da janela (VIS-10 b) a janela volta a ter foc…) | — |
| R01 | VIS-24 | SONDA: depois da recusa que chega durante a trava, o marcador NÃO deve ter id | `__tests__/VisitCounter.test.tsx` | **reprovou — defeito confirmado** (`AssertionError: expected '0400ba17-…' to be null`) | — |
| E10 | VIS-03/31 | S10 (Ontem fechado à direita) contra a fixtura da meia-noite exata | `migrations/20261021120000_71-visitas-unicas.sql` | — | **morto** — `extra.sql`: pago exatamente às 00:00 de 21/10 (Brasília) ⇒ Hoje 1, Ontem 0, Seman… |
| E19 | VIS-38 | S19 (started_at recalculado) contra a fixtura dos instantes do contador | `migrations/20261021120000_71-visitas-unicas.sql` | — | **morto** — `extra.sql`: started_at = a PRIMEIRA gravação, e não muda com as seguintes |
| E20 | VIS-40 | S20 (last_recorded_at congelado) contra a fixtura dos instantes do contador | `migrations/20261021120000_71-visitas-unicas.sql` | — | **morto** — `extra.sql`: last_recorded_at = a última linha NOVA (a repetida das 14h não conta) |

**Leitura do sensor.**

- **93 mutantes de comportamento** — 85 no lote 1 (os que a tarefa pediu e os que a leitura do
  diff sugeriu) e 8 no lote 2 (os pontos cegos que a leitura dos testes apontou). **87 mortos,
  6 sobreviventes (S10, S19, S20, V09, V23, X01), nenhuma morte por compilação**: toda morte foi
  por asserção, por consulta do Testing Library (B03, B07, B15, B22 — `findBy…`/`getBy…` que não
  acham o texto esperado, o que é uma asserção sobre o DOM), ou pelo arame de propósito do arquivo
  (F07 — o dublê que lança ao ler `Authorization`). O arnês nunca encontrou alvo ambíguo nem ausente.
- **Do lote 2, só X01 sobrevive.** Os outros sete — a segunda decisão depois da trava (X02), a trava
  de "uma em voo" (X03), a resposta sem `agora` aceita como relógio (X04), a marca `memoriaSemGravar`
  (X19), a seta da primeira montagem no aviso do canal (X20), o foco que não relê (X23) e o
  `staleTime` de um minuto (X24) — morrem por asserção.
- **Os pedidos explícitos da tarefa morreram todos**: semana somando dias (S01, S02), fronteira de dia
  em UTC (S03, S04), semana no domingo (S05, S06), marcador gravado antes do sucesso (V01), recusa
  que não apaga/para (V02, V03a, V03b — como mutantes; a sonda R01 achou o caminho em que o código
  ATUAL não apaga, G4), prévia e host interno contando (V06, V06b, V07, F02, F03),
  robô gravando (V08, V08b, F01, C01), id inválido gravando (F04, C02), venda de pedido não pago
  (S07, S07b), ticket dividindo por zero (S08), erro de leitura virando 0 (B01), cards antigos de
  volta (B02) e o Dashboard sem o bloco (B03).
- **Dos 22 mutantes de SQL, 7 só morrem por probe** (S02, S04, S06, S07b, S08b, S11, S22): a régua
  estática do `visitasSchema.test.ts` confere a FORMA dos comandos e é cega à semântica que mantém a
  forma — um recálculo depois do `select`, o `v_ini_hoje` por `::timestamptz`, a segunda-feira menos
  um dia, um `or` ao lado de `'approved'`, o ticket com as variáveis de outro período. **Os probes não
  rodam no CI**: hoje, essa metade do comportamento do banco depende de alguém rodar
  `probes/*.sql`. Não é lacuna da spec (o design planejou probe para isso), é o risco que fica
  declarado.
- **S08b é o caso do arnês do guarda**: a suíte reprovou, mas só porque o `mutar()` do sensor "o
  ticket sem o `round` reprova" perdeu o alvo — a régua do ticket
  (`case when v_n_\w+ > 0 then round(v_f_\w+ / v_n_\w+, 2) end`) aprovava o ticket de Hoje dividindo
  a soma da SEMANA. Quem matou de fato foi `vendas.sql`. (A régua aceita sufixos trocados; prender
  `v_f_X / v_n_X` com o mesmo `X` fecharia.)
- **Os autores já tinham rodado sensores por task** (`tasks.md`): este lote repetiu poucos deles
  (B02, V26) e concentrou-se no que não tinha sido mutado — fiação do componente, o dado por trás da
  tela e as fronteiras do SQL.
- **Lote 3 — quatro confirmações dirigidas, fora da contagem acima.** R01 não é mutante de produção:
  é uma **sonda** que acrescenta uma asserção ao caso existente da trava (ver G4), e reprovar quer
  dizer que o defeito existe — ela reprovou (`expected '0400ba17-…' to be null`). E10, E19 e E20 são
  S10, S19 e S20 de novo, agora contra a fixtura `extra.sql` deste verificador (que passa no código
  atual): os três morrem.

### Lacunas, em ordem de severidade — e o conserto de cada uma

> **Uma delas é defeito, raro: G4** — a sonda R01 confirma que a recusa que chega durante a trava do
> id deixa um código novo no navegador. **As outras cinco não são defeito do comportamento medido**:
> a configuração está certa hoje (G1), a fixtura que este verificador escreveu (`extra.sql`) passa no
> código atual e mata os três sobreviventes de SQL (G2, G3), e os dois sobreviventes de cliente têm o
> servidor como rede de baixo (G5, G6). São afirmações da spec que **nenhum teste ou probe
> discrimina** — o que o `validate.md` manda tratar como tarefa de conserto antes de fechar.

**G1 · `VIS-29` — `[functions.visit] verify_jwt = false` não tem guarda (X01 sobrevive).**
- O que acontece com o mutante: trocar para `true` passa nas suítes de functions e da loja — nenhum
  teste do repositório lê `[functions.visit]` no `config.toml`. A loja chama com **só**
  a chave publicável — e o `.env` da loja guarda uma `sb_publishable_…`, que **não é JWT**; com a
  verificação de JWT ligada, o gateway recusa a chamada antes do handler (é a razão escrita no próprio
  `config.toml`, e a orientação do Supabase para as chaves novas; **não** remedido aqui, porque
  exigiria servir a function com a configuração invertida). O `VisitCounter` trata a recusa como
  falha, tenta uma vez mais por aba e desiste: **zero visitas para sempre, sem erro em lugar
  nenhum**, com o painel dizendo "Nenhuma visita registrada ainda". O design lista o risco (seção 6, "Gateway
  hospedado com só `apikey`") e responde só com probe local e conferência pós-deploy.
- Conserto: o molde já existe — `checkout/__tests__/identify.test.ts:236-240`
  (`expect(config).toMatch(/\[functions\.checkout\]\s*\nverify_jwt = false/)`). Um caso igual em
  `visit/__tests__/handlers.test.ts` (ou num guarda que leia o `config.toml`), com o sensor do valor
  `true` reprovando.

**G2 · `VIS-38` e `VIS-40` (o dado por trás) — `started_at` "gravado uma vez" e `last_recorded_at`
"atualizado a cada linha nova" não têm prova (S19 e S20 sobrevivem à suíte E aos cinco probes).**
- S19 (o upsert também reescreve `started_at`) faria "Contando desde" andar para a última visita, e
  o painel afirmaria que o contador começou há pouco; S20 (`last_recorded_at` congelado) faria
  "Última visita registrada" parar na primeira — o sinal que a spec criou para separar "zero
  visitas" de "contador quebrado" ficaria mentindo exatamente quando importa.
- Por que passam: nenhum probe grava DUAS visitas novas e confere o contador; com uma gravação só,
  "grava uma vez" e "grava sempre" dão o mesmo valor.
- Conserto (provado por este verificador): a fixtura de `extra.sql` — visita nova às 10h, outra às
  12h, a primeira de novo às 14h ⇒ `started_at = 10h`, `last_recorded_at = 12h`, e `store_movement`
  devolvendo os dois — passa no código atual e **mata S19 e S20** (lote 3, E19/E20). Levá-la para
  `probes/visitas.sql`, e acrescentar ao guarda uma régua do upsert (`started_at` só no `insert`;
  `last_recorded_at = greatest(…)` no `do update`).

**G3 · `VIS-03` / `SPEC_DEVIATION` D5 — a fronteira EXATA de Ontem nas vendas não tem fixtura (S10
sobrevive à suíte E aos cinco probes).**
- O desvio D5 troca `store_day(paid_at)` por `paid_at >= store_day_start(…)` alegando "é o mesmo
  dia". A equivalência só vale com `>=` em Hoje e `<` em Ontem; trocar `<` por `<=` faz o pedido pago
  às 00:00:00 de Brasília contar em Hoje **e** em Ontem, e nada reprova: a fixtura (f) da spec é
  `02:59:59.900Z` (um décimo ANTES), que passa com `<` e com `<=`.
- Conserto (provado): a fixtura "pago exatamente às 03:00:00Z ⇒ Hoje 1, Ontem 0, Semana 1" de
  `extra.sql` passa no código atual e **mata S10** (E10). Levá-la para `probes/vendas.sql`, e prender
  `o.paid_at < v_ini_hoje` nas duas expressões de Ontem com uma régua no guarda.

**G4 · `VIS-24` — DEFEITO, raro: a recusa que chega enquanto a trava do id espera deixa um id NOVO no
armazenamento (sonda R01 reprova).**
- Mecanismo: `tentar()` decide que pode chamar → `ensureVisitorId()` pede a trava → a cliente salva
  a recusa (`forgetVisitorId` não tem id para apagar, ou apaga o antigo) → a trava solta e
  `criarOuLer` **cria e grava** um id novo → só então a segunda `visitRefusal` recusa a chamada
  (`VisitCounter.tsx:79-82`). A metade "nenhuma chamada depois" vale; a metade "o código é apagado"
  não: o navegador fica com um código criado **depois** da recusa, e o Apêndice A promete à cliente
  que desligar Estatísticas "apaga o código do seu navegador". Se ela reaceitar, é esse código que
  viaja. Pelo mesmo mecanismo (por leitura, sem sonda), vale para `?nao-contar=1` durante a trava.
- É raro (a recusa tem de cair entre o pedido da trava e o callback; com duas abas, alcançável) e não
  grava visita nenhuma — mas é a promessa de privacidade, e o caso de teste que existe
  (`VisitCounter.test.tsx:404`) não olha o marcador no fim.
- Prova: a sonda R01 acrescenta `expect(marcador()?.id ?? null).toBeNull()` ao fim desse caso — o
  `trava segurada ⇒ save(false) ⇒ trava solta ⇒ nenhuma chamada`, com a store real — e ele reprova
  com `AssertionError: expected '0400ba17-58a9-430f-8b44-02422b8a77fc' to be null`: o código foi
  criado **depois** da recusa. (A sonda mexe só no arquivo de teste, que foi restaurado byte a byte.)
- Conserto: quando a segunda decisão recusa, apagar o id (`forgetVisitorId()`) antes de sair — ou
  decidir a recusa DENTRO da trava, antes de criar —, com a asserção da sonda como régua.

**G5 · `VIS-19` (fiação) — o `VisitCounter` sem armazenamento que grava (V09 sobrevive).**
- Tirar o `if (!id) return` faz a loja mandar `{"id":null}` quando o `setItem` lança. Hoje o servidor
  recusa (`400`), conta como falha e a aba tenta mais uma vez: é tráfego inútil, não visita. Mas a
  spec diz "SHALL NOT registrar visita" e o design (matriz `VIS-19`, `design.md:752`) pede "nenhum
  `fetch`" — mas põe a prova só na unidade (`visitor.test.ts`), onde "nenhum `fetch`" é verdade por
  construção: `ensureVisitorId` não faz rede. Nenhum caso do componente monta o armazenamento que não
  grava (é o "teste não monta a árvore que prova").
- Conserto: um caso em `VisitCounter.test.tsx` com `setItem` lançando para `VISITOR_KEY` (e outro sem
  `crypto.randomUUID`) ⇒ zero `fetch`.

**G6 · `VIS-22` ("a loja espera a leitura de `store_settings`") — a fiação não é discriminada (V23
sobrevive).**
- O caso `VisitCounter.test.tsx:320` segura a leitura, mas em `localhost`: o host PADRÃO de
  `DEFAULT_ANALYTICS` é `umaestrelinha.com.br`, que já recusa `localhost` por `interno`. "Esperar" e
  "não esperar" dão o mesmo resultado na fixtura. Em produção é o contrário — o host padrão É o host
  da página, e o `'esperando'` é a única coisa entre a configuração carregando e a chamada — com o
  host do banco diferente do padrão (vazio, para parar a contagem), quem ainda recusaria é o servidor,
  por `interno`: a mesma rede de baixo de G5.
  (O status da task 15 fala em "padrão vazio"; na fiação, enquanto a leitura não termina, o host vem
  de `DEFAULT_ANALYTICS` — `useAnalyticsSettings` —, e ele não é vazio.)
- Conserto: um caso em que o padrão LIBERARIA enquanto a leitura está segurada (página no host
  padrão) ⇒ zero `fetch` até a leitura terminar.

**Precisão (sem mutante sobrevivente, sem asserção):**
- **`VIS-12`** "o id SHALL NOT ir em nenhuma outra requisição": verdade por leitura (só o `send.ts`
  manda o id, e só o `VisitCounter` chama `ensureVisitorId`), sem teste. Um guarda de consumidores de
  `shared/lib/visits` fecharia.
- **`VIS-10`** "a LINHA passa de 'Hoje, 21/10' a 'Hoje, 22/10' no instante `expira_em`": provado por
  composição (o hook troca `data.hoje` no instante; `periodLine` escreve a linha), não no widget com
  relógio falso.

### Casos de borda da spec

- [x] Duas chamadas simultâneas ⇒ uma linha, as duas `200` — `concorrencia.sh` (rodado aqui).
- [x] Aba aberta da noite para a manhã ⇒ a navegação depois de `ate` registra o dia novo
  (`VisitCounter.test.tsx:229`); o Dashboard troca o dia no instante `expira_em`
  (`useStoreMovement.test.ts:175`, por composição — ver a nota de `VIS-10`).
- [x] Relógio que volta ⇒ chama de novo (`marker.test.ts:116`).
- [x] `production_host` vazio ⇒ tudo interno, nada gravado, o painel diz que está parado
  (`refusal.test.ts:72`, `handlers.test.ts:393`, `labels.test.ts:168`).
- [x] Loja no `.vercel.app` com o host do domínio próprio ⇒ `interno` (`handlers.test.ts:369`), e o
  painel diz em que endereço conta (`labels.test.ts:161`).
- [x] Leitura de `store_settings` que falha na loja ⇒ o servidor decide pelo host do banco
  (`handlers.test.ts:383`).
- [x] Ids forjados enchendo o teto ⇒ `teto` e `capped_day`, e o painel avisa (`teto.sql`,
  `labels.test.ts:209`).
- [x] Paga ontem e cancelada hoje ⇒ sai de Ontem (`vendas.sql` (c)).
- [x] Venda com zero visita ⇒ os dois números como vierem (nenhum cálculo cruzado no painel).
- [x] Recusa e reaceite no mesmo dia ⇒ não conta de novo (o prazo fica: `cookieConsentStore.test.ts:157`,
  `marker.test.ts:105`) — ⚠️ ver G4.
- [x] O mesmo id depois de 8 dias ⇒ conta como novo para o banco (poda: `visitas.sql:64-77`).

### Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo / sem escopo a mais | ✅ — o que entrou é o que as ACs e o design pedem; o único arquivo fora do *Where* com motivo declarado é `marcacaoSoPorAcao.test.ts` (a lista literal de RPCs) |
| Mudanças cirúrgicas | ✅ — `checkout/handlers.ts` só troca a declaração pelo reexport (`toBe` provado); `StatCard` aditivo, com a saída antiga comparada por HTML |
| Padrões do repositório | ✅ — `AD-004`, `_shared/http.ts`, `.ts` explícito nas folhas, `string \| null` no lugar de união por booleano, guardas com âncora e sensores |
| Checagem ancorada na spec | ⚠️ — 37 ACs provadas no valor da spec (duas com nota de precisão); 7 com lacuna (G1–G6), uma delas um defeito raro (G4) |
| Cobertura por camada | ⚠️ — regra pura 1:1; fiação do componente com dois buracos (G5, G6) e uma corrida (G4); SQL com três (G2, G3), que a fixtura `extra.sql` do apêndice fecha; configuração do gateway sem guarda (G1) |
| Todo teste mapeia uma AC, caso de borda ou "done when" | ✅ |
| Diretrizes do projeto (`CLAUDE.md` raiz e dos módulos) | ✅ — com as observações abaixo |

Observações menores, sem conserto exigido:

- `apps/backoffice/src/shared/ui/StatCard.test.tsx` ficou com **fim de linha misto**: as 29 linhas
  originais em CRLF e o bloco novo em LF (o HEAD tinha 0 CR). O `.gitattributes` (LF fixo) normaliza
  no commit, e os guardas normalizam CRLF; é ruído de diff.
- `VisitCounter.test.tsx` imprime no `stderr` "An update to VisitCounter inside a test was not
  wrapped in act(...)" — os casos passam; é o agendador disparando fora do `act`.
- Depois de uma falha **na primeira carga**, "Tentar de novo" não dá sinal enquanto a nova leitura está
  no ar (o estado continua `isError && !data`, então a mensagem e o botão ficam iguais até a
  resposta). A spec não pede nada para esse instante; é UX, não AC.
- `contadorSemGa.test.ts` (`daPasta`) junta o nome do arquivo ao diretório **raiz** da varredura e
  perde subpastas — hoje `shared/lib/visits` não tem subpasta além de `__tests__` (pulada). Falharia
  alto (ENOENT), não calado.

### Rastreabilidade (proposta para a `spec.md`, que segue "Pending")

| Requisito | Antes | Depois desta rodada |
| --- | --- | --- |
| VIS-01, 02, 04–09, 11, 13–18, 20, 21, 23, 25–28, 30–34, 36, 37, 39, 41–44 (34) | Pending | ✅ Verified |
| VIS-10 | Pending | ✅ Verified — nota de precisão (a linha no widget, por composição) |
| VIS-12 | Pending | ✅ Verified — nota de precisão ("não vai em outra requisição" sem asserção) |
| VIS-35 | Pending | ✅ Verified — **assunção pendente** de confirmação do usuário |
| VIS-03 | Pending | ❌ Needs fix — G3 |
| VIS-19 | Pending | ❌ Needs fix — G5 |
| VIS-22 | Pending | ❌ Needs fix — G6 |
| VIS-24 | Pending | ❌ Needs fix — G4 (defeito raro, confirmado pela sonda R01) |
| VIS-29 | Pending | ❌ Needs fix — G1 |
| VIS-38, VIS-40 | Pending | ❌ Needs fix — G2 (a tela está provada; o dado por trás, não) |

### Lições candidatas

Escritas aqui, e **não** pelo `lessons.py` (o `list` dele reescreve e apaga o arquivo — memória do
projeto). Cada uma nasce de um sobrevivente desta rodada.

1. **`SPEC_DEVIATION` de forma que troca uma função por um intervalo precisa de fixtura NO INSTANTE
   EXATO da fronteira.** Trocar `store_day(paid_at)` por `paid_at >= store_day_start(dia)` só é "o
   mesmo dia" com `>=` de um lado e `<` do outro; a fixtura "um décimo antes" (`02:59:59.900Z`) passa
   com `<` e com `<=`, e a equivalência que o desvio alega fica sem prova. *(S10)*
2. **Estado escrito por upsert ("grava uma vez", "acompanha o maior") precisa de fixtura com DOIS
   eventos novos e uma repetição.** Com um evento só, "nunca recalcula" e "sempre recalcula" dão o
   mesmo valor, e o probe passa sobre as duas versões. *(S19, S20)*
3. **Configuração de gateway é fiação e precisa do guarda que a vizinha já tem.** `verify_jwt` no
   `config.toml` decide se a chamada chega ao handler; a `checkout` guarda a dela por teste, a `visit`
   não, e invertê-la passa em todas as suítes enquanto em produção toda chamada com só a chave
   publicável morre no gateway, calada. *(X01)*
4. **Fixtura de "esperar o dado" em que o valor PADRÃO já recusa não distingue esperar de não
   esperar.** O host padrão (`umaestrelinha.com.br`) recusa `localhost` por conta própria, então o
   caso "configuração carregando ⇒ espera" passa com a espera apagada; a fixtura precisa do padrão
   que LIBERARIA. É a família de `L-013`/`L-038` (dois candidatos com o mesmo valor). *(V23)*
5. **Morte por arnês do guarda não é morte pela régua.** Os sensores de `visitasSchema.test.ts`
   mutam o texto real e lançam quando o alvo some, então QUALQUER edição numa linha guardada reprova
   a suíte — inclusive a semântica que a régua não enxerga (S08b morreu só por um `mutar()` que perdeu
   o alvo; a régua do ticket aprovava o mutante). O sensor de discriminação tem de separar as duas
   mortes, senão um mutante semântico conta como morto pelo guarda. *(S08b)*
6. **Defesa em camadas esconde a camada de cima: quando o servidor recusaria de qualquer jeito, o
   teste do cliente tem de medir a CHAMADA, não o desfecho.** O `VisitCounter` sem `if (!id) return`
   manda `{"id":null}`, o servidor responde `400`, e nenhuma visita é gravada — a suíte não vê porque
   nenhum caso monta o armazenamento que não grava. *(V09)*
7. **Uma segunda decisão depois de uma espera assíncrona impede a AÇÃO, mas não desfaz o EFEITO que a
   espera produziu.** O `VisitCounter` decide de novo depois da trava do id — e não chama —, mas a
   criação dentro da trava já gravou um código que a recusa acabou de prometer apagar. Teste de
   "nenhuma chamada depois da recusa" precisa também olhar o estado que sobra. *(R01)*

### Apêndice — o que este verificador escreveu, para levar ao repositório

O arnês do sensor e a fixtura ficaram fora do repositório (no diretório de rascunho da sessão, que
não sobrevive a ela). O que o conserto precisa está transcrito aqui.

**A fixtura `extra.sql`** — passa no código atual (exit 0, 5 `ok`) e mata S10, S19 e S20. Escrita no
molde dos probes do autor; dentro de `probes/`, o `\ir` fica relativo:

```sql
-- Fixturas que os probes do autor NÃO têm:
-- (1) a fronteira EXATA de Hoje nas vendas (o par de VIS-31 f, que testa só 02:59:59.900Z);
-- (2) os dois instantes do contador: started_at gravado UMA vez, last_recorded_at = a última linha NOVA.
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

create function pg_temp.pedido(p_num text, p_total numeric, p_status text, p_pagamento text,
                               p_criado timestamptz, p_pago timestamptz) returns void
language sql as $f$
  insert into public.orders (order_number, status, subtotal, total, payment_method, customer_name,
                             customer_email, payment_status, created_at, paid_at)
  values (p_num, p_status, p_total, p_total, 'pix', 'Verificador 71', 'verificador71@exemplo.invalid',
          p_pagamento, p_criado, p_pago)
$f$;

select pg_temp.confere((select count(*) from public.orders
                         where payment_status = 'approved' and paid_at >= timestamptz '2026-10-19T03:00:00Z') = 0,
  'nenhum pedido pago desde 19/10 antes da fixtura');

-- (1) pago EXATAMENTE às 00:00:00 de 21/10 em Brasília (03:00:00Z): store_day ⇒ 21/10 ⇒ só Hoje.
select pg_temp.pedido('VERIF-71-Z', 50.00, 'pending', 'approved', '2026-10-21T02:00:00Z', '2026-10-21T03:00:00Z');
select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb #>> '{periodos,hoje,vendas}')::int = 1
  and (:'m'::jsonb #>> '{periodos,ontem,vendas}')::int = 0
  and (:'m'::jsonb #>> '{periodos,semana,vendas}')::int = 1,
  'pago exatamente às 00:00 de 21/10 (Brasília) ⇒ Hoje 1, Ontem 0, Semana 1 — o intervalo de Ontem é aberto à direita');

-- (2) os instantes do contador.
select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-10-21T10:00:00Z');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a2', '2026-10-21T12:00:00Z');
select public.record_store_visit('aaaaaaaa-0000-4000-8000-0000000000a1', '2026-10-21T14:00:00Z');
select pg_temp.confere((select started_at from public.store_visit_counter where id) = timestamptz '2026-10-21T10:00:00Z',
  'started_at = a PRIMEIRA gravação, e não muda com as seguintes');
select pg_temp.confere((select last_recorded_at from public.store_visit_counter where id) = timestamptz '2026-10-21T12:00:00Z',
  'last_recorded_at = a última linha NOVA (a repetida das 14h não conta)');
select pg_temp.movimento('2026-10-21T18:00:00Z', :'admin_id') as m2 \gset
select pg_temp.confere((:'m2'::jsonb ->> 'contagem_desde')::timestamptz = timestamptz '2026-10-21T10:00:00Z'
  and (:'m2'::jsonb ->> 'ultima_visita')::timestamptz = timestamptz '2026-10-21T12:00:00Z',
  'store_movement devolve contagem_desde = a primeira, ultima_visita = a última nova');

rollback;
```

**A sonda R01** — uma linha ao fim do caso `trava segurada ⇒ save(false) ⇒ trava solta ⇒ nenhuma
chamada` (`apps/store/src/app/__tests__/VisitCounter.test.tsx:404`), depois do
`expect(fetchMock).not.toHaveBeenCalled()` que já existe:

```ts
expect(marcador()?.id ?? null).toBeNull()
```

Hoje ela reprova; com o conserto de G4, passa — e vira a régua dele.

**O guarda de G1** — o molde é o da `checkout` (`supabase/functions/checkout/__tests__/identify.test.ts:236-240`),
com a âncora de leitura do `config.toml` ao lado:

```ts
expect(config).toMatch(/\[functions\.visit\]\s*\nverify_jwt = false/)
```

---

## Rodada 2 — 2026-10-22

- **Spec**: `.specs/features/71-visitas-unicas-no-dashboard/spec.md` (terceira escrita, 44 ACs, com a
  rastreabilidade da r1 já anotada pelo autor)
- **Faixa do diff**: `9270c03a` (HEAD, o mesmo da `baseline.md`) .. árvore de trabalho, **sem commit**:
  33 arquivos rastreados alterados e 26 entradas novas (`git status --porcelain`: 59 linhas, iguais
  no começo e no fim desta rodada). O SHA-256 dos **97** arquivos do diff (código, testes, probes e
  documentos da feature) foi tirado no começo e conferido depois do sensor: **97/97 iguais** — o único
  que muda depois disso é este `validation.md`, com esta seção. Uma migration
  (`20261021120000_71-visitas-unicas.sql`), aplicada só no banco local.
- **Verificador**: sub-agente independente (autor ≠ verificador). Li `validate.md`, a spec, o design,
  o `tasks.md` (inclusive *Consertos da verificação r1*), a `baseline.md`, a rodada 1 deste arquivo e
  o diff inteiro — o código de produção **antes** dos testes e das notas de fecho. Nada de commit,
  stash ou push; banco só o local (54441/54442); nada com `--linked`, nada de `db reset`.

### Veredito: ❌ FAIL — por cobertura; nenhum defeito de produto encontrado

**Os seis consertos da r1 (G1–G6) e as três notas (P1, P2, H1) estão feitos e provados**: cada
sobrevivente da r1 foi reinjetado no arquivo real e morreu **por asserção da régua** (não por um
`mutar()` de sensor que perdeu o alvo), e o defeito G4 não se reproduz — a sonda R01 virou caso de
teste e passa. Os gates batem com o fecho do autor ao número.

O FAIL vem de **duas lacunas novas**, as duas de cobertura e as duas com prova de que o código atual
está certo (a fixtura e a sonda deste verificador passam nele e matam o mutante):

- **G7** — os dois DIAS do contador (`contagem_desde_dia`, `ultima_visita_dia`) não têm fixtura na
  faixa em que o dia de Brasília difere do dia em UTC (21h–24h): S24 e S25 sobrevivem ao guarda e
  aos cinco probes.
- **G8** — a releitura da escolha de **outra aba** dentro da trava do id (a peça que o conserto G4
  acrescentou) não tem teste: N3 sobrevive à suíte inteira da loja.

```
## Validation: 71 · Visitas únicas no Dashboard — FAIL ❌ (rodada 2)

Spec-anchored check: 44 ACs; 40 provadas no valor da spec; 4 com lacuna (VIS-24 → G8; VIS-33, VIS-38, VIS-40 → G7, no lado do dado)
Gate: 14338 passed, 0 failed (core 3507 · functions 957 · store 5717 · backoffice 3645 · catalog-import 512); tsc 0×3; lint 25/7 (= fecho); build verde; payment/** intocado
Sensor: lote 1 = 127 mutantes de comportamento (32 SQL, 95 TS/config), 0 mortes por compilação/carga, 0 por timeout — 123 mortos (114 pela suíte, 9 só pelos probes), 4 vivos em tudo (S24, S25, X02, N3); lote 2 = 9 execuções dirigidas: a fixtura deste verificador passa no código atual e mata S24/S25; a sonda R2-N3 passa no código atual e mata N3; X02 é equivalente na prática (só um modelo irreal de trava o distingue)
Report: .specs/features/71-visitas-unicas-no-dashboard/validation.md

Ranked gaps:
1. G7 · VIS-33 (dado de VIS-38/VIS-40) — `contagem_desde_dia`/`ultima_visita_dia` sem fixtura entre 21h e 24h de Brasília: S24/S25 (`::date` na sessão UTC) vivos no guarda e nos 5 probes — supabase/migrations/20261021120000_71-visitas-unicas.sql:327,329
2. G8 · VIS-24 (e VIS-25) — a decisão dentro da trava relê a recusa feita em OUTRA aba, sem teste: N3 vivo na suíte inteira da loja — apps/store/src/app/VisitCounter.tsx:82
```

### Os consertos da r1, reinjetados

| Id | AC | Mutante reinjetado no arquivo real | Resultado nesta rodada |
| --- | --- | --- | --- |
| **G1** | VIS-29 | X01 — `[functions.visit] verify_jwt = true` | ✅ **morto por asserção da régua** — `supabase/functions/visit/__tests__/handlers.test.ts:535` (`regua(config)` `toBe(true)`: *expected false to be true*). Os três sensores do bloco perderam o alvo (incidental, separado) |
| **G2** | VIS-38/40 | S19 (`started_at` recalculado), S20 (`last_recorded_at` congelado), S21, e o novo S23 (a repetida avança `last_recorded_at`) | ✅ S19 e S20 morrem pela régua (`setDoUpsert` `toBe(SET_CERTO)`, `visitasSchema.test.ts:575`; S19 também por `:579`) **e** pelo probe `visitas.sql` (`fixtura_instantes`). S23 escapa do guarda e morre no probe (`last_recorded_at = 12h; a repetida das 14h não conta`) |
| **G3** | VIS-03 / D5 | S10 (`<=` nas duas expressões de Ontem), S10b (só na soma) | ✅ régua `fronteiras` (`visitasSchema.test.ts:826`) **e** probe `vendas.sql` (savepoint `fronteira`: "pago EXATAMENTE às 00:00 … Hoje 1, Ontem 0, Semana 1" e "o faturamento acompanha") |
| **G4** | VIS-24/42 | G4a (sem `podeSeguir` na fiação = sonda R01), G4b (sem a pergunta dentro de `criarOuLer`), N8 (decisão avaliada ANTES de pedir a trava) | ✅ os três morrem por asserção em `apps/store/src/app/__tests__/VisitCounter.test.tsx:455`, `:483`, `:510` (`expect(marcador()?.id ?? null).toBeNull()` — *expected '1cc97346-…' to be null*); G4b também em `visitor.test.ts:202–243`. O caso N8 mostra que o teste distingue "decidir dentro da trava" de "decidir antes dela" |
| **G5** | VIS-19 | V09 (`if (!id) return` apagado) | ✅ `VisitCounter.test.tsx:566` (`setItem` que lança ⇒ `fetchMock` *not called*, recebeu 2) e `:579` (sem `randomUUID`) |
| **G6** | VIS-22 | V23 (`settingsLoaded: true` na fiação), N7 (sem `'esperando'` na decisão pura) | ✅ `VisitCounter.test.tsx:353` e `:367` (a página no host padrão por `jsdom.reconfigure`, âncora em `:349`); N7 também em `refusal.test.ts:60`/`:64` |
| **P1** | VIS-12 | P1a (`readMarker` importado pela store de cookies), P1b (`ensureVisitorId` pelo barril num widget) | ✅ `apps/store/src/shared/lib/__tests__/idDoVisitanteSoNoEnvio.test.ts:131`/`:139` |
| **P2** | VIS-10 | o widget guardando a PRIMEIRA leitura | ✅ `apps/backoffice/src/widgets/store-movement/ui/__tests__/StoreMovement.test.tsx:413` (consulta "Hoje, 22/10" no instante `expira_em`) e `AdminDashboard.test.tsx:158` |
| **H1** | VIS-32 | S08b (ticket de Hoje dividindo a soma da semana) | ✅ agora morre **pela régua** (`ticket(sql)` `toBe(3)`: *expected 2 to be 3*, com backreference) e por `periodoCasado` — não mais só por um sensor que perdeu o alvo |
| **D1** | — | (higiene) | ✅ `StatCard.test.tsx` sem CR, diff = só as 89 linhas acrescentadas; `VisitCounter.test.tsx` sem aviso de `act()`. ⚠️ Imprecisão na nota: **2 dos 8 avisos** de `act()` da suíte da loja são *"An update to VisitCounter …"* — vêm de `src/app/__tests__/analytics.test.tsx`, que monta o `App` inteiro e agora monta o contador junto. O arquivo é anterior à `71`; os dois avisos, não |

### Gates (medidos por este verificador, com a árvore sem mutação)

Um workspace por vez, `--testTimeout=20000` **sem** o `--` nos dois apps, exit code fora de pipe.

| Medida | Entrada (`baseline.md`) | r1 | **Agora** | Delta vs entrada | Exit |
| --- | --- | --- | --- | --- | --- |
| core | 3414/133 | 3507/138 | **3507/138** | +93/+5 | 0 (5 s) |
| functions | 890/19 | 952/21 | **957/21** | +67/+2 | 0 (1 s) |
| store | 5350/299 | 5672/311 | **5717/312** | +367/+13 | 0 (42 s) |
| backoffice | 3511/199 | 3644/206 | **3645/206** | +134/+7 | 0 (38 s) |
| catalog-import | 512/23 | 512/23 | **512/23** | 0 | 0 (2 s) |
| **Total** | **13677/673** | 14287/699 | **14338/700** | **+661/+27** | |
| `tsc` store · backoffice · `tsconfig.server.json` | 0 · 0 · 0 | 0 · 0 · 0 | **0 · 0 · 0** | — | 0 |
| Lint | 26/7 | 25/7 | **25/7** (backoffice 23/5 · store 2/2) | −1 erro (o `any` de `revenueToday`) | 1 (esperado) |

- Os números batem **exatamente** com o fecho do autor (`tasks.md`, *Consertos da verificação r1*:
  +51/+1 sobre a r1). Nenhuma queda em workspace nenhum. Os problemas de lint são todos anteriores à
  feature (11 arquivos no painel, 3 na loja; nenhum arquivo novo aparece — `useAdminStats.ts`, que a
  feature tocou, segue com os três `any` que já existiam, entre eles o de `monthRevenue`; o quarto, o
  de `revenueToday`, saiu com o card).
- `pnpm build --force` (sem cache do turbo): exit 0, os dois apps construídos (0 de 2 em cache),
  `apps/store/.server/page.mjs` gerado.
- `git diff --name-only -- packages/core/src/payment` e `git status --porcelain -- packages/core/src/payment`:
  **vazios**.
- Migrations: 64 no disco, 64 em `supabase_migrations.schema_migrations`, a mais recente
  `20261021120000`, nenhum prefixo repetido.

### Probes no banco local (rodados por este verificador)

| Probe | Resultado | O que prova |
| --- | --- | --- |
| `dia.sql` | exit 0, 9 `ok` | VIS-03 (as três fixturas de fronteira, a segunda-feira, a inversa, `expira_em`) |
| `visitas.sql` | exit 0, **25** `ok` | VIS-14, VIS-15 (2/1/**2** e 1/1/1), VIS-30, e a fixtura dos instantes do conserto G2 |
| `vendas.sql` | exit 0, **19** `ok` | VIS-31 (a)–(f), a fronteira exata do conserto G3, VIS-32, VIS-33 (>1.000, só escalares) |
| `teto.sql` | exit 0, 10 `ok` | VIS-27, VIS-44 |
| `papeis.sql` | exit 0, 32 `ok` | VIS-28, VIS-33 (`anon` e não-admin ⇒ 42501; `service_role` grava) |
| `concorrencia.sh` | exit 0 | VIS-14: duas sessões ⇒ **1** linha, `gravada` + `repetida`, `ate` inteiro, contador de volta a "ausente" |
| `banco-igual-ao-arquivo.sql` (**deste verificador**) | exit 0, 1 `ok` | as 9 funções (corpo, `definer`, volatilidade, `search_path`, ACL) e as 2 tabelas (RLS, ACL, colunas) aplicadas são idênticas às do arquivo |
| `dias-do-contador.sql` (**deste verificador** — texto no apêndice) | exit 0, 4 `ok` | o dia de Brasília de `contagem_desde_dia` e `ultima_visita_dia` entre 21h e 24h — ver G7 |

Estado do banco local no começo e no fim: `store_visits` 0, `store_visit_counter` 0, nenhum pedido
`PROBE-`/`VERIF-`, `orders_number_seq` em 183, o job `prune-store-visits` em `cron.job`, o
`production_host` gravado intacto. `function-visit.sh` (a function servida) **não** foi refeito: o
edge runtime local está parado (como na entrada), e `visit/handlers.ts` e `index.ts` não mudaram nos
consertos — o caminho real do gateway segue coberto por `prova-em-navegador.md`.

### Checagem ancorada na spec — as 44 ACs, de novo

Rederivada desta vez, com as linhas dos arquivos como estão hoje (vários testes cresceram nos
consertos). Painel = `apps/backoffice/src/…`; loja = `apps/store/src/…`; probes =
`.specs/features/71-visitas-unicas-no-dashboard/probes/`.

| AC | Resultado definido pela spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| VIS-01 | `h2` "Movimento da loja"; abas Hoje · Ontem · Esta semana com Hoje selecionada; 4 cards na ordem; **primeira seção depois do `PageHeader`** | `widgets/store-movement/ui/__tests__/StoreMovement.test.tsx:90` (abas `toEqual([...3])`, `aria-selected` `'true'` na primeira), `:102` (rótulos `toEqual([...4])`); `pages/admin/AdminDashboard.test.tsx:126` (`filhos[1]` `toBe(secaoMovimento())`, `h1` em `filhos[0]`) | ✅ (B03 morto) |
| VIS-02 | sem nova chamada; exatamente uma `aria-selected`; `tablist` "Período"; setas ←/→ | `StoreMovement.test.tsx:111` (`rpc` 1 chamada, `selecionadas` `toEqual(['Esta semana'])`), `:130` (nome da `tablist`, `ArrowRight`/`ArrowLeft`); `AdminDashboard.test.tsx:190` (`rpc` e `from` sem chamada nova) | ✅ |
| VIS-03 | meio-abertos por `store_day`; `02:59:59.900Z⇒20/10`, `03:00:00Z⇒21/10`, domingo 23h30 ⇒ 18/10 na semana de 12/10 | `dia.sql:12-24` (9 `ok`, fuso da sessão em Tóquio); a fronteira EXATA das vendas: `vendas.sql` savepoint `fronteira` (19 `ok`); régua `visitasSchema.test.ts:826` | ✅ (S03, S03b, S04, S05, S06, S10, S10b mortos) — G3 da r1 fechado |
| VIS-04 | uma RPC, sem data nem `p_agora`; chaves exatas do argumento | `entities/stats/api/useStoreMovement.test.ts:135` (`rpc.mock.calls[0]` `toEqual(['store_movement'])`, `toHaveLength(1)`) | ✅ (B23 morto) |
| VIS-05 | esqueleto ×4 + `aria-busy`; nenhum `0`/`R$ 0,00`/`—` | `StoreMovement.test.tsx:149` (`[data-skeleton="valor"]` ×4, texto sem dígito, sem `R$`, sem `—`), `:168` (releitura segurada mantém valores); `shared/ui/StatCard.test.tsx:68` | ✅ (B14, B17 mortos) |
| VIS-06 | uma mensagem exata, um botão de 44px, nenhum valor; tocar relê | `StoreMovement.test.tsx:189` (`mensagens` ×1, botão `h-11`, grade ausente, `rpc` +1 depois do clique) | ✅ (B01, B15, B19 mortos) |
| VIS-07 | `1.234`; `formatPrice`; ticket do banco; sem venda `0`/`R$ 0,00`/`—`+`sr-only`; sem visita `0` | `widgets/store-movement/model/__tests__/labels.test.ts:82`, `:88` (ticket 99,99 do banco, nunca 33,33), `:106`; `StoreMovement.test.tsx:230` | ✅ (B13 morto) |
| VIS-08 | `<button>` com `aria-label`/`aria-expanded`, 44px; Popover, nunca Tooltip; Esc devolve o foco; texto exato em constante única | `labels.test.ts:240` (`VISIT_INFO_TEXT` `toBe(…)`); `StoreMovement.test.tsx:311`, `:327`; toque, Enter, Espaço e toque fora: `prova-em-navegador.md` | ✅ |
| VIS-09 | as quatro linhas por corte de texto; em UTC, `hoje='2026-10-21'` diz 21/10 | `labels.test.ts:63`, `:70`, `:76`, num `describe.each` de três fusos com sensor (`:256`); `packages/core/src/time/__tests__/format.test.ts:60`, `:66` | ✅ (B07, C04 mortos) |
| VIS-10 | relê ao montar, no foco, em `expira_em` (duração do servidor, piso 1 s) e no aviso do canal; aba não relê; "Atualizado às HHhMM"; adiantado 2 h ⇒ uma chamada; falha mantém | `useStoreMovement.test.ts:175`, `:195`, `:219`, `:245`, `:288`; **a linha na tela**: `StoreMovement.test.tsx:413` (conserto P2); `AdminDashboard.test.tsx:158`; `StoreMovement.test.tsx:212`; `labels.test.ts:126` | ✅ (B04, B05, B06, B29, X20, X23, X24, P2 mortos; S26 morto pelo probe `dia`) |
| VIS-11 | 2 colunas em 390; `R$ 99.999,99`/`9.999` sem quebrar; ≤2 linhas; sem rolagem horizontal; 44px | proxies `StoreMovement.test.tsx:349`, `:361` (token exato); medida em `prova-em-navegador.md` (390 e 1440) | ✅ (B28 morto) |
| VIS-12 | id de `randomUUID` em `{v:1,id,ate,em}`; não vai em outra requisição; só o dono cita a chave | `shared/lib/visits/__tests__/visitor.test.ts:63`, `:70`; guardas `visitanteComDonoUnico.test.ts:91`, `:95` e **`idDoVisitanteSoNoEnvio.test.ts:139`, `:143`, `:147`, `:153`** (conserto P1) | ✅ (V28, P1a, P1b mortos) |
| VIS-13 | corpo **exatamente** `{"id"}`; só a chave publicável; com sessão, `Authorization` ≠ token | `shared/lib/visits/__tests__/send.test.ts:68` (`Object.keys` `toEqual(['id'])`), `:76`, `:88`, `:94` | ✅ (V17, V18 mortos) |
| VIS-14 | `on conflict do nothing`; N simultâneas ⇒ 1 linha, todas `200`; `{dia, ate, agora}` inteiros, do banco | `supabase/functions/visit/__tests__/handlers.test.ts:427` (chaves `['p_id']`), `:436` (JSON inteiro); `visitas.sql` (repetida, inteiros); `concorrencia.sh` (rodado aqui) | ✅ (F08, F13, S22 mortos) |
| VIS-15 | `count(distinct)`; seg/ter/qua ⇒ 2/1/**2**; dom/seg ⇒ 1/1/1 | `visitas.sql` fixturas `a` e `c`; `vendas.sql` vis33 (>1.000 distintos); régua `visitasSchema.test.ts:684` | ✅ (S01, S02, S11 mortos) |
| VIS-16 | `ate = Date.now() + (ate − agora)`; janela `[em, ate)`; relógio que volta chama; adiantado 2 h + 5 navegações ⇒ ≤1; sem relógio = falha | `visits/__tests__/marker.test.ts:105`, `:111`, `:116`, `:122`, `:132`; `app/__tests__/VisitCounter.test.tsx:217`, `:229`, `:239`; `send.test.ts:116` | ✅ (V10, V11, X03, X04 mortos) |
| VIS-17 | no `App`, fora das `Routes` e da prévia; `requestIdleCallback` → `setTimeout` direto com `complete` → depois do `load`; nada síncrono | `VisitCounter.test.tsx:177`, `:187`, `:202`; `app/__tests__/contadorMontado.test.tsx:50`, `:56` | ✅ (V06, V12, V13, V24 mortos) |
| VIS-18 | 400/5xx/rede ⇒ sem marcador e no máximo mais UMA tentativa, na próxima navegação; 429 grava o prazo | `VisitCounter.test.tsx:256`, `:266` (5 falhas: 1 → 2 → 2), `:285`, `:293` | ✅ (V01, V19, V20 mortos) |
| VIS-19 | armazenamento que lança ou sem `randomUUID` ⇒ não registra, nada em memória | `visitor.test.ts:111-152`; **o componente montado**: `VisitCounter.test.tsx:566`, `:579`, sensor `:588` (conserto G5) | ✅ (V09 morto) — G5 da r1 fechado |
| VIS-20 | criação dentro de `navigator.locks.request('estrelinha-visitor')`, relendo dentro | `visitor.test.ts:156`, `:167` (a outra aba grava ⇒ usa ESSE id, `randomUUID` 0×), `:182`, `:194` | ✅ (V14 morto) |
| VIS-21 | JSON inválido, não-v4 (sem diferenciar maiúsculas), chave além de `id` ⇒ `400`, nada gravado | `handlers.test.ts:283` (15 corpos: `supabase.rpcs` `toEqual([])`, 400, log `inválido`), `:292` (maiúsculas) | ✅ (F04, C02, C06 mortos) |
| VIS-22 | não chama: não-produção, prévia, configuração carregando (espera), host interno, recusa, marca, `webdriver`, robô; não lê o GA4; GA4 desligado ⇒ chama; `localhost` com host de produção ⇒ não chama | `visits/__tests__/refusal.test.ts:34-79`; `VisitCounter.test.tsx:304`, `:311`, `:320`, **`:353`, `:367`** (conserto G6, com a página no host padrão), `:382`, `:389`, `:401`, `:410`, `:417`; guarda `contadorSemGa.test.ts:85` | ✅ (V03a/b, V06b, V07, V08, V08b, V08c, V22, V23, N7 mortos) — G6 da r1 fechado |
| VIS-23 | servidor: robô ⇒ `200 robô`; sem `Origin` ou host interno ⇒ `200 interno`; host lido pela function; 20 assinaturas com fixtura, 5 inversos | `handlers.test.ts:339-414`; `packages/core/src/visits/__tests__/bots.test.ts:72` (20), `:77`, `:87`, `:96`, `:106` | ✅ (F01, F02, F03, F14, C01, C05 mortos) |
| VIS-24 | `save(false)` apaga o `id` mantendo `ate`/`em`, na mesma ação; nenhuma chamada depois; resposta tardia não traz o id | `entities/cookie-consent/model/__tests__/cookieConsentStore.test.ts:157`; `VisitCounter.test.tsx:427`, `:439`; **a recusa durante a trava**: `:455`, `:483`, `:510`, sensor `:537` (conserto G4) | ⚠️ **lacuna G8** — o defeito G4 está consertado e provado (G4a, G4b, N8, V02, V03a, N6 mortos); a variante da recusa feita em **outra aba** durante a trava não tem teste (N3 vive) |
| VIS-25 | a decisão relê a escolha no instante da chamada; só registro válido; recusa em memória nunca desfeita | `cookieConsentStore.test.ts:184-252`; `VisitCounter.test.tsx:603`, `:614`, `:622` | ✅ para a chamada (V04, V05, X19 mortos) — a releitura **dentro da trava** é G8 |
| VIS-26 | Estatísticas sempre na folha; "Salvar escolhas" grava; `AVS-02` invertido; frase do Apêndice A | `widgets/cookie-notice/ui/__tests__/CookieNotice.test.tsx:235` (invertido), `:254`, `:194` (sem "anônim") | ✅ (V25 morto) |
| VIS-27 | 30/min por IP ⇒ `429 {dia, ate, agora}`; sem IP libera; `429` sem relógio = `limite`; reexport `toBe`; teto de 5.000 ⇒ `200 teto` | `handlers.test.ts:169`, `:210`, `:219`, `:232`, `:249`; `supabase/functions/_shared/__tests__/rateLimit.test.ts:85`; `teto.sql` | ✅ (F05, F09, F10, S13 mortos) |
| VIS-28 | RLS, `revoke all` dos três, nenhuma policy; só `service_role` executa; colunas exatas; `42501` | `visitasSchema.test.ts:226-326`, `:461-509` (o `describe.each` dos dois papéis); `papeis.sql` (32 `ok`) | ✅ (S15, S17, S32 mortos) |
| VIS-29 | uma linha de log por resposta (menos `OPTIONS`); 8 desfechos; sem id/IP/UA; não lê `Authorization`; `405 inválido`; **`verify_jwt = false`** | `handlers.test.ts:129` (`conferirLog`, chamado em todo caso), `:143`, `:154`, `:475`; **`:529`, `:535`, `:539-547`** (conserto G1) | ✅ (F06, F07, F11, F12, X01 mortos) — G1 da r1 fechado |
| VIS-30 | a gravação poda `day < store_day(p_agora) − 7`; os 8 dias ficam | `visitas.sql` `fixtura_poda` e `fixtura_futuro`; `visitasSchema.test.ts:443`, `:846` | ✅ (S12, S31 mortos) |
| VIS-31 | lista positiva por `paid_at` no dia de Brasília; (a)–(f) | `vendas.sql` savepoint `vis31` | ✅ (S04, S07, S07b mortos) |
| VIS-32 | soma em `numeric`, `round(…,2)` no banco: 33,33; 10,01; sem venda ticket `NULL` | `vendas.sql` savepoint `vis32` e o bloco "sem venda"; régua `visitasSchema.test.ts:761`, `:795` (backreference e `periodoCasado`, conserto H1) | ✅ (S08, S08b mortos — S08b agora pela régua) |
| VIS-33 | só escalares; dias como texto; `expira_em`/`lido_em`; `production_host`; `contagem_desde(_dia)`, `ultima_visita(_dia)` **— o dia de Brasília de cada um, decidido no banco**; `teto_dia`; faturamento `0`; `definer` + `has_role`; `execute` só a `authenticated`; >1.000 exatos | `vendas.sql` vis33; `papeis.sql`; `dia.sql:33` (`expira_em`); `visitasSchema.test.ts:858` (só os NOMES dos campos); tipo × saída real `useStoreMovement.test.ts:322` | ⚠️ **lacuna G7** — o "dia de Brasília" de `contagem_desde_dia` e `ultima_visita_dia` não tem fixtura (S24, S25 vivos no guarda e nos 5 probes). O resto está provado (S16, S18, S26, S29, S30 mortos) |
| VIS-34 | o literal do fuso UMA vez em `store_time_zone()`; formas proibidas recusadas; TS importa o dono, sem allowlist | `visitasSchema.test.ts:340-402`; `shared/lib/__tests__/fusoComDonoUnico.test.ts:129`, `:133` | ✅ (S03, V27 mortos) |
| VIS-35 *(assunção pendente)* | "Pedidos Hoje" e "Fat. Hoje" ausentes; 4 cards em `grid-cols-2 lg:grid-cols-4`; sem campo morto | `AdminDashboard.test.tsx:222`, `:230`, `:238`; `entities/stats/api/useAdminStats.test.ts:50`, `:71`, `:85` | ✅ (B02, B27 mortos) — **continua assunção pendente de confirmação do usuário** |
| VIS-36 | quatro parágrafos, os três antigos intactos, o do Apêndice A palavra por palavra | `pages/__tests__/PrivacyPolicyPage.test.tsx:299`, `:305`, `:311` | ✅ (V26 morto) |
| VIS-37 | o contador não existe sem o parágrafo | `pages/__tests__/politicaDoContador.test.ts:50`, `:55`, `:61` | ✅ (V26 morto) |
| VIS-38 | "Contando desde DD/MM às HHhMM" quando o período começa antes; fixture 21/10 15h32 ⇒ Ontem e Semana sim, Hoje não | tela: `labels.test.ts:144`, `:150`, `:155`; `StoreMovement.test.tsx:283`; dado (instante): `visitas.sql` `fixtura_instantes` (conserto G2) | ✅ tela e instante (B08, S19 mortos) — ⚠️ **G7** no `contagem_desde_dia` (S24 vivo) |
| VIS-39 | contador nunca usado ⇒ `—` e um dos dois textos, pelo host do banco | `labels.test.ts:118`, `:161`, `:168`, `:175`; `StoreMovement.test.tsx:249` | ✅ (B09, B12 mortos) |
| VIS-40 | "Última visita registrada: hoje/ontem/em DD/MM às HHhMM", contra o `hoje` do banco | tela: `labels.test.ts:189`, `:194`, `:199`; dado (instante): `visitas.sql` `fixtura_instantes` | ✅ tela e instante (B10, S20, S23 mortos) — ⚠️ **G7** no `ultima_visita_dia` (S25 vivo) |
| VIS-41 | nenhum literal do bloco diz "pessoas" ou "usuários" | `widgets/store-movement/__tests__/semPessoas.test.ts:43` | ✅ (B22 morto) |
| VIS-44 | o teto do dia no período aberto ⇒ a frase; aparece em Hoje e Semana, some em Ontem | `labels.test.ts:212`, `:219`, `:228`; `StoreMovement.test.tsx:267`; `teto.sql` | ✅ (B11, S18, S21, S29 mortos) |
| VIS-42 | `=1` grava a marca, apaga o id, tira o parâmetro por `replace` preservando os outros, avisa; `=0` desfaz; com a marca, nada; dono único em `core` | `VisitCounter.test.tsx:649`, `:668`, `:679`, e `:510` (durante a trava); `packages/core/src/visits/__tests__/optOut.test.ts:18-57`; `parametroNaoContarComDonoUnico.test.ts:114`, `:119`, `:123` | ✅ (V15, V16, V22, C03, B24 mortos) |
| VIS-43 | "Abrir a loja sem contar" com `optOutHref(storeOrigin(), true)`, nova aba, some sem `VITE_STORE_URL` | `widgets/admin-layout/ui/AccountMenu.test.tsx:93`, `:151`, `:162`, `:169` | ✅ (B24 — pelo guarda da loja —, B25 mortos) |

**Status**: 40 ACs provadas no valor da spec; **4 com lacuna** — VIS-24 (G8) e VIS-33, VIS-38,
VIS-40 (G7, só no dia derivado; a tela e os instantes estão provados). As duas notas de precisão da
r1 (VIS-10 e VIS-12) estão fechadas pelos consertos P2 e P1.

### Sensor de discriminação

**Método.** Arnês próprio (`sensor.mjs`, no diretório de rascunho da sessão, fora do repositório).
Para cada mutante: lê os bytes e o SHA-256 do arquivo REAL, exige que cada alvo apareça o número
**exato** de vezes declarado e **lança** se não achar ou se a troca não mudar nada — os 127 alvos
foram validados todos antes da primeira escrita —, grava um registro do que está mutado
(`EM-CURSO.json`), aplica, roda as suítes com o repórter JSON do vitest, restaura os bytes e confere
o SHA-256. Nada de `git stash`. Duas fases:

- **Fase A** — os arquivos de teste da feature no workspace dono (15 na loja, 10 no painel; a suíte
  inteira em `core` e `functions`). Para mutante de SQL: as **23** suítes da loja que leem
  `supabase/migrations` (953 casos) **e** os cinco probes transacionais (o `_comum.sql` reaplica o
  arquivo mutado do zero dentro da transação).
- **Fase B** — só para quem sobreviveu à A: a suíte INTEIRA do workspace dono e depois as vizinhas
  que podem pegá-lo (a loja carrega os guardas que varrem os dois apps, os pacotes e as functions).

**Classificação da morte**, lida do JSON: **asserção** (`AssertionError` e as asserções do
jest-dom), **consulta** (o Testing Library não acha o texto — uma asserção sobre o DOM), **erro**
(uma exceção: em F07 é o dublê que lança de propósito ao ler `Authorization` — o arame do arquivo —,
e em B17 é o teste lendo o esqueleto que o mutante removeu, ao lado de asserções),
**carga/compilação** (o arquivo de teste nem carregou) e **timeout**. Erro de um `mutar()` de sensor
que perdeu o alvo ("mutação não encontrou o alvo") é contado à parte como **incidental**: ele prova
que a linha mudou, não que a régua a recusou (lição 5 da r1). **Nenhum mutante morreu por
carga/compilação, nenhum por timeout, e nenhum morreu só de forma incidental.**

**Lote 1 — 127 mutantes de comportamento** (a coluna "Suíte" junta as fases A e B; os mutantes de
SQL mostram os dois lados, porque **os probes não rodam no CI**):

| # | Req. | Mutação (comportamento) | Arquivo | Suíte automatizada | Probes no banco local |
| --- | --- | --- | --- | --- | --- |
| S01 | VIS-15 | semana somando dias: count(visitor_id) no lugar de count(distinct) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — visitas por 'count(distinct)' em cada período (VIS…) + 1 sensor(es) do guarda perderam o alvo | **morto** — `visitas`: seg/ter/qua: Esta semana = 2, e NÃO 4; `vendas`: >1.000 visitas: Hoje 300, Ontem 1.200, Esta semana 1.500 (distintos, sem teto de 1.000) |
| S02 | VIS-15 | semana somando dias com o texto que o guarda procura intacto (recálculo depois do select) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `visitas`: seg/ter/qua: Esta semana = 2, e NÃO 4; `vendas`: >1.000 visitas: Hoje 300, Ontem 1.200, Esta semana 1.500 (distintos, sem teto de 1.000) |
| S03 | VIS-03/34 | fronteira de dia em UTC: store_day por UTC | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 2. o fuso — UM literal, dentro de 'store_time_zone', igual ao dono em …) + 2 sensor(es) do guarda perderam o alvo | **morto** — `dia`: 2026-10-21T02:59:59.900Z ⇒ 20/10 |
| S03b | VIS-03/34 | store_day por UTC com o texto 'at time zone public.store_time_zone()' intacto (ramo morto) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `dia`: 2026-10-21T02:59:59.900Z ⇒ 20/10 |
| S04 | VIS-31/34 | fronteira de dia em UTC só nas vendas: v_ini_hoje = v_hoje::timestamptz | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `vendas`: (a) pago às 00h10 de 21/10 conta em Hoje, e só ele |
| S05 | VIS-03 | semana começando no domingo (dow) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 2. formas proibidas de decidir o dia (VIS-34) › 'store_week_start' tru…) + 1 sensor(es) do guarda perderam o alvo | **morto** — `dia`: o domingo 18/10 está na semana iniciada em 12/10 |
| S06 | VIS-03 | semana começando no domingo, com o texto 'isodow … - 1' que o guarda procura intacto | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `dia`: o domingo 18/10 está na semana iniciada em 12/10 |
| S07 | VIS-31 | vendas contando pedido NÃO pago (pending entra) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) › ve…) | vivo (dia, visitas, vendas, teto, papeis) |
| S07b | VIS-31 | vendas contando estorno, com 'payment_status = 'approved'' intacto | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `vendas`: (f) 23h59:59.900 de 20/10 conta em Ontem; (b) (c) (d) (e) não contam |
| S08 | VIS-32 | ticket dividindo por zero (sem o case) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) › o …) + 4 sensor(es) do guarda perderam o alvo | **morto** — `dia`: division by zero; `visitas`: division by zero; `vendas`: division by zero; `teto`: division by zero; `papeis`: division by zero |
| S08b | VIS-32 | ticket de Hoje dividindo a soma da SEMANA | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) › o …) + 4 sensor(es) do guarda perderam o alvo | **morto** — `vendas`: 3 vendas que somam R$ 100,00 ⇒ ticket 33,33 |
| S10 | VIS-03/31 | Ontem fechado à direita nas duas expressões (<= 00:00 de hoje) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) › Ho…) | **morto** — `vendas`: pago EXATAMENTE às 00:00 de 21/10 (Brasília) ⇒ Hoje 1, Ontem 0, Semana 1 |
| S10b | VIS-03/32 | Ontem fechado à direita SÓ na soma do faturamento | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) › Ho…) | **morto** — `vendas`: o faturamento acompanha: R$ 50,00 em Hoje, 0 em Ontem |
| S11 | VIS-15 | v_desde = segunda-feira (numa segunda, Ontem perde o domingo) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `visitas`: dom/seg: Ontem = 1 |
| S12 | VIS-30 | poda de 7 em vez de 8 dias | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 3. prune_store_visits › apaga 'day < p_dia - 7' (hoje e os 7 anteriore…) + 1 sensor(es) do guarda perderam o alvo | **morto** — `visitas`: poda: os 8 dias (14/10 a 21/10) continuam lá |
| S13 | VIS-27 | teto diário off-by-one (> 5000) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo › o teto é 5.000 linhas no di…) + 1 sensor(es) do guarda perderam o alvo | **morto** — `teto`: a 5.001ª ⇒ desfecho 'teto' |
| S15 | VIS-28 | record_store_visit sem grant ao service_role | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. record_store_visit — definer, só o service_role › 'grant execute … …) + 2 sensor(es) do guarda perderam o alvo | **morto** — `papeis`: permission denied for function record_store_visit |
| S16 | VIS-33 | store_movement sem o portão has_role(admin) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — só admin, pela RPC › 'has_role(auth.uid(), 'admin'…) + 3 sensor(es) do guarda perderam o alvo | **morto** — `papeis`: authenticated recusado (42501): select public.store_movement() |
| S17 | VIS-28 | store_visits sem o revoke all | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 1. store_visits — RLS, revoke e nenhuma policy › 'revoke all' de publi…) + 1 sensor(es) do guarda perderam o alvo | **morto** — `papeis`: anon recusado (42501): select * from public.store_visits |
| S18 | VIS-44 | teto_dia sempre devolvido (fora do período aberto também) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) › 'tet…) | **morto** — `teto`: lido em 28/10 ⇒ teto_dia null (fora do período aberto) |
| S19 | VIS-38 | started_at recalculado a cada gravação | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo › o contador nasce com 'start…) + 3 sensor(es) do guarda perderam o alvo | **morto** — `visitas`: started_at = a PRIMEIRA gravação (10h), e não muda com a segunda |
| S20 | VIS-40 | last_recorded_at congelado | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo › o contador nasce com 'start…) + 3 sensor(es) do guarda perderam o alvo | **morto** — `visitas`: last_recorded_at = a última linha NOVA (12h); a repetida das 14h não conta |
| S21 | VIS-44 | o teto não anota capped_day | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo › o teto anota o dia em 'capp…) | **morto** — `teto`: 'capped_day' = 21/10 em store_visit_counter |
| S22 | VIS-14 | a visita repetida responde 'gravada' | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `visitas`: A de novo na segunda ⇒ repetida |
| S23 | VIS-40 | a visita REPETIDA também avança last_recorded_at (a última chamada, não a última linha nova) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `visitas`: last_recorded_at = a última linha NOVA (12h); a repetida das 14h não conta |
| S24 | VIS-33/38 | contagem_desde_dia pelo dia em UTC ('::date' na sessão) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S25 | VIS-33/40 | ultima_visita_dia pelo dia em UTC ('::date' na sessão) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S26 | VIS-33/10 | expira_em = o começo de HOJE (o timer da virada viraria laço) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 953 casos) | **morto** — `dia`: expira_em = a próxima 00:00 de Brasília |
| S29 | VIS-44 | teto_dia some quando o teto é no primeiro dia do período aberto (> v_desde) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) › 'tet…) | vivo (dia, visitas, vendas, teto, papeis) |
| S30 | VIS-33/39 | store_production_host cai no domínio próprio quando vazio (nunca '') | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 2. store_production_host — UMA leitura do host, com 'search_path' vazi…) | vivo (dia, visitas, vendas, teto, papeis) |
| S31 | VIS-30 | a poda da leitura por v_hoje puro (p_agora futuro apaga o presente) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) › poda…) + 1 sensor(es) do guarda perderam o alvo | **morto** — `visitas`: store_movement com p_agora em 2999 não apaga os 8 dias do presente |
| S32 | VIS-28 | store_clock sem grant ao service_role | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. store_clock — definer, só o service_role › 'grant execute … to serv…) + 2 sensor(es) do guarda perderam o alvo | **morto** — `papeis`: permission denied for function store_clock |
| F01 | VIS-23 | robô gravando (portão 4 desligado) | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar › user agent HeadlessChrome ⇒…) | — |
| F02 | VIS-23 | host interno contando no servidor (só a ausência de Origin recusa) | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar › origem de homologação https…) | — |
| F03 | VIS-23 | sem Origin contando no servidor | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar › sem 'Origin' ⇒ 'interno'…) | — |
| F04 | VIS-21 | id inválido / chave extra gravando (só JSON ilegível recusa) | `handlers.ts` | **morto — asserção** (10 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, 'inválido', nada gravado › sem 'id'…) | — |
| F05 | VIS-27 | sem IP vira balde único ('sem-ip') | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP › SEM IP, a 31ª chamada ⇒ 200 …) | — |
| F06 | VIS-29 | o log da gravação leva o id | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, 'inválido', nada gravado › UUID v4 em MAI…) | — |
| F07 | VIS-29 | o handler lê Authorization | `handlers.ts` | **morto — erro** (47 casos; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP › a 31ª chamada do mesmo IP no…) | — |
| F08 | VIS-14 | o handler manda p_agora (a borda decide o dia) | `handlers.ts` | **morto — asserção** (2 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, 'inválido', nada gravado › UUID v4 em MAI…) | — |
| F09 | VIS-27/16 | o 429 do cache devolve o 'agora' velho do cache | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP › a 31ª chamada do mesmo IP no…) | — |
| F10 | VIS-27 | teto por IP off-by-one (31 por minuto) | `rateLimit.ts` | **morto — asserção** (4 casos; ex.: `identify.test.ts` — identify — o teto por IP (IDN-09) › deixa passar 20 e recusa a seguint…) | — |
| F11 | VIS-29 | o 405 sai sem linha de log | `handlers.ts` | **morto — asserção** (3 casos; ex.: `handlers.test.ts` — VIS-29 — preflight e método › GET ⇒ 405, log 'inválido', nenhuma RPC…) | — |
| F12 | VIS-29 | o preflight OPTIONS registra linha de log | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-29 — preflight e método › OPTIONS ⇒ preflight com CORS, sem log e …) | — |
| F13 | VIS-27/29 | o desfecho 'teto' vira erro 500 | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-14 — a gravação › desfecho 'teto' é repassado com o dia e o prazo …) | — |
| F14 | VIS-23 | o relógio (e o host) dos portões 4–6 vem do CACHE quando há um | `handlers.ts` | **morto — asserção** (5 casos; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP › a 31ª chamada do mesmo IP no…) | — |
| C01 | VIS-23 | robô por prefixo (startsWith) em vez de substring | `bots.ts` | **morto — asserção** (16 casos; ex.: `bots.test.ts` — isBotUserAgent › Googlebot é robô…) | — |
| C02 | VIS-21 | uma chave extra no corpo aceita | `visitor.ts` | **morto — asserção** (5 casos; ex.: `visitor.test.ts` — visitBodyRefusal — o que o servidor recusa › chave extra 'force' ⇒ 'ch…) | — |
| C03 | VIS-42/43 | o link liga quando devia desligar | `optOut.ts` | **morto — asserção** (3 casos; ex.: `optOut.test.ts` — optOutHref — o link que o painel abre › ligar ⇒ '/?nao-contar=1' na or…) | — |
| C04 | VIS-09 | o dia escrito por new Date (meia-noite UTC vira o dia anterior) | `format.ts` | **morto — asserção** (2 casos; ex.: `format.test.ts` — no fuso de processo America/Sao_Paulo › formatDayMonth escreve DD/MM p…) | — |
| C05 | VIS-23 | regex ingênua /bot/i somada à lista (o Cubot vira robô) | `bots.ts` | **morto — asserção** (1 caso; ex.: `bots.test.ts` — isBotUserAgent › CUBOT_X30 NÃO é robô…) | — |
| C06 | VIS-21 | UUID v4 diferenciando maiúsculas | `visitor.ts` | **morto — asserção** (2 casos; ex.: `visitor.test.ts` — isVisitorId — UUID v4 › aceita v4, inclusive em maiúsculas…) | — |
| C07 | VIS-10/38/40 | a hora escrita no fuso do APARELHO (sem timeZone) | `format.ts` | **morto — asserção** (6 casos; ex.: `format.test.ts` — no fuso de processo UTC › formatStoreHour escreve a hora de Brasília e…) | — |
| V01 | VIS-18 | marcador gravado ANTES do sucesso (otimista, antes do POST) | `VisitCounter.tsx` | **morto — asserção** (6 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha › 500 ⇒ sem prazo; UMA tentativa a mais na próxima na…) | — |
| V02 | VIS-24 | a recusa de cookies não apaga o id | `cookieConsentStore.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-24 — a recusa com a store REAL › save(false) + navegar (já no dia …) | — |
| V03a | VIS-24/22 | a recusa de cookies não para o contador (statistics fixo em true na fiação) | `VisitCounter.tsx` | **morto — asserção** (6 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › Estatísticas recusada ⇒ nenhuma chamada, e…) | — |
| V03b | VIS-22/24 | a decisão pura ignora a recusa de Estatísticas | `refusal.ts` | **morto — asserção** (7 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › Estatísticas recusada ⇒ nenhuma chamada, e…) | — |
| V04 | VIS-25 | a recusa feita em outra aba é ignorada (sem syncFromStorage) | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-25 — a recusa feita em outra aba › aba A com statistics em memória…) | — |
| V05 | VIS-25 | a releitura aplica armazenamento ausente (volta a "aceito") | `cookieConsentStore.ts` | **morto — asserção** (3 casos; ex.: `cookieConsentStore.test.ts` — VIS-25 — syncFromStorage relê a escolha feita em outra aba › armazenam…) | — |
| V06 | VIS-22 | o contador montado também na prévia | `App.tsx` | **morto — asserção** (2 casos; ex.: `contadorMontado.test.tsx` — VIS-17 — o contador está montado no App › âncora: o App foi lido e a f…) | — |
| V06b | VIS-22 | a decisão pura conta na prévia | `refusal.ts` | **morto — asserção** (1 caso; ex.: `refusal.test.ts` — VIS-22 — a decisão de contar › janela de prévia do painel ⇒ não conta…) | — |
| V07 | VIS-22 | a decisão pura conta em host interno | `refusal.ts` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › host de produção configurado e a loja em l…) | — |
| V08 | VIS-22 | a decisão pura ignora webdriver | `refusal.ts` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › navigator.webdriver ⇒ nenhuma chamada…) | — |
| V08b | VIS-22 | webdriver ignorado na fiação | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › navigator.webdriver ⇒ nenhuma chamada…) | — |
| V08c | VIS-22/23 | a decisão pura ignora o user agent de robô | `refusal.ts` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › user agent de robô ⇒ nenhuma chamada…) | — |
| V09 | VIS-19 | sem id (armazenamento que não grava), chama assim mesmo | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-19 — o componente montado sem armazenamento que grava (conserto G5…) | — |
| V10 | VIS-16 | o prazo guardado é o do relógio do SERVIDOR (sem converter por duração) | `visitor.ts` | **morto — asserção** (2 casos; ex.: `marker.test.ts` — saveClock — o prazo no relógio LOCAL, por duração › grava 'ate = Date.…) | — |
| V11 | VIS-16 | relógio que voltou não chama de novo | `visitor.ts` | **morto — asserção** (1 caso; ex.: `marker.test.ts` — markerAllowsCall — VIS-16 › 'agora < em' (o relógio voltou) ⇒ chama…) | — |
| V12 | VIS-17 | tentativa síncrona na montagem (fora do agendador) | `VisitCounter.tsx` | **morto — asserção** (8 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico › nenhum fetch antes de o agendador d…) | — |
| V13 | VIS-17 | sem requestIdleCallback, a troca de rota espera um load que não vem | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico › sem requestIdleCallback e com o doc…) | — |
| V14 | VIS-20 | dentro da trava, ignora o id que já está gravado (cria outro) | `visitor.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo › passado o prazo (virou o dia), a nave…) | — |
| V15 | VIS-42 | ?nao-contar sai do endereço com entrada nova no histórico (push) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL › =1: grava a marca, apag…) | — |
| V16 | VIS-42 | ?nao-contar=1 não apaga o id | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL › =1: grava a marca, apag…) | — |
| V17 | VIS-13 | o corpo leva uma chave a mais (o dia do aparelho) | `send.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo › 5 navegações ⇒ 1 chamada; o marcador …) | — |
| V18 | VIS-13 | o envio leva os cookies (credentials include) | `send.ts` | **morto — asserção** (1 caso; ex.: `send.test.ts` — VIS-13 — o pedido › sem cookies (credentials omit) e sem keepalive…) | — |
| V19 | VIS-18 | duas tentativas a mais em vez de uma | `VisitCounter.tsx` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha › 500 ⇒ sem prazo; UMA tentativa a mais na próxima na…) | — |
| V20 | VIS-18/16 | 429 com relógio tratado como falha | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha › 429 com relógio ⇒ grava o prazo e não tenta mais no…) | — |
| V22 | VIS-42/22 | a marca de não contar ignorada na fiação | `VisitCounter.tsx` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › a marca de não contar ⇒ nenhuma chamada…) | — |
| V23 | VIS-22 | não espera store_settings (settingsLoaded sempre true na fiação) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › com a página NO HOST PADRÃO (conserto G6 d…) | — |
| V24 | VIS-22/17 | a chegada da configuração não reagenda (deps só pathname) | `VisitCounter.tsx` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico › sem requestIdleCallback e com o doc…) | — |
| V25 | VIS-26 | "Salvar escolhas" ignora o interruptor de Estatísticas | `CookiePreferencesSheet.tsx` | **morto — asserção** (2 casos; ex.: `CookieNotice.test.tsx` — a folha "Preferências de cookies" (AVS-04) › medição DESLIGADA: "Salva…) | — |
| V26 | VIS-36/37 | a política diz 90 dias | `PrivacyPolicyPage.tsx` | **morto — asserção** (5 casos; ex.: `PrivacyPolicyPage.test.tsx` — PrivacyPolicyPage — a medição de audiência (PRV-01) › tem exatamente q…) | — |
| V27 | VIS-34 | o fuso escrito à mão fora do dono | `orderMeta.ts` | **morto — asserção** (3 casos; ex.: `fusoComDonoUnico.test.ts` — VIS-34 — o fuso da loja tem um dono só em TypeScript › só o dono escre…) | — |
| V28 | VIS-12 | a chave do visitante escrita fora do dono | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `visitanteComDonoUnico.test.ts` — VIS-12 — as chaves do contador têm um dono só › só o dono cita as chav…) | — |
| X02 | VIS-24 | sem a decisão DE REDE depois da trava (a recusa que chega entre a trava e o POST) | `VisitCounter.tsx` | vivo (store: 279, store: 5717 casos) | — |
| X03 | VIS-16 | sem a trava de "uma em voo" | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo › uma chamada em voo por vez: navegar c…) | — |
| X04 | VIS-16/18 | resposta com 'ate' e sem 'agora' aceita como relógio | `send.ts` | **morto — asserção** (1 caso; ex.: `send.test.ts` — VIS-16/VIS-18 — a resposta › agora ausente ⇒ sem relógio (conta como f…) | — |
| X19 | VIS-25 | sem a marca memoriaSemGravar (o aceite antigo desfaz a recusa) | `cookieConsentStore.ts` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-25 — a recusa feita em outra aba › gravação que lança + recusa + n…) | — |
| G4a | VIS-24/42 | conserto G4 desfeito na fiação: ensureVisitorId sem a decisão (sonda R01) | `VisitCounter.tsx` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera › tra…) | — |
| G4b | VIS-24/42 | conserto G4 desfeito no módulo: criarOuLer não pergunta 'podeSeguir' | `visitor.ts` | **morto — asserção** (7 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera › tra…) | — |
| N3 | VIS-24/25 | a decisão DENTRO da trava sem syncFromStorage (recusa de outra aba durante a trava) | `VisitCounter.tsx` | vivo (store: 279, store: 5717 casos) | — |
| N6 | VIS-24 | esquecer o id apaga também o prazo (reaceitar no mesmo dia conta de novo) | `visitor.ts` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera › id …) | — |
| N7 | VIS-22 | a decisão pura não espera a configuração (sem 'esperando') | `refusal.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama › com a página NO HOST PADRÃO (conserto G6 d…) | — |
| N8 | VIS-24/42 | a decisão da trava avaliada ANTES de pedir a trava (congelada) | `VisitCounter.tsx` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera › tra…) | — |
| P1a | VIS-12 | a store de cookies passa a trazer 'readMarker' | `cookieConsentStore.ts` | **morto — asserção** (2 casos; ex.: `idDoVisitanteSoNoEnvio.test.ts` — VIS-12 — o id do navegador só viaja pela function 'visit' › âncora: o …) | — |
| P1b | VIS-12 | um widget passa a trazer 'ensureVisitorId' pelo barril | `CookiePreferencesSheet.tsx` | **morto — asserção** (1 caso; ex.: `idDoVisitanteSoNoEnvio.test.ts` — VIS-12 — o id do navegador só viaja pela function 'visit' › só 'app/Vi…) | — |
| B01 | VIS-06 | erro de leitura vira ZERO (o painel mostra 0 em vez do erro) | `useStoreMovement.ts` | **morto — asserção + consulta** (3 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) › o '{ error }' do supab…) | — |
| B02 | VIS-35 | o card "Pedidos Hoje" de volta | `AdminDashboard.tsx` | **morto — asserção** (2 casos; ex.: `AdminDashboard.test.tsx` — VIS-35 — saem "Pedidos Hoje" e "Fat. Hoje" › o Dashboard renderizado n…) | — |
| B03 | VIS-01 | o Dashboard não monta o bloco | `AdminDashboard.tsx` | **morto — consulta** (9 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do 'PageHeader' › a raiz da…) | — |
| B04 | VIS-10d | o canal depende do callback (recria a cada render) | `useOrdersRealtime.ts` | **morto — asserção** (4 casos; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras › o Dashboard montad…) | — |
| B05 | VIS-10c | a virada medida pelo relógio da dona (expira_em − Date.now()) | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c)…) | — |
| B06 | VIS-10c | a virada sem o piso de 1 s | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c)…) | — |
| B07 | VIS-09 | a linha de Hoje escrita por new Date | `labels.ts` | **morto — consulta + asserção** (28 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do 'PageHeader' › a raiz da…) | — |
| B08 | VIS-38 | "Contando desde" some no dia da contagem (>=) | `labels.ts` | **morto — asserção + consulta** (4 casos; ex.: `labels.test.ts` — no fuso de processo UTC › VIS-38 — "Contando desde", quando o período …) | — |
| B09 | VIS-39 | o host do texto escrito à mão (não o do banco) | `labels.ts` | **morto — asserção** (6 casos; ex.: `labels.test.ts` — no fuso de processo UTC › VIS-39 — o contador sem nenhuma visita regis…) | — |
| B10 | VIS-40 | "hoje" comparado com o relógio do navegador | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC › VIS-40 — a última visita, comparada com o 'h…) | — |
| B11 | VIS-44 | o teto aparece em toda aba | `labels.ts` | **morto — asserção** (10 casos; ex.: `StoreMovement.test.tsx` — VIS-07, VIS-39, VIS-44 — o que se desenha › o teto atingido hoje apare…) | — |
| B12 | VIS-39 | contador nunca usado mostra 0 | `labels.ts` | **morto — asserção** (4 casos; ex.: `labels.test.ts` — no fuso de processo UTC › VIS-07 — os valores › VIS-39: contador nunca…) | — |
| B13 | VIS-07/32 | o ticket recalculado na tela | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC › VIS-07 — os valores › Visitas e Vendas intei…) | — |
| B14 | VIS-05 | sem aria-busy na primeira carga | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-05 — carregando › resposta segurada: esqueleto nos quatro cards, '…) | — |
| B15 | VIS-06 | erro na primeira carga não mostra a mensagem | `StoreMovement.tsx` | **morto — consulta** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha › primeira carga com '{ error }': UMA mensage…) | — |
| B16 | VIS-10/06 | releitura que falha esconde os valores | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha › releitura que FALHA com dados na tela: os v…) | — |
| B17 | VIS-05 | o StatCard mostra o valor enquanto carrega | `StatCard.tsx` | **morto — asserção + erro** (3 casos; ex.: `StatCard.test.tsx` — StatCard — carregando e ⓘ (feature 71) › carregando: nenhum '<p>' de v…) | — |
| B19 | VIS-06 | três novas tentativas em vez de uma | `useStoreMovement.ts` | **morto — asserção + consulta** (3 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) › o '{ error }' do supab…) | — |
| B22 | VIS-41 | o rótulo vira "Pessoas únicas" | `StoreMovement.tsx` | **morto — consulta + asserção** (5 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do 'PageHeader' › o bloco é…) | — |
| B23 | VIS-04 | a RPC passa a receber a data do navegador | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) › chama a RPC 'store_mov…) | — |
| B24 | VIS-42/43 | o link "sem contar" escrito à mão (fora de optOutHref) | `AccountMenu.tsx` | **morto — asserção** (só na fase B, suíte `store`) (2 casos; ex.: `parametroNaoContarComDonoUnico.test.ts` — VIS-42 — o parâmetro de "não contar" tem um dono só › fora do dono (e …) | — |
| B25 | VIS-43 | "Abrir a loja sem contar" não some sem VITE_STORE_URL | `AccountMenu.tsx` | **morto — asserção** (2 casos; ex.: `AccountMenu.test.tsx` — AccountMenu — os itens › sem 'VITE_STORE_URL', "Abrir a loja" não é of…) | — |
| B26 | VIS-10d | o aviso do canal não relê o movimento | `AdminDashboard.tsx` | **morto — asserção** (1 caso; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras › o aviso do canal r…) | — |
| B27 | VIS-35 | useAdminStats volta a carregar 'ordersToday' (campo morto) | `useAdminStats.ts` | **morto — asserção** (1 caso; ex.: `useAdminStats.test.ts` — VIS-35 — o hook não calcula mais "hoje" em UTC › o objeto devolvido nã…) | — |
| B28 | VIS-11 | a TabsList perde o h-auto | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-11 — os proxies de layout, por token exato › grade em 2 colunas no…) | — |
| B29 | VIS-10c | o timer da virada nunca é agendado | `useStoreMovement.ts` | **morto — asserção** (4 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c)…) | — |
| X20 | VIS-10d | o aviso do canal chama a seta da primeira montagem | `useOrdersRealtime.ts` | **morto — asserção** (1 caso; ex.: `useOrdersRealtime.test.ts` — useOrdersRealtime — o canal de pedidos do Dashboard › o aviso chama o …) | — |
| X23 | VIS-10b | o foco da janela não relê | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — foco da janela (VIS-10 b) › a janela volta a ter fo…) | — |
| X24 | VIS-10b | staleTime de 1 min (o foco não relê dado "fresco") | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — foco da janela (VIS-10 b) › a janela volta a ter fo…) | — |
| P2 | VIS-10 | o widget guarda a PRIMEIRA leitura (a linha não troca na virada) | `StoreMovement.tsx` | **morto — asserção + consulta** (2 casos; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras › o aviso do canal r…) | — |
| X01 | VIS-29 | [functions.visit] com verify_jwt = true | `config.toml` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-29 — '[functions.visit]' com 'verify_jwt = false' no 'config.toml'…) + 3 sensor(es) do guarda perderam o alvo | — |

**Lote 2 — 9 execuções dirigidas aos quatro sobreviventes do lote 1** (as sondas e a fixtura estão
no apêndice; cada sonda só ACRESCENTA um caso no fim de `VisitCounter.test.tsx`, restaurado byte a
byte):

| # | Req. | Execução | Arquivo | Suíte automatizada | Probes no banco local |
| --- | --- | --- | --- | --- | --- |
| E-limpo | VIS-33 | CONTROLE: só um comentário muda — a fixtura dos dias do contador tem de PASSAR | `20261021120000_71-visitas-unicas.sql` | vivo (store: 151 casos) | vivo (dia, visitas, vendas, teto, papeis, dias-do-contador) |
| E24 | VIS-33/38 | S24 contra a fixtura dos dias do contador (verificador) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 151 casos) | **morto** — `dias-do-contador`: contagem_desde_dia = 20/10 (23h59:59 de Brasília), e não 21/10 (o dia em UTC) |
| E25 | VIS-33/40 | S25 contra a fixtura dos dias do contador (verificador) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 151 casos) | **morto** — `dias-do-contador`: ultima_visita_dia = 21/10 (22h30 de Brasília) — "ontem" no painel —, e não 22/10 (o dia em |
| R2-N3-limpo | VIS-24/25 | SONDA N3 sozinha (o código atual tem de PASSAR) | `VisitCounter.test.tsx` | vivo (store: 41 casos) | — |
| R2-N3+N3 | VIS-24/25 | SONDA N3 + mutante N3 (tem de REPROVAR) | `VisitCounter.test.tsx`, `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — SONDA r2 (verificador) — recusa feita em OUTRA aba enquanto a trava do…) | — |
| R2-X02-limpo | VIS-24 | SONDA X02 sozinha (o código atual tem de PASSAR) | `VisitCounter.test.tsx` | vivo (store: 41 casos) | — |
| R2-X02+X02 | VIS-24 | SONDA X02 + mutante X02 (tem de REPROVAR) | `VisitCounter.test.tsx`, `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — SONDA r2 (verificador) — recusa entre o nascimento do id e o envio › a…) | — |

**Leitura do sensor.**

- **Lote 1: 127 mutantes — 123 mortos, 4 vivos em tudo.** Dos 95 de TypeScript e configuração, 93
  morrem por asserção (92 já na fase A, nos testes da feature; B24 só na fase B, pelo guarda
  `parametroNaoContarComDonoUnico` da suíte da loja, que é onde ele mora) e 2 sobrevivem às duas
  fases (**X02**, **N3**). Dos 32 de SQL, 21 morrem pela régua do guarda (18 deles também pelos
  probes; S07, S29 e S30 só pelo guarda), 9 só pelos probes e 2 sobrevivem ao guarda **e** aos cinco
  probes (**S24**, **S25**).
- **Todos os pedidos explícitos da tarefa morreram por asserção**: semana somando dias (S01, S02),
  fronteira de dia em UTC (S03, S03b, S04), semana no domingo (S05, S06), marcador gravado antes do
  sucesso (V01), recusa de cookies que não apaga ou não para (V02, V03a, V03b, V04, G4a, G4b, N6,
  N8), prévia e host interno contando (V06, V06b, V07, F02, F03, F14), robô gravando (V08, V08b,
  V08c, F01, C01, C05), id inválido gravando (F04, C02, C06), venda de pedido não pago (S07, S07b),
  ticket dividindo por zero (S08), erro de leitura virando 0 (B01), cards antigos de volta (B02, B27)
  e o Dashboard sem o bloco (B03). **A exceção é a mesma família de "fronteira de dia em UTC" aplicada
  a um campo que nenhum probe olha na hora certa: S24 e S25** (G7).
- **S07 só morre pelo guarda, e isso não é lacuna**: um pedido com `payment_status = 'pending'`
  nunca tem `paid_at` (a coluna nasce na aprovação), então o próprio predicado de `paid_at` já o
  exclui — a mutação `in ('approved','pending')` é quase equivalente no dado. A irmã que importa,
  S07b (estorno), morre no probe.
- **Os 9 que só o probe mata** (S02, S03b, S04, S06, S07b, S11, S22, S23, S26) são o risco que o
  autor declarou no `tasks.md` (*Consertos da verificação r1*) e no handoff: a régua estática prende a
  FORMA do SQL e os probes, que provam o comportamento, não rodam no CI. Eram 7 na r1; S08b saiu da
  lista (H1 o pôs na régua) e entraram três mutantes novos desta rodada (S03b, S23, S26).
- **X02 é equivalente na prática — não é lacuna** (ver *Observações*). **N3, S24 e S25 não são**: o
  lote 2 mostra, para os três, um cenário real em que o mutante muda o que a cliente ou a dona vê, e
  uma prova que passa no código de hoje e reprova o mutante.
- **Os mutantes dos consertos da r1 morrem todos pela régua**, nunca só por incidental: X01 (G1),
  S19/S20 (G2), S10/S10b (G3), G4a/G4b/N8 (G4), V09 (G5), V23/N7 (G6), P1a/P1b (P1), P2 (P2), S08b
  (H1).

### Lacunas, em ordem de severidade — e o conserto de cada uma

> **Nenhuma é defeito do comportamento medido.** Nas duas, a prova deste verificador passa no código
> atual (E-limpo: 4 `ok`; R2-N3-limpo: verde) e reprova o mutante (E24, E25, R2-N3+N3). São
> afirmações da spec que **nenhum teste ou probe do repositório discrimina** — o que o `validate.md`
> manda transformar em tarefa de conserto antes de fechar.

**G7 · `VIS-33` (e o dado de `VIS-38` e `VIS-40`) — `contagem_desde_dia` e `ultima_visita_dia` não
têm fixtura na faixa em que o dia de Brasília difere do dia em UTC (S24 e S25 sobrevivem ao guarda e
aos cinco probes).**
- A spec manda: "`contagem_desde_dia` e `ultima_visita_dia` (o dia de Brasília de cada um, decidido
  no banco)". O código está certo (`public.store_day(v_inicio)::text`,
  `20261021120000_71-visitas-unicas.sql:327` e `:329`).
- Os mutantes: `v_inicio::date::text` e `v_ultima::date::text` — a simplificação natural, que decide
  o dia pelo fuso da SESSÃO (UTC no banco local e no hospedado). O guarda recusa `now()::date` e
  `paid_at::date`, mas não `::date` em geral, e para estes dois campos confere só o NOME
  (`visitasSchema.test.ts:858`). A fixtura dos instantes do conserto G2 grava às 10h e às 12h UTC,
  quando os dois dias coincidem — `store_day(x)` e `x::date` escrevem o mesmo texto.
- O que a dona veria, entre 21h e 24h de Brasília: uma visita às 22h30 de 21/10, lida na manhã de
  22/10, sairia "Última visita registrada: **hoje** às 22h30"; lida às 23h de 21/10, sairia "em
  **22/10** às 22h30" — uma data no futuro. "Contando desde" erraria igual: um contador que começou às
  22h30 de 21/10 apareceria em Hoje (22/10) como "Contando desde 22/10 às 22h30". O sinal que a spec
  criou para separar "zero visitas" de "contador quebrado" (`VIS-40`) erraria o dia sempre que a
  última visita registrada fosse entre 21h e 24h.
- Prova: `dias-do-contador.sql` (no apêndice) — primeira visita às 23h59:59 de 20/10 (02:59:59Z) e a
  última às 22h30 de 21/10 (01:30Z de 22/10), lido às 00h30 de 22/10 — passa no código atual (E-limpo,
  4 `ok`) e mata S24 e S25 com a frase exata (E24, E25).
- Conserto: levar a fixtura para `probes/visitas.sql` (ou um probe novo, com o mesmo preâmbulo), e
  acrescentar ao guarda uma régua por campo — `'contagem_desde_dia', public.store_day(v_inicio)::text`
  e `'ultima_visita_dia', public.store_day(v_ultima)::text` — ou recusar `::date` aplicado a
  `timestamptz` fora de `store_day`, com S24/S25 como sensores.

**G8 · `VIS-24` (e `VIS-25`) — a decisão refeita DENTRO da trava relê a recusa feita em OUTRA aba, e
nenhum teste prova isso (N3 sobrevive à suíte inteira da loja).**
- O conserto G4 é a pergunta `podeSeguir` dentro de `navigator.locks` (`VisitCounter.tsx:82` →
  `visitor.ts:123`), e ela é `podeChamar`, que chama `syncFromStorage()` antes de decidir. O mutante
  N3 troca por `visitRefusal(contexto(cfg)) === null` — a mesma decisão **sem** reler o armazenamento.
- Por que passa: os quatro casos do conserto (`VisitCounter.test.tsx:455`, `:483`, `:510`, `:537`)
  fazem a recusa na MESMA aba — `save(false)` muda a memória na hora, e a decisão sem releitura também
  recusa. A recusa feita em **outra** aba só existe no armazenamento compartilhado. E a trava espera de
  verdade: o callback de `navigator.locks.request` roda num passo seguinte, depois de a trava ser
  concedida — é a janela do G4.
- O que acontece com N3: a outra aba recusa (e o `forgetVisitorId` dela apaga o código do
  armazenamento); a trava solta; a decisão lê a memória desta aba, ainda "aceito"; um código **novo**
  é criado e gravado; só então a decisão de rede (`:85`, que relê) recusa a chamada. Fica no navegador
  um código criado depois da recusa — o defeito G4 da r1, pela outra porta. O Apêndice A promete que
  desligar Estatísticas "apaga o código do seu navegador".
- Prova: a sonda R2-N3 (no apêndice) passa no código atual e reprova com N3 (`expected 'e3bf9b43-…'
  to be null`).
- Conserto: levar a sonda para o bloco `VIS-24/VIS-20` de `VisitCounter.test.tsx`.
- Severidade: baixa (duas abas, uma janela de milissegundos) — o comportamento atual está certo; falta
  a prova, e é a prova que impede a releitura de sumir num refator de `podeChamar`.

### Observações (sem conserto exigido)

- **X02 — a decisão de rede depois da trava (`VisitCounter.tsx:85`) é defesa redundante, e o mutante
  que a remove é equivalente na prática.** Depois do conserto G4, entre a decisão de dentro da trava
  e a de rede não há passo de tarefa: a criação é síncrona, e a promessa de `locks.request` resolve
  por reação à promessa do callback (microtarefa), assim como os dois `await` seguintes. Uma recusa da
  mesma aba não cabe no meio; a de outra aba teria microssegundos. A sonda R2-X02 só separa os dois
  mundos com uma trava que resolve **num passo seguinte** ao callback — passa no código atual e
  reprova com X02 —, e nenhum navegador implementa a trava assim. O comentário da linha 84 já diz que
  ela é "a última palavra". Manter a linha é barato; exigir teste dela seria travar um modelo de
  concorrência que não existe.
- **A nota de fecho D1 sobre `act()` está imprecisa**: dos 8 avisos da suíte da loja, 2 são *"An
  update to VisitCounter …"*, emitidos por `src/app/__tests__/analytics.test.tsx` (ele monta o `App`
  inteiro, e o contador vem junto). O arquivo é anterior à `71`; os dois avisos não. É ruído de
  console — os casos passam —, mas a frase "os 8 avisos que restam são de outros arquivos, anteriores
  à `71`" não é verdade sobre os avisos.
- **`falhas` do contador nunca zera numa aba**: uma falha num dia e outra dias depois, na mesma aba
  aberta, encerram as tentativas daquela aba até recarregar. A spec diz "a mesma aba SHALL tentar no
  máximo mais uma vez" sem dizer por quanto tempo vale a conta, então não é desvio — fica registrado
  para quem um dia mexer no `FALHAS_MAX`.
- **Incidente do arnês desta rodada, por transparência.** (1) No primeiro disparo o diretório de
  saída foi passado RELATIVO, e o `pnpm --filter … exec vitest` o resolve dentro do workspace: o
  relatório JSON do primeiro mutante foi escrito em `apps/store/sensor-r2/`. Interrompi o arnês, apaguei
  a pasta, e o arnês passou a exigir caminho absoluto e fora do repositório. (2) A interrupção pegou o
  mutante S02 aplicado: o arquivo da migration ficou com uma linha a mais por cerca de um minuto.
  Restaurei do backup tirado antes do disparo (`tar` dos 97 arquivos) e conferi o SHA-256 dos 97
  (97/97) e o `git status` (59 linhas, igual ao começo). O banco não foi afetado — os probes rodam em
  `begin … rollback`, e o estado foi conferido. (3) No lote 2, o primeiro disparo passou ao `psql` um
  caminho errado para a fixtura extra: `psql` saiu ≠ 0 com *No such file*, o que o arnês leria como
  "probe matou o mutante". Pegou porque a mensagem de falha veio vazia; o arnês passou a **lançar**
  quando o arquivo do probe não existe, e a execução de CONTROLE (E-limpo, só um comentário mudado)
  prova que a fixtura roda e passa antes de qualquer morte valer. As linhas E24/E25 da tabela acima
  são do disparo corrigido. Nada de commit, stash ou push em momento nenhum.

### Casos de borda da spec

- [x] Duas chamadas simultâneas ⇒ uma linha, as duas `200` — `concorrencia.sh` (rodado aqui).
- [x] Aba aberta da noite para a manhã ⇒ a navegação depois de `ate` registra o dia novo
  (`VisitCounter.test.tsx:229`); o Dashboard troca "Hoje, 21/10" por "Hoje, 22/10" no instante
  `expira_em`, **agora provado no widget** (`StoreMovement.test.tsx:413`).
- [x] Relógio que volta ⇒ chama de novo (`marker.test.ts:116`).
- [x] `production_host` vazio ⇒ tudo interno, nada gravado, o painel diz que está parado
  (`refusal.test.ts:72`, `handlers.test.ts:397`, `labels.test.ts:168`, `VisitCounter.test.tsx:367`).
- [x] Loja no `.vercel.app` com o host do domínio próprio ⇒ `interno` (`handlers.test.ts:373`), e o
  painel diz em que endereço conta (`labels.test.ts:161`).
- [x] Leitura de `store_settings` que falha na loja ⇒ o servidor decide pelo host do banco
  (`handlers.test.ts:387`).
- [x] Ids forjados enchendo o teto ⇒ `teto` e `capped_day`, e o painel avisa (`teto.sql`,
  `labels.test.ts:212`).
- [x] Paga ontem e cancelada hoje ⇒ sai de Ontem (`vendas.sql` (c)).
- [x] Venda com zero visita ⇒ os dois números como vierem (nenhum cálculo cruzado no painel).
- [x] Recusa e reaceite no mesmo dia ⇒ não conta de novo (o prazo fica: `cookieConsentStore.test.ts:157`,
  `VisitCounter.test.tsx:483`, `marker.test.ts:105`) — ⚠️ a recusa vinda de outra aba durante a trava é G8.
- [x] O mesmo id depois de 8 dias ⇒ conta como novo para o banco (`visitas.sql` `fixtura_poda`).

### Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo / sem escopo a mais | ✅ — os consertos tocaram só o que as lacunas pediam: `visitor.ts` e `VisitCounter.tsx` (G4) em produção, o resto é teste, probe e documento |
| Mudanças cirúrgicas | ✅ — `ensureVisitorId(podeSeguir?)` é aditivo e opcional; o único chamador passa a decisão |
| Padrões do repositório | ✅ — guardas com âncora, sensores e `mutar()` que lança; régua com backreference em vez de afrouxar; `jsdom.reconfigure` em vez de dublar `window.location` |
| Checagem ancorada na spec | ⚠️ — 40 de 44 no valor da spec; 4 com lacuna (G7, G8) |
| Cobertura por camada | ⚠️ — regra pura e fiação do componente cobertas, inclusive os consertos; SQL com dois campos derivados sem fixtura de fronteira (G7); a releitura entre abas dentro da trava sem caso (G8) |
| Todo teste mapeia uma AC, caso de borda ou "done when" | ✅ |
| Diretrizes do projeto (`CLAUDE.md` raiz e dos módulos) | ✅ — baselines do `CLAUDE.md` raiz (14338/700, lint 25/7) e do `apps/backoffice/CLAUDE.md` batem com o medido; chaves `estrelinha-visitor` e `estrelinha-nao-contar` na lista; "a próxima é a `72`" |

### Rastreabilidade (proposta para a `spec.md`)

| Requisito | Depois da r1 | Depois desta rodada |
| --- | --- | --- |
| VIS-03 | Needs fix (G3) | ✅ Verified (r2) |
| VIS-19 | Needs fix (G5) | ✅ Verified (r2) |
| VIS-22 | Needs fix (G6) | ✅ Verified (r2) |
| VIS-29 | Needs fix (G1) | ✅ Verified (r2) |
| VIS-10, VIS-12 | Verified com nota de precisão | ✅ Verified (r2) — notas fechadas por P2 e P1 |
| VIS-32 | Verified (S08b morto só por probe) | ✅ Verified (r2) — S08b morto pela régua (H1) |
| VIS-24 | Needs fix (G4, defeito) | ❌ Needs fix — **G8** (o defeito G4 está consertado e provado; falta o caso da recusa de outra aba durante a trava) |
| VIS-33 | Verified | ❌ Needs fix — **G7** (o dia de Brasília de `contagem_desde_dia` e `ultima_visita_dia` sem fixtura) |
| VIS-38, VIS-40 | Needs fix (G2) | ❌ Needs fix — **G7** no dia derivado; a tela e os instantes (G2) estão provados |
| VIS-35 | Verified — assunção pendente | ✅ Verified (r2) — **assunção ainda pendente** de confirmação do usuário |
| as demais 33 | Verified (r1) | ✅ Verified (r2) — re-provadas nesta rodada (mutantes reinjetados mortos) |

### Lições candidatas

Escritas aqui, e **não** pelo `lessons.py` (o `list` dele reescreve e apaga o arquivo — memória do
projeto). Cada uma nasce de um achado desta rodada.

1. **Fixtura de fuso tem de cair na faixa em que os dois fusos DISCORDAM.** Ao meio-dia UTC,
   `store_day(x)` e `x::date` escrevem o mesmo dia; a régua certa e a errada só se separam entre 21h e
   24h de Brasília. Um campo derivado de dia sem fixtura nessa faixa está sem prova, mesmo com a
   fixtura do instante passando. *(S24, S25)*
2. **Conserto que acrescenta uma decisão dentro de uma espera precisa de um caso por FONTE da
   recusa.** A recusa da mesma aba chega pela memória; a de outra aba, só pelo armazenamento. O teste
   da primeira passa com a releitura da segunda apagada. *(N3)*
3. **Mutante que só um modelo irreal de concorrência distingue é equivalente.** Declare-o com a sonda
   que o separaria e o porquê de ela não ser realista, em vez de cobrar um teste que trava um
   comportamento que nenhum ambiente tem. *(X02)*
4. **Caminho de saída RELATIVO passado a `pnpm --filter … exec` é resolvido dentro do workspace.** O
   relatório do vitest cai no repositório. E um arnês interrompido deixa o arquivo mutado: backup antes
   do disparo, registro do que está mutado, conferência por SHA-256 no fim. *(incidente desta rodada)*
5. **Probe que não roda reprova igual a probe que mata.** `psql -f` com arquivo ausente sai ≠ 0 e se
   lê como "mutante morto". O arnês tem de lançar quando o arquivo do probe não existe, e uma execução
   de CONTROLE (mutação sem efeito semântico) tem de passar antes de qualquer morte valer. *(lote 2
   desta rodada)*

### Apêndice — o que este verificador escreveu, para levar ao repositório

O arnês, a fixtura e as sondas ficaram fora do repositório (no diretório de rascunho da sessão, que
não sobrevive a ela). O texto que os consertos precisam está aqui.

**A fixtura `dias-do-contador.sql`** (G7) — passa no código atual (E-limpo: 4 `ok`) e mata S24 e S25.
Dentro de `probes/`, o preâmbulo volta a ser `\ir _comum.sql`:

```sql
-- os dois DIAS do contador quando o dia de Brasília difere do dia em UTC (21h–24h de Brasília)
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

-- A sessão em UTC (o padrão do banco local e do hospedado): é onde um `::date` cru decidiria o dia.
set local timezone = 'UTC';

select pg_temp.confere(not exists (select 1 from public.store_visit_counter),
  'âncora: o contador nasce vazio (a migration foi reaplicada dentro desta transação)');

-- Primeira visita às 23h59:59 de 20/10 em Brasília (02:59:59Z de 21/10); a última, às 22h30 de 21/10
-- em Brasília (01:30Z de 22/10). Nos dois instantes o dia em UTC é o SEGUINTE ao de Brasília.
select public.record_store_visit('ffffffff-0000-4000-8000-0000000000f1', '2026-10-21T02:59:59Z');
select public.record_store_visit('ffffffff-0000-4000-8000-0000000000f2', '2026-10-22T01:30:00Z');

-- Lido às 00h30 de 22/10 em Brasília (03:30Z): hoje = 22/10, ontem = 21/10.
select pg_temp.movimento('2026-10-22T03:30:00Z', :'admin_id') as m \gset
select pg_temp.confere((:'m'::jsonb ->> 'hoje') = '2026-10-22' and (:'m'::jsonb ->> 'ontem') = '2026-10-21',
  'âncora: lido às 00h30 de 22/10 (Brasília) ⇒ hoje 22/10, ontem 21/10');
select pg_temp.confere((:'m'::jsonb ->> 'contagem_desde_dia') = '2026-10-20',
  'contagem_desde_dia = 20/10 (23h59:59 de Brasília), e não 21/10 (o dia em UTC)');
select pg_temp.confere((:'m'::jsonb ->> 'ultima_visita_dia') = '2026-10-21',
  'ultima_visita_dia = 21/10 (22h30 de Brasília) — "ontem" no painel —, e não 22/10 (o dia em UTC, que o painel escreveria "hoje")');

rollback;
```

**A sonda R2-N3** (G8) — um caso a mais no fim de `apps/store/src/app/__tests__/VisitCounter.test.tsx`
(usa os auxiliares que o arquivo já tem). Passa no código atual; com N3, reprova:

```ts
describe('SONDA r2 (verificador) — recusa feita em OUTRA aba enquanto a trava do id espera', () => {
  it('trava segurada ⇒ outra aba grava a recusa (sem evento) ⇒ trava solta ⇒ nenhum id e nenhuma chamada', async () => {
    let soltar: () => void = () => {}
    const segura = new Promise<void>((r) => (soltar = r))
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_nome: string, cb: () => Promise<unknown>) => {
          await segura
          return cb()
        },
      },
    })
    try {
      montar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(useCookieConsentStore.getState().statistics).toBe(true)
      // A outra aba: a recusa gravada no armazenamento compartilhado, sem evento nenhum nesta.
      window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ v: 1, notice: 'answered', statistics: false }))
      await act(async () => soltar())
      await escoar()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(marcador()?.id ?? null).toBeNull()
    } finally {
      delete (window.navigator as { locks?: unknown }).locks
    }
  })
})
```

**A sonda R2-X02** (observação, não lacuna) — a trava que resolve num passo SEGUINTE ao callback;
passa no código atual e reprova com X02. Fica registrada só para mostrar o único modelo em que a
decisão de rede da linha 85 se distingue:

```ts
request: async (_nome: string, cb: () => Promise<unknown>) => {
  const r = await cb()
  await depois // a trava "resolve" depois de um passo controlado pelo teste
  return r
},
// … montar(); await disparar(); save(false) com o id já criado; soltar `depois` ⇒ nenhuma chamada
```

## Rodada 3 — 2026-10-22

- **Spec**: `.specs/features/71-visitas-unicas-no-dashboard/spec.md` (terceira escrita, 44 ACs; a
  tabela de rastreabilidade ainda está no estado da r1 — ver *Observações*)
- **Faixa do diff**: `9270c03a` (HEAD, o mesmo da `baseline.md`) .. árvore de trabalho, **sem commit**:
  33 arquivos rastreados alterados e 26 entradas novas (`git status --porcelain`: 59 linhas, iguais no
  começo e no fim desta rodada). O SHA-256 dos **97** arquivos do diff (código, testes, probes e
  documentos) foi tirado antes de qualquer medição, com um `tar` de reserva, e conferido depois dos
  controles e depois do sensor inteiro: **97/97 iguais** — o único que muda depois disso é este
  `validation.md`, com esta seção. A migration (`20261021120000_71-visitas-unicas.sql`) está aplicada
  só no banco local, e o que está aplicado é o arquivo: as nove funções (corpo, `definer`,
  volatilidade, ACL) e as duas tabelas (RLS, ACL, colunas) foram comparadas, numa transação desfeita,
  com o arquivo reaplicado do zero (`banco-igual-ao-arquivo.sql`, deste verificador).
- **Verificador**: sub-agente independente (autor ≠ verificador). Li `validate.md`, a spec, o design,
  o `tasks.md` (inclusive os consertos da r1 e da r2), a `baseline.md`, as rodadas 1 e 2 deste arquivo
  e o diff inteiro — o código de produção **antes** dos testes. O arnês, os mutantes, as fixturas e as
  sondas desta rodada foram escritos do zero (os da r2 ficaram no rascunho de outra sessão). Nada de
  commit, stash ou push; banco só o local (54441/54442); nada com `--linked`, nada de `db reset`, nada
  de `stop --all`.

### Veredito: ❌ FAIL — por cobertura (uma lacuna nova, G9); os consertos da r2 feitos e provados; nenhum defeito de produto

**Os dois consertos da r2 estão feitos e provados pela régua, não por sensor**: S24 e S25 (G7) morrem
pelas duas réguas novas do guarda e pelo probe com a frase exata, e N3 (G8) morre pelo caso novo do
`VisitCounter` — e só por ele. Todos os mutantes dos consertos da r1 também morrem de novo. Os gates
batem com o fecho do autor ao número. Nenhum comportamento errado foi encontrado.

O FAIL vem de **uma lacuna nova, de cobertura**, achada por mutantes que as rodadas anteriores não
tentaram:

- **G9** — o PRAZO que `store_clock` devolve (o `ate` das respostas `robô`, `interno` e `limite`) não
  tem régua, probe nem teste. A régua e a fixtura que existem provam o `ate` do OUTRO produtor do
  mesmo campo (`record_store_visit`), e o teste do handler dubla `store_clock` com o valor certo.
  S33 e S33b sobrevivem ao guarda, aos cinco probes e à suíte inteira da loja; a fixtura deste
  verificador passa no código de hoje e mata os dois.

Os outros quatro sobreviventes não são lacunas: X02 e V34 são defesas redundantes (a primeira, agora
**medida** em Chromium e WebKit), V33 é equivalente contra o servidor atual e F23 muda só uma borda de
1 ms que a spec não define.

```
## Validation: 71 · Visitas únicas no Dashboard — FAIL ❌ (rodada 3)

Spec-anchored check: 44 ACs; 42 provadas no valor da spec; 2 com lacuna, as duas por G9 (VIS-27: o `ate` do 429; VIS-16: o prazo dos 200 robô/interno e do 429); G7 e G8 da r2 fechados
Gate: 14347 passed, 0 failed (core 3507 · functions 957 · store 5726 · backoffice 3645 · catalog-import 512); tsc 0×3; lint 25/7 (= r2); build --force verde; payment/** intocado
Sensor: 5 controles (vivos em tudo, 0 morte falsa) + lote 1 = 169 mutantes de comportamento — 151 mortos por asserção da régua, 11 de SQL só pelos probes, 1 pelo arame proposital do arquivo (F07); 6 vivos (S33, S33b, F23, V33, V34, X02); 0 por carga/compilação, 0 por timeout. Lote 2: a fixtura do verificador passa (E-limpo) e mata S33/S33b (E33, E33b); os 11 só-probe confirmados invisíveis à suíte inteira da loja; X02 medido equivalente em Chromium 149 e WebKit 26.5
Report: .specs/features/71-visitas-unicas-no-dashboard/validation.md

Ranked gaps:
1. G9 · VIS-27 / VIS-16 — o `ate` que `store_clock` devolve (robô, interno, 429) sem prova: S33 (o começo de hoje) e S33b (+1 dia) vivos no guarda, nos 5 probes e na suíte inteira — supabase/migrations/20261021120000_71-visitas-unicas.sql:208-209
```

### Os consertos da r2, reinjetados

| Id | AC | Mutante reinjetado no arquivo real | Resultado nesta rodada |
| --- | --- | --- | --- |
| **G7** | VIS-33 (dado de VIS-38/VIS-40) | S24 (`v_inicio::date::text`), S25 (`v_ultima::date::text`) e um terceiro, novo, sem `::date` nenhum: S24b (`to_char(v_inicio, 'YYYY-MM-DD')`) | ✅ S24 e S25 morrem pelas **duas** réguas novas — a do campo (`visitasSchema.test.ts:890` / `:894`, `diaDe` `toBe(true)`) e "nenhum `::date` fora de `store_day`" (`:898`, `toBe(0)`) —, nunca só por sensor; S24b, que escapa da segunda, morre pela primeira (`:890`). Os três também pelo probe (`visitas.sql`, `fixtura_dias_do_contador`): *"contagem_desde_dia = 20/10 (23h59:59 de Brasília), e não 21/10"* e *"ultima_visita_dia = 21/10 (22h30 de Brasília) — 'ontem' no painel —, e não 22/10"* |
| **G8** | VIS-24, VIS-25 | N3 (`() => podeChamar(cfg)` → `() => visitRefusal(contexto(cfg)) === null`) | ✅ morre por **um** caso, o novo `app/__tests__/VisitCounter.test.tsx:543` (`expect(marcador()?.id ?? null).toBeNull()` — *expected '2026d55b-…' to be null*); os outros casos do arquivo seguem verdes, que é a medida exata do que faltava |
| r1 | VIS-29, 38, 40, 03, 24, 19, 22, 12, 10, 32 | X01, S19, S20, S21, S23, S10, G4a, G4b, N8, V09, V23, N7, P1a, P1b, P2, S08b | ✅ todos mortos de novo — X01, S19–S21, S10, S08b pela régua do guarda (S23 só pelo probe, como na r2); G4a, G4b, N8, V09, V23, N7, P1a, P1b, P2 por asserção na suíte |

### Gates (medidos por este verificador, com a árvore sem mutação, antes do sensor)

Um workspace por vez, `--testTimeout=20000` **sem** o `--` nos dois apps, exit code fora de pipe.

| Medida | Entrada (`baseline.md`) | r2 | **Agora** | Delta vs entrada | Exit |
| --- | --- | --- | --- | --- | --- |
| core | 3414/133 | 3507/138 | **3507/138** | +93/+5 | 0 (6 s) |
| functions | 890/19 | 957/21 | **957/21** | +67/+2 | 0 (1 s) |
| store | 5350/299 | 5717/312 | **5726/312** | +376/+13 | 0 (43 s) |
| backoffice | 3511/199 | 3645/206 | **3645/206** | +134/+7 | 0 (38 s) |
| catalog-import | 512/23 | 512/23 | **512/23** | 0 | 0 (2 s) |
| **Total** | **13677/673** | 14338/700 | **14347/700** | **+670/+27** | |
| `tsc` store · backoffice · `tsconfig.server.json` | 0 · 0 · 0 | 0 · 0 · 0 | **0 · 0 · 0** | — | 0 |
| Lint | 26/7 | 25/7 | **25/7** (backoffice 23/5 · store 2/2) | −1 erro (o `any` de `revenueToday`) | 1 (esperado) |

- O +9 da loja sobre a r2 é exatamente o dos consertos da r2: o bloco G7 de `visitasSchema.test.ts`
  (8 casos, `:886-923`) e o caso G8 de `VisitCounter.test.tsx` (`:543`). Nenhuma queda em workspace
  nenhum. Os números batem com a tabela do `CLAUDE.md` raiz (`:512-514`).
- Lint: os arquivos com problema são os de sempre (11 no painel, 3 na loja); nenhum arquivo da `71`
  aparece. `useAdminStats.ts` segue com os três `any` que já tinha.
- `pnpm build --force` (sem cache do turbo): exit 0, **0 de 2** em cache, `apps/store/.server/page.mjs`
  gerado.
- `git diff --name-only -- packages/core/src/payment` e `git status --porcelain -- packages/core/src/payment`:
  **vazios**.
- Migrations: 64 no disco, 64 em `supabase_migrations.schema_migrations`, a mais recente
  `20261021120000`, nenhum prefixo repetido.

### Probes no banco local (rodados por este verificador)

| Probe | Resultado | O que prova |
| --- | --- | --- |
| `dia.sql` | exit 0, 9 `ok` | VIS-03 (as fixturas de fronteira, a segunda-feira, a inversa, `expira_em`) |
| `visitas.sql` | exit 0, **31** `ok` | VIS-14, VIS-15 (2/1/**2** e 1/1/1), VIS-30, os instantes (G2 da r1) e **os dois dias do contador entre 21h e 24h (G7 da r2, +6)** |
| `vendas.sql` | exit 0, 19 `ok` | VIS-31 (a)–(f), a fronteira exata (G3 da r1), VIS-32, VIS-33 (>1.000, nenhum uuid, só escalares) |
| `teto.sql` | exit 0, 10 `ok` | VIS-27 (teto diário), VIS-44 |
| `papeis.sql` | exit 0, 32 `ok` | VIS-28, VIS-33 (`anon` e não-admin ⇒ 42501; `service_role` grava) |
| `concorrencia.sh` | exit 0 | VIS-14: duas sessões ⇒ **1** linha, `gravada` + `repetida`, `ate` inteiro, contador de volta a "ausente" |
| `banco-igual-ao-arquivo.sql` (**deste verificador**) | exit 0, 1 `ok` | as 9 funções (corpo, `definer`, volatilidade, ACL) e as 2 tabelas (RLS, ACL, colunas) aplicadas = as do arquivo reaplicado do zero |
| `relogio-do-servidor.sql` (**deste verificador** — texto no apêndice) | exit 0, 6 `ok` | o `ate` de `store_clock` às 15h e às 22h30 de Brasília — ver G9 |

E uma conferência do `AD-012` feita aqui, sem herdar a do autor: `store_movement` chamada como admin
(em transação desfeita) devolve **exatamente** as 12 chaves de topo, os 3 períodos e as 4 medidas que
`entities/stats/model/storeMovement.ts` declara (`useStoreMovement.test.ts:305-326` as tem por
extenso).

Estado do banco local no começo e no fim (o mesmo, por `diff`): `store_visits` 0, `store_visit_counter`
0, nenhum pedido `PROBE-`/`VERIF-`/`R3-`, `orders_number_seq` em 183, `cron.job` com
`expire-pending-orders` e `prune-store-visits`, `production_host` gravado intacto, e a assinatura
(`md5` de `pg_get_functiondef` + ACL) das nove funções igual. `function-visit.sh` (a function servida)
**não** foi refeito: o edge runtime local está parado (como na entrada), e nem `visit/handlers.ts` nem
`index.ts` mudaram nos consertos da r2 (`tasks.md`, arquivos tocados); o caminho real do gateway
segue coberto por `prova-em-navegador.md` (autor).

### Checagem ancorada na spec — as 44 ACs, rederivadas

Rederivada do zero nesta rodada, com as linhas dos arquivos como estão hoje (o conserto G8 acrescentou
um caso no meio de `VisitCounter.test.tsx`, e o G7 um bloco no meio de `visitasSchema.test.ts`, o que
deslocou as linhas citadas na r2). Painel = `apps/backoffice/src/…`; loja = `apps/store/src/…`;
probes = `.specs/features/71-visitas-unicas-no-dashboard/probes/`. Na coluna da direita, os mutantes
**desta rodada** (tabela do sensor) que provam que a régua discrimina.

| AC | Resultado definido pela spec | Evidência (`arquivo:linha` — asserção) | Resultado |
| --- | --- | --- | --- |
| VIS-01 | `h2` "Movimento da loja"; abas Hoje · Ontem · Esta semana, Hoje selecionada; 4 cards na ordem; **primeiro irmão depois do `PageHeader`** | `widgets/store-movement/ui/__tests__/StoreMovement.test.tsx:90` (`abas…toEqual(['Hoje','Ontem','Esta semana'])`, `aria-selected` `'true'` na primeira), `:102` (rótulos `toEqual([...4])`); `pages/admin/AdminDashboard.test.tsx:126` (`filhos[1]` `toBe(secaoMovimento())`) | ✅ (B03, B34, B45 mortos) |
| VIS-02 | sem nova chamada; exatamente uma `aria-selected`; `tablist` "Período"; setas ←/→ | `StoreMovement.test.tsx:111` (`rpc` 1 chamada; `selecionadas` `toEqual(['Esta semana'])`), `:130` (`tablist` "Período", `ArrowRight`/`ArrowLeft`); `AdminDashboard.test.tsx:190` (`rpc` e `from` sem chamada nova) | ✅ |
| VIS-03 | intervalos meio-abertos por `store_day`; `02:59:59.900Z⇒20/10`, `03:00:00Z⇒21/10`, dom 23h30 ⇒ 18/10, semana de 12/10 | `probes/dia.sql:12-24` (9 `ok`, sessão em Tóquio); a fronteira exata das vendas: `probes/vendas.sql` (savepoint `fronteira`); régua `visitasSchema.test.ts:826` | ✅ (S03, S05, S10 pela régua; S03b, S04, S06 só pelo probe) |
| VIS-04 | uma RPC, sem data nem `p_agora`; chaves exatas do argumento | `entities/stats/api/useStoreMovement.test.ts:135` (`rpc.mock.calls[0]` `toEqual(['store_movement'])`, `toHaveLength(1)`) | ✅ (B23 morto) |
| VIS-05 | esqueleto ×4 + `aria-busy`; nenhum `0`/`R$ 0,00`/`—` | `StoreMovement.test.tsx:149` (`[data-skeleton="valor"]` ×4, texto sem dígito, sem `R$`, sem `—`), `:168`; `shared/ui/StatCard.test.tsx:68` | ✅ (B14, B17 mortos) |
| VIS-06 | UMA mensagem exata; UM botão de 44px; nenhum valor; tocar relê | `StoreMovement.test.tsx:189` (`mensagens` `toHaveLength(1)`, botão `h-11` por token, grade ausente, `rpc` +1 depois do clique) | ✅ (B01, B15, B19, B41 mortos) |
| VIS-07 | `1.234`; `formatPrice`; ticket do banco; sem venda `0`/`R$ 0,00`/`—`+`sr-only`; sem visita `0` | `widgets/store-movement/model/__tests__/labels.test.ts:82`, `:88` (ticket 99,99 do banco), `:106`; `StoreMovement.test.tsx:230` | ✅ (B13 morto) |
| VIS-08 | `<button>` com `aria-label` e `aria-expanded`, 44px; Popover, nunca Tooltip; Esc devolve o foco; texto exato em constante única | `labels.test.ts:240` (`VISIT_INFO_TEXT` `toBe(…)`, os três fusos); `StoreMovement.test.tsx:311`, `:327`; toque, Enter, Espaço e toque fora: `prova-em-navegador.md` | ✅ |
| VIS-09 | as quatro linhas por corte de texto; em UTC, `hoje='2026-10-21'` diz 21/10 | `labels.test.ts:63`, `:70`, `:76` (num `describe.each` de três fusos, sensor `:256`); `packages/core/src/time/__tests__/format.test.ts:60`, `:66` | ✅ (B07, B30, C04 mortos) |
| VIS-10 | relê ao montar, no foco, em `expira_em` (duração do servidor, piso 1 s) e no aviso do canal; aba não relê; "Atualizado às HHhMM"; adiantado 2 h ⇒ uma chamada; releitura que falha mantém | `useStoreMovement.test.ts:175`, `:195`, `:219`, `:245`, `:276`, `:288`; `StoreMovement.test.tsx:413` (a linha troca na tela no instante `expira_em`), `:212`; `AdminDashboard.test.tsx:158`; `labels.test.ts:126`, `:130` | ✅ (B04, B05, B06, B16, B26, B29, B43, X20, X23, X24, P2, C13 mortos; S26 só pelo probe) |
| VIS-11 | 2 colunas em 390; `R$ 99.999,99`/`9.999` sem quebrar; ≤2 linhas; sem rolagem horizontal; 44px | proxies por token exato `StoreMovement.test.tsx:349`, `:361`; medida em `prova-em-navegador.md` (390 e 1440) | ✅ (B28, B36 mortos) |
| VIS-12 | `randomUUID` em `{v:1,id,ate,em}`; não deriva de dado pessoal; não vai em outra requisição; só o dono cita a chave | `shared/lib/visits/__tests__/visitor.test.ts:63`, `:70`; `shared/lib/__tests__/visitanteComDonoUnico.test.ts:91`, `:95`; `shared/lib/__tests__/idDoVisitanteSoNoEnvio.test.ts:139`, `:143`, `:147`, `:153` | ✅ (V28, P1a, P1b mortos) |
| VIS-13 | corpo **exatamente** `{"id"}`; só a chave publicável; com sessão, `Authorization` ≠ token | `shared/lib/visits/__tests__/send.test.ts:68` (`Object.keys` `toEqual(['id'])`), `:76` (`headers.has('authorization')` `false`, nenhum cabeçalho com o token), `:88`, `:94` | ✅ (V17, V18, V21 mortos) |
| VIS-14 | `on conflict do nothing`; N simultâneas ⇒ 1 linha, todas `200`; `{dia, ate, agora}` inteiros, do banco | `supabase/functions/visit/__tests__/handlers.test.ts:427` (chaves `['p_id']`), `:436` (o JSON inteiro); `probes/visitas.sql` (repetida, `ate` = próxima 00:00, inteiros); `probes/concorrencia.sh` (rodado aqui) | ✅ para a gravação (S34 pela régua; S22 só pelo probe; F08, F13 mortos) — o MESMO campo, quando vem de `store_clock` (respostas que não gravam), é G9 |
| VIS-15 | `count(distinct)`; seg/ter/qua ⇒ 2/1/**2**; dom/seg ⇒ 1/1/1 | `probes/visitas.sql` fixturas `a` e `c`; `probes/vendas.sql` vis33; régua `visitasSchema.test.ts:684` | ✅ (S01 pela régua; S02, S11, S37 só pelo probe) |
| VIS-16 | `ate = Date.now() + (ate − agora)` para todo `200`/`429` com relógio; janela `[em, ate)`; relógio que volta chama; adiantado 2 h + 5 navegações depois de um `200` ⇒ ≤1; sem relógio = falha | `shared/lib/visits/__tests__/marker.test.ts:105`, `:111`, `:116`, `:122`, `:132`; `app/__tests__/VisitCounter.test.tsx:217`, `:229`, `:239`; `send.test.ts:116` | ⚠️ **lacuna G9** — o cliente está provado (V10, V11, V29, V30, V31, V32, X03, X04 mortos), mas o prazo que ele grava depois de um `200 robô`/`interno` ou de um `429` sai de `store_clock`, sem prova (S33, S33b vivos em tudo) |
| VIS-17 | no `App`, fora das `Routes`, só fora da prévia; `requestIdleCallback` → `setTimeout` direto com `complete` → depois do `load`; nada síncrono | `VisitCounter.test.tsx:177`, `:187`, `:202`; `app/__tests__/contadorMontado.test.tsx:50`, `:56` | ✅ (V06, V12, V13, V24 mortos) |
| VIS-18 | 400/5xx/rede ⇒ sem marcador e no máximo mais UMA tentativa, na próxima navegação; 429 grava o prazo | `VisitCounter.test.tsx:256`, `:266` (cinco falhas: 1 → 2 → 2), `:285`, `:293` | ✅ (V01, V19, V19b, V20 mortos; V33 vivo — equivalente contra o servidor atual, ver *Observações*) |
| VIS-19 | armazenamento que lança ou sem `randomUUID` ⇒ não registra, nada em memória | `visitor.test.ts:111`, `:122`, `:132`, `:140`, `:147`; o componente: `VisitCounter.test.tsx:603`, `:616`, sensor `:625` | ✅ (V09 morto) |
| VIS-20 | criação dentro de `navigator.locks.request('estrelinha-visitor')`, relendo dentro | `visitor.test.ts:156`, `:167` (a outra aba grava ⇒ usa ESSE id, `randomUUID` 0×), `:182`, `:194` | ✅ (V14 morto) |
| VIS-21 | JSON inválido, não-v4 (sem diferenciar maiúsculas), chave além de `id` ⇒ `400`, nada gravado | `handlers.test.ts:283` (15 corpos: `supabase.rpcs` `toEqual([])`, 400, log `inválido`), `:292`; `packages/core/src/visits/__tests__/visitor.test.ts:18-76` | ✅ (F04, C02, C06, C09, C09b mortos) |
| VIS-22 | não chama: não-produção, prévia, configuração carregando (espera), host interno, recusa, marca, `webdriver`, robô; não lê o GA4; GA4 desligado ⇒ chama; `localhost` com o host de produção ⇒ não chama | `shared/lib/visits/__tests__/refusal.test.ts:34-79`; `VisitCounter.test.tsx:304`, `:311`, `:320`, `:353`, `:367`, `:382`, `:389`, `:401`, `:410`, `:417`; `shared/lib/__tests__/contadorSemGa.test.ts:85` | ✅ (V03a, V03b, V06, V06b, V07, V08, V08b, V08c, V22, V23, N7 mortos; V34 vivo — defesa redundante à montagem, ver *Observações*) |
| VIS-23 | robô ⇒ `200 robô`; sem `Origin` ou host interno ⇒ `200 interno`; host lido pela function; 20 assinaturas, 5 inversos | `handlers.test.ts:343`, `:353`, `:363`, `:377`, `:387`, `:397`, `:406`, `:414`; `packages/core/src/visits/__tests__/bots.test.ts:72` (20), `:77`, `:87`, `:96`, `:106` | ✅ (F01, F02, F03, F14, C01, C05, C08 mortos) |
| VIS-24 | `save(false)` apaga o `id` mantendo `ate`/`em`, na mesma ação; nenhuma chamada depois; resposta tardia não traz o id | `entities/cookie-consent/model/__tests__/cookieConsentStore.test.ts:157`, `:164`, `:171`; `VisitCounter.test.tsx:427`, `:439`; a recusa durante a trava: `:455`, `:483`, `:510`, **`:543`** (a recusa de OUTRA aba — conserto G8), sensor `:574` | ✅ (V02, V38, N6, G4a, G4b, N8 e **N3** mortos; X02 vivo — equivalente, agora medido) — G8 da r2 fechado |
| VIS-25 | a decisão relê a escolha no instante da chamada; só registro válido; recusa em memória nunca desfeita | `cookieConsentStore.test.ts:184-252`; `VisitCounter.test.tsx:640`, `:651`, `:659`, `:543` | ✅ (V04, V05, V39, X19, N3 mortos) |
| VIS-26 | Estatísticas sempre na folha; "Salvar escolhas" grava; `AVS-02` invertido; frase do Apêndice A | `widgets/cookie-notice/ui/__tests__/CookieNotice.test.tsx:235` (invertido, não apagado), `:254`, `:189-194` (a frase exata, sem "anônim") | ✅ (V25 morto) |
| VIS-27 | 30/min por IP ⇒ `429 {dia, ate, agora}`; sem IP libera; `429` sem relógio = `limite`; reexport `toBe`; 5.000/dia ⇒ `200 teto` | `handlers.test.ts:169`, `:189`, `:199`, `:210`, `:219`, `:232`, `:249`; `supabase/functions/_shared/__tests__/rateLimit.test.ts:85`; `probes/teto.sql` | ⚠️ **lacuna G9** — o `ate` do `429` sai de `store_clock`, e o valor que ela calcula não tem prova (S33, S33b vivos em tudo); o resto provado (F05, F09, F10, F15, F17, F24, S13 mortos; F23 vivo — a borda de 1 ms que a spec não define) |
| VIS-28 | RLS, `revoke all` dos três, nenhuma policy; só `service_role` grava; colunas exatas; `42501` | `visitasSchema.test.ts:226-306`, `:461-509`; `probes/papeis.sql` (32 `ok`) | ✅ (S15, S17, S32, S44 mortos) |
| VIS-29 | uma linha por resposta (menos `OPTIONS`); 8 desfechos; sem id/IP/UA; não lê `Authorization`; `405 inválido`; `verify_jwt = false` | `handlers.test.ts:129` (`conferirLog` em todo caso), `:143`, `:154`, `:475`, `:535`, `:539-547` | ✅ (F06, F06b, F06c, F07, F11, F12, F20, X01 mortos) |
| VIS-30 | a gravação poda `day < store_day(p_agora) − 7`; os 8 dias ficam | `probes/visitas.sql` (`fixtura_poda`, `fixtura_futuro`); `visitasSchema.test.ts:443`, `:846` | ✅ (S12, S31 mortos) |
| VIS-31 | lista positiva por `paid_at` no dia de Brasília; (a)–(f) | `probes/vendas.sql` savepoint `vis31`; régua `visitasSchema.test.ts:714` | ✅ (S07 pela régua; S04, S07b só pelo probe) |
| VIS-32 | soma em `numeric`, `round(…,2)` no banco: 33,33; 10,01; sem venda ticket `NULL` | `probes/vendas.sql` (`vis32`, "sem venda"); régua `visitasSchema.test.ts:761`, `:795` | ✅ (S08, S08b mortos) |
| VIS-33 | só escalares; dias como texto; `expira_em`/`lido_em`; `production_host`; `contagem_desde(_dia)`, `ultima_visita(_dia)` no dia de Brasília; `teto_dia`; faturamento `0`; `definer` + `has_role`; `execute` só a `authenticated`; >1.000 exatos | `probes/vendas.sql` (vis33: >1.000, nenhum uuid, medidas numéricas); `probes/papeis.sql`; `probes/visitas.sql` (`fixtura_dias_do_contador` — conserto G7); régua `visitasSchema.test.ts:858`, **`:890`, `:894`, `:898`** (conserto G7); tipo × saída real `useStoreMovement.test.ts:322` (e conferido de novo contra o banco aqui) | ✅ (S16, S18, S24, S24b, S25, S29, S30, S43 mortos; S26, S46 só pelo probe) — G7 da r2 fechado |
| VIS-34 | o literal do fuso UMA vez em `store_time_zone()`; formas proibidas recusadas; TS importa o dono, sem allowlist | `visitasSchema.test.ts:340-402`; `shared/lib/__tests__/fusoComDonoUnico.test.ts:129`, `:133` | ✅ (S03, C14, V27 mortos) |
| VIS-35 *(assunção pendente)* | "Pedidos Hoje" e "Fat. Hoje" ausentes; 4 cards em `grid-cols-2 lg:grid-cols-4`; sem campo morto | `AdminDashboard.test.tsx:222`, `:230`, `:238`; `entities/stats/api/useAdminStats.test.ts:50`, `:71`, `:85` | ✅ (B02, B27 mortos) — **continua assunção pendente de confirmação do usuário** |
| VIS-36 | quatro parágrafos; os três antigos intactos; o do Apêndice A palavra por palavra | `pages/__tests__/PrivacyPolicyPage.test.tsx:299`, `:305`, `:311` (e o literal do teste é o do Apêndice A, conferido aqui por comparação de texto) | ✅ (V26 morto) |
| VIS-37 | o contador não existe sem o parágrafo | `pages/__tests__/politicaDoContador.test.ts:50`, `:55`, `:61` | ✅ (V26 morto) |
| VIS-38 | "Contando desde DD/MM às HHhMM" quando o período começa antes; 21/10 15h32 ⇒ Ontem e Semana sim, Hoje não | `labels.test.ts:144`, `:150`, `:155`; `StoreMovement.test.tsx:283`; dado: `probes/visitas.sql` (`fixtura_instantes`, `fixtura_dias_do_contador`) | ✅ (B08, S19, S24 mortos) |
| VIS-39 | contador nunca usado ⇒ `—` e um dos dois textos, pelo host do banco | `labels.test.ts:118`, `:161`, `:168`, `:175`; `StoreMovement.test.tsx:249` | ✅ (B09, B12 mortos) |
| VIS-40 | "Última visita registrada: hoje/ontem/em DD/MM às HHhMM", contra o `hoje` do banco | `labels.test.ts:189`, `:194`, `:199`; dado: `probes/visitas.sql` | ✅ (B10, B32, S20, S21, S23, S25 mortos) |
| VIS-41 | nenhum literal do bloco diz "pessoas" ou "usuários" | `widgets/store-movement/__tests__/semPessoas.test.ts:43` | ✅ (B22 morto) |
| VIS-44 | teto no período aberto ⇒ a frase; aparece em Hoje e Semana, some em Ontem | `labels.test.ts:212`, `:219`, `:228`; `StoreMovement.test.tsx:267`; `probes/teto.sql` | ✅ (B11, S18, S29 mortos) |
| VIS-42 | `=1` grava a marca, apaga o id, tira o parâmetro por `replace` preservando os outros, avisa; `=0` desfaz; com a marca, nada; dono único em `core` | `VisitCounter.test.tsx:686`, `:705`, `:716`, `:510`; `packages/core/src/visits/__tests__/optOut.test.ts:18-57`; `shared/lib/__tests__/parametroNaoContarComDonoUnico.test.ts:114`, `:119`, `:123` | ✅ (V15, V16, V22, V37, V48, V50, C03, C11, B24 mortos) |
| VIS-43 | "Abrir a loja sem contar" com `optOutHref(storeOrigin(), true)`, nova aba, some sem `VITE_STORE_URL` | `widgets/admin-layout/ui/AccountMenu.test.tsx:93`, `:151-166`, `:169` | ✅ (B24 — pelo guarda da loja —, B25, B38 mortos) |

**Status**: 42 ACs provadas no valor da spec; **2 com lacuna, as duas por G9** — VIS-27 (o `ate` do
`429`) e VIS-16 (o prazo que o navegador grava depois de uma resposta que não grava). As lacunas da r2
estão fechadas: G7 (VIS-33, VIS-38, VIS-40) e G8 (VIS-24, VIS-25).

### Sensor de discriminação

**Método.** Arnês próprio, escrito do zero nesta rodada (`sensor.mjs`, no diretório de rascunho da
sessão, fora do repositório). Para cada mutante: lê os bytes e o SHA-256 de cada arquivo REAL; exige
que cada alvo apareça **exatamente** o número declarado de vezes e **lança** se não aparecer ou se a
troca não mudar nada — os 169 alvos foram validados antes da primeira escrita, e a primeira validação
pegou um alvo com o recuo errado (X03), corrigido antes de qualquer mutação —; grava um registro do
que está mutado (`EM-CURSO.json`) e o backup dos bytes; aplica; roda as suítes com o repórter JSON do
vitest, com caminho de saída **absoluto e fora do repositório** (lição 4 da r2); para SQL, roda os
probes (que reaplicam o arquivo mutado dentro da transação) e **lança** se o arquivo do probe não
existir (lição 5 da r2); restaura os bytes e confere o SHA-256. Nada de `git stash`. Nunca dois lotes
ao mesmo tempo (os arquivos reais e o banco são um só).

- **Fase A** — os arquivos de teste da feature no workspace dono (16 na loja, 10 no painel; a suíte
  inteira em `core` e em `functions`). Para SQL: as **23** suítes da loja que leem
  `supabase/migrations` (961 casos) **e** os cinco probes.
- **Fase B** — só para quem sobreviveu à A: a suíte INTEIRA do workspace dono e as vizinhas que podem
  pegá-lo (a loja carrega os guardas que varrem os dois apps, os pacotes e as functions).

**Classificação da morte**, lida do JSON do vitest: **asserção** (`AssertionError` e as asserções do
jest-dom), **consulta** (o Testing Library não acha o elemento), **erro** (exceção), **incidental**
(um `mutar()` de sensor do guarda que perdeu o alvo — prova que a linha mudou, não que a régua a
recusou), **timeout** e **carga/compilação** (o arquivo de teste nem carregou). Depois do lote, uma
segunda leitura separou, em cada mutante morto por asserção, os casos de **régua** dos casos de
**sensor**: **todo** mutante contado como "morto — asserção" tem pelo menos um caso de régua
reprovando. **Nenhum morreu por carga/compilação, nenhum por timeout, nenhum só por incidental.**

**Controles antes de tudo** — só um comentário muda, um por camada, e cada um passa pelas duas fases
inteiras: **vivos em tudo** (0 falha em 961 + 5 probes + 5726 na migration; 0 em 300 + 5726 na loja;
0 em 158 + 3645 + 5726 no painel; 0 em 957 + 5726 na function; 0 em 3507 + 5726 + 3645 + 957 no
núcleo). O arnês não produz morte falsa.

**Lote 1 — 169 mutantes de comportamento**, com os 5 controles no topo (a coluna "Suíte" junta as
fases A e B; os mutantes de SQL mostram os dois lados, porque **os probes não rodam no CI**):

| # | Req. | Mutação (comportamento) | Arquivo | Suíte automatizada | Probes no banco local |
| --- | --- | --- | --- | --- | --- |
| CTL-S | — | CONTROLE: só um comentário da migration muda | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 · store: 5726 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| CTL-L | — | CONTROLE: só um comentário do VisitCounter muda | `VisitCounter.tsx` | vivo (store: 300 · store: 5726 casos) | — |
| CTL-P | — | CONTROLE: só um comentário de labels.ts muda | `labels.ts` | vivo (backoffice: 158 · backoffice: 3645 · store: 5726 casos) | — |
| CTL-F | — | CONTROLE: só um comentário de handlers.ts muda | `handlers.ts` | vivo (functions: 957 · store: 5726 casos) | — |
| CTL-C | — | CONTROLE: só um comentário de bots.ts muda | `bots.ts` | vivo (core: 3507 · store: 5726 · backoffice: 3645 · functions: 957 casos) | — |
| S01 | VIS-15 | semana somando dias: count(*) no lugar de count(distinct) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — visitas por `count(distinct)` em cada período (VIS-15) os três períodos con…) | **morto** — `visitas`: seg/ter/qua: Esta semana = 2, e NÃO 4; `vendas`: >1.000 visitas: Hoje 300, Ontem 1.200, Esta semana 1.500 (distintos, sem teto de 1.000) |
| S02 | VIS-15 | semana somando dias com o texto do guarda intacto (recálculo depois do select) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `visitas`: seg/ter/qua: Esta semana = 2, e NÃO 4; `vendas`: >1.000 visitas: Hoje 300, Ontem 1.200, Esta semana 1.500 (distintos, sem teto de 1.000) |
| S03 | VIS-03/34 | fronteira de dia em UTC: store_day por UTC | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (4 casos; ex.: `visitasSchema.test.ts` — 2. o fuso — UM literal, dentro de `store_time_zone`, igual ao dono em TypeScript `store_day` e …) | **morto** — `dia`: 2026-10-21T02:59:59.900Z ⇒ 20/10; `visitas`: a primeira (02:59:59Z de 21/10) é gravada no dia 20/10 de Brasília |
| S03b | VIS-03/34 | store_day em UTC com o texto do guarda intacto (ramo morto) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `dia`: 2026-10-21T02:59:59.900Z ⇒ 20/10; `visitas`: a primeira (02:59:59Z de 21/10) é gravada no dia 20/10 de Brasília |
| S04 | VIS-31/03 | fronteira de dia em UTC só nas vendas: v_ini_hoje = v_hoje::timestamptz | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `vendas`: (a) pago às 00h10 de 21/10 conta em Hoje, e só ele |
| S05 | VIS-03 | semana começando no domingo (dow) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 2. formas proibidas de decidir o dia (VIS-34) `store_week_start` trunca a semana sobre a DATA l…) | **morto** — `dia`: o domingo 18/10 está na semana iniciada em 12/10 |
| S06 | VIS-03 | semana no domingo com o texto 'isodow … - 1' do guarda intacto | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `dia`: o domingo 18/10 está na semana iniciada em 12/10 |
| S07 | VIS-31 | vendas sem o recorte de pagamento (só status <> 'cancelled') | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) venda é lista positiva: `appr…) | **morto** — `vendas`: (f) 23h59:59.900 de 20/10 conta em Ontem; (b) (c) (d) (e) não contam |
| S07b | VIS-31 | vendas contando estorno, com payment_status = 'approved' intacto no texto | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `vendas`: (f) 23h59:59.900 de 20/10 conta em Ontem; (b) (c) (d) (e) não contam |
| S08 | VIS-32 | ticket de Hoje dividindo por zero (sem o case) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (7 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) o ticket é `round(faturamento…) | **morto** — `dia`: division by zero; `visitas`: division by zero; `vendas`: division by zero; `teto`: division by zero; `papeis`: division by zero |
| S08b | VIS-32 | ticket de Hoje dividindo a soma da SEMANA | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (7 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) o ticket é `round(faturamento…) | **morto** — `vendas`: 3 vendas que somam R$ 100,00 ⇒ ticket 33,33 |
| S10 | VIS-03/31 | Ontem fechado à direita (<= 00:00 de hoje), nas duas expressões | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32) Hoje é `paid_at >= v_ini_hoje…) | **morto** — `vendas`: pago EXATAMENTE às 00:00 de 21/10 (Brasília) ⇒ Hoje 1, Ontem 0, Semana 1 |
| S11 | VIS-15 | v_desde = segunda-feira (numa segunda, Ontem perde o domingo) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `visitas`: dom/seg: Ontem = 1 |
| S12 | VIS-30 | poda de 6 em vez de 7 (some o 8º dia) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 3. prune_store_visits apaga `day < p_dia - 7` (hoje e os 7 anteriores ficam)…) | **morto** — `visitas`: poda: os 8 dias (14/10 a 21/10) continuam lá |
| S13 | VIS-27 | teto diário off-by-one (> 5000) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o teto é 5.000 linhas no dia (VIS-27)…) | **morto** — `teto`: a 5.001ª ⇒ desfecho `teto` |
| S15 | VIS-28 | record_store_visit sem grant ao service_role | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — definer, só o service_role `grant execute … to service_role` — e a NENH…) | **morto** — `papeis`: permission denied for function record_store_visit |
| S16 | VIS-33 | store_movement sem o portão has_role(admin) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (4 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — só admin, pela RPC `has_role(auth.uid(), 'admin')` DENTRO do corpo, recusan…) | **morto** — `papeis`: authenticated recusado (42501): select public.store_movement() |
| S17 | VIS-28 | store_visits sem o revoke all | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 1. store_visits — RLS, revoke e nenhuma policy `revoke all` de public, anon e authenticated (se…) | **morto** — `papeis`: anon recusado (42501): select * from public.store_visits |
| S18 | VIS-44 | teto_dia sempre devolvido (fora do período aberto também) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) `teto_dia` sai só quando o dia …) | **morto** — `teto`: lido em 28/10 ⇒ teto_dia null (fora do período aberto) |
| S19 | VIS-38 | started_at recalculado a cada gravação | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (5 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o contador nasce com `started_at = last_recorded_at = …) | **morto** — `visitas`: started_at = a PRIMEIRA gravação (10h), e não muda com a segunda |
| S20 | VIS-40 | last_recorded_at congelado | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (4 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o contador nasce com `started_at = last_recorded_at = …) | **morto** — `visitas`: last_recorded_at = a última linha NOVA (12h); a repetida das 14h não conta |
| S21 | VIS-40 | last_recorded_at sem greatest (gravação anterior puxa para trás) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (4 casos; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o contador nasce com `started_at = last_recorded_at = …) | **morto** — `visitas`: gravação nova às 11h (anterior à última) ⇒ last_recorded_at continua 12h, started_at continua 10h |
| S22 | VIS-14 | a visita repetida responde 'gravada' | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `visitas`: A de novo na segunda ⇒ repetida |
| S23 | VIS-40 | a visita REPETIDA também avança last_recorded_at | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `visitas`: last_recorded_at = a última linha NOVA (12h); a repetida das 14h não conta |
| S24 | VIS-33/38 | contagem_desde_dia pelo dia em UTC ('::date' na sessão) — G7 | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (6 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — os dois DIAS do contador são o dia de Brasília (VIS-33, conserto G7 da r2) …) | **morto** — `visitas`: contagem_desde_dia = 20/10 (23h59:59 de Brasília), e não 21/10 (o dia em UTC) |
| S25 | VIS-33/40 | ultima_visita_dia pelo dia em UTC ('::date' na sessão) — G7 | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (5 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — os dois DIAS do contador são o dia de Brasília (VIS-33, conserto G7 da r2) …) | **morto** — `visitas`: ultima_visita_dia = 21/10 (22h30 de Brasília) — "ontem" no painel —, e não 22/10 (o dia em UTC, que o painel escreveria "hoje") |
| S24b | VIS-33/38 | contagem_desde_dia por to_char em UTC (sem ::date nenhum) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — os dois DIAS do contador são o dia de Brasília (VIS-33, conserto G7 da r2) …) | **morto** — `visitas`: contagem_desde_dia = 20/10 (23h59:59 de Brasília), e não 21/10 (o dia em UTC) |
| S26 | VIS-33/10 | expira_em = o começo de HOJE (o timer da virada viraria laço) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `dia`: expira_em = a próxima 00:00 de Brasília |
| S29 | VIS-44 | teto_dia some quando o teto é no primeiro dia do período aberto (> v_desde) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) `teto_dia` sai só quando o dia …) | vivo (dia, visitas, vendas, teto, papeis) |
| S30 | VIS-33/39 | store_production_host cai no domínio próprio quando vazio | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 2. store_production_host — UMA leitura do host, com `search_path` vazio lê `store_settings.anal…) | vivo (dia, visitas, vendas, teto, papeis) |
| S31 | VIS-30 | a poda da leitura por v_hoje puro (p_agora futuro apaga o presente) | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44) poda com `least(v_hoje, store_d…) | **morto** — `visitas`: store_movement com p_agora em 2999 não apaga os 8 dias do presente |
| S32 | VIS-28 | store_clock sem grant ao service_role | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (3 casos; ex.: `visitasSchema.test.ts` — 4. store_clock — definer, só o service_role `grant execute … to service_role` — e a NENHUM outr…) | **morto** — `papeis`: permission denied for function store_clock |
| S33 | VIS-14/16/27 | store_clock: 'ate' = o começo de HOJE (prazo no passado nas respostas robô/interno/limite) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 · store: 5726 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S33b | VIS-14/16/27 | store_clock: 'ate' = a meia-noite de DEPOIS de amanhã (prazo 24 h longo demais) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 · store: 5726 casos) | vivo (dia, visitas, vendas, teto, papeis) |
| S34 | VIS-14 | record_store_visit: 'ate' = depois de amanhã | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 4. record_store_visit — a ordem do corpo o dia vem de `store_day(p_agora)` e o prazo de `store_…) | **morto** — `visitas`: `ate` = a próxima 00:00 de Brasília, em ms |
| S37 | VIS-15 | a varredura de visitas começa na segunda (Ontem perde o domingo numa segunda) | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `visitas`: dom/seg: Ontem = 1 |
| S43 | VIS-33 | store_movement sem o revoke de anon | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (1 caso; ex.: `visitasSchema.test.ts` — 5. store_movement — só admin, pela RPC `execute` revogado de public e anon, concedido SÓ a `aut…) | vivo (dia, visitas, vendas, teto, papeis) |
| S44 | VIS-28/30 | prune_store_visits nascendo security definer | `20261021120000_71-visitas-unicas.sql` | **morto — asserção** (2 casos; ex.: `visitasSchema.test.ts` — 3. prune_store_visits é `security invoker`, escrito por extenso — nunca definer…) | vivo (dia, visitas, vendas, teto, papeis) |
| S46 | VIS-33 | a resposta da leitura carrega um id de visitante | `20261021120000_71-visitas-unicas.sql` | vivo (store: 961 casos) | **morto** — `vendas`: a resposta não carrega id nenhum |
| F01 | VIS-23 | robô gravando (portão 4 desligado) | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar user agent HeadlessChrome ⇒ `robô`…) | — |
| F02 | VIS-23 | host interno contando (só a ausência de Origin recusa) | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar origem de homologação https://umaestrelinha-store-five…) | — |
| F03 | VIS-23 | sem Origin contando no servidor | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar sem `Origin` ⇒ `interno`…) | — |
| F04 | VIS-21 | id inválido / chave extra gravando (só JSON ilegível recusa) | `handlers.ts` | **morto — asserção** (10 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado sem `id`…) | — |
| F05 | VIS-27 | sem IP vira balde único ('sem-ip') | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP SEM IP, a 31ª chamada ⇒ 200 — sem IP libera, nunca um b…) | — |
| F06 | VIS-29 | o log da gravação leva o id | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado UUID v4 em MAIÚSCULAS é aceito, e o id va…) | — |
| F06b | VIS-29 | o log do 429 leva o IP | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP a 31ª chamada do mesmo IP no minuto ⇒ 429 { dia, ate, a…) | — |
| F06c | VIS-29 | o log do robô leva o user agent | `handlers.ts` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-23 — robô e origem ⇒ 200, sem gravar user agent HeadlessChrome ⇒ `robô`…) | — |
| F07 | VIS-29 | o handler lê Authorization | `handlers.ts` | **morto — erro proposital do arquivo** (50 casos) | — |
| F08 | VIS-14 | o handler manda p_agora (a borda decide o dia) | `handlers.ts` | **morto — asserção** (2 casos; ex.: `handlers.test.ts` — VIS-21 — corpo hostil ⇒ 400, `inválido`, nada gravado UUID v4 em MAIÚSCULAS é aceito, e o id va…) | — |
| F09 | VIS-27/16 | o 429 do cache devolve o 'agora' velho do cache | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP a 31ª chamada do mesmo IP no minuto ⇒ 429 { dia, ate, a…) | — |
| F10 | VIS-27 | teto por IP off-by-one (31 por minuto) | `rateLimit.ts` | **morto — asserção** (4 casos; ex.: `identify.test.ts` — identify — o teto por IP (IDN-09) deixa passar 20 e recusa a seguinte, do mesmo IP…) | — |
| F11 | VIS-29 | o 405 sai sem linha de log | `handlers.ts` | **morto — asserção** (3 casos; ex.: `handlers.test.ts` — VIS-29 — preflight e método GET ⇒ 405, log `inválido`, nenhuma RPC…) | — |
| F12 | VIS-29 | o preflight OPTIONS registra linha de log | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-29 — preflight e método OPTIONS ⇒ preflight com CORS, sem log e sem RPC…) | — |
| F13 | VIS-27 | o desfecho 'teto' vira erro 500 | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-14 — a gravação desfecho `teto` é repassado com o dia e o prazo DO BANCO…) | — |
| F14 | VIS-23 | o relógio (e o host) dos portões 4–6 vem do CACHE quando há um | `handlers.ts` | **morto — asserção** (5 casos; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP a 31ª chamada do mesmo IP no minuto ⇒ 429 { dia, ate, a…) | — |
| F15 | VIS-27/16 | o cache do relógio nunca expira (o 429 depois da meia-noite devolve o prazo de ontem) | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — o ClockCache nasce vazio, guarda até o próprio `ate`, e cada instância é independente…) | — |
| F17 | VIS-27 | sem cache, o 429 não tenta store_clock (sai sem relógio) | `handlers.ts` | **morto — asserção** (2 casos; ex.: `handlers.test.ts` — VIS-27 — 30 gravações por minuto por IP sem relógio no cache, o 429 lê `store_clock` e responde…) | — |
| F18 | VIS-14/16 | o relógio aceita prazo não inteiro | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — portão 3 — o relógio do banco `store_clock` com forma errada (prazo não numérico) ⇒ 500, `erro`…) | — |
| F20 | VIS-29 | desfecho fora do contrato repassado (sem a lista GRAVACAO) | `handlers.ts` | **morto — asserção** (1 caso; ex.: `handlers.test.ts` — VIS-14 — a gravação `record_store_visit` com desfecho fora do contrato ⇒ 500, `erro` (nunca rep…) | — |
| F23 | VIS-27 | a janela do teto por IP fechada (<=): a batida de exatamente 60 s atrás ainda conta | `rateLimit.ts` | vivo (functions: 957 · store: 5726 casos) | — |
| F24 | VIS-27 | clientIp pega o ÚLTIMO item de x-forwarded-for | `rateLimit.ts` | **morto — asserção** (2 casos; ex.: `identify.test.ts` — identify — o teto por IP (IDN-09) o IP sai do primeiro valor de `x-forwarded-for`, com `cf-conn…) | — |
| X01 | VIS-29 | [functions.visit] com verify_jwt = true | `config.toml` | **morto — asserção** (4 casos; ex.: `handlers.test.ts` — VIS-29 — `[functions.visit]` com `verify_jwt = false` no `config.toml` `verify_jwt` é `false` n…) | — |
| C01 | VIS-23 | robô por prefixo (startsWith) em vez de substring | `bots.ts` | **morto — asserção** (16 casos; ex.: `bots.test.ts` — isBotUserAgent Googlebot é robô…) | — |
| C05 | VIS-23 | regex ingênua /bot/i somada à lista (o Cubot vira robô) | `bots.ts` | **morto — asserção** (1 caso; ex.: `bots.test.ts` — isBotUserAgent CUBOT_X30 NÃO é robô…) | — |
| C08 | VIS-23 | uma assinatura a menos ('DuckDuckBot') | `bots.ts` | **morto — asserção** (2 casos; ex.: `bots.test.ts` — BOT_SIGNATURES — âncora são exatamente as 20 assinaturas da spec, por extenso…) | — |
| C02 | VIS-21 | uma chave extra no corpo aceita | `visitor.ts` | **morto — asserção** (5 casos; ex.: `visitor.test.ts` — visitBodyRefusal — o que o servidor recusa chave extra `force` ⇒ `chave`…) | — |
| C06 | VIS-21 | UUID v4 diferenciando maiúsculas | `visitor.ts` | **morto — asserção** (2 casos; ex.: `visitor.test.ts` — isVisitorId — UUID v4 aceita v4, inclusive em maiúsculas…) | — |
| C09 | VIS-21 | UUID: o nibble de variante qualquer (aceita fora do RFC 4122) | `visitor.ts` | **morto — asserção** (1 caso; ex.: `visitor.test.ts` — isVisitorId — UUID v4 recusa variante fora de 8/9/a/b…) | — |
| C09b | VIS-21 | UUID: aceita as versões 1 a 5 (não só a 4) | `visitor.ts` | **morto — asserção** (2 casos; ex.: `visitor.test.ts` — isVisitorId — UUID v4 recusa v1…) | — |
| C03 | VIS-42/43 | o link liga quando devia desligar | `optOut.ts` | **morto — asserção** (3 casos; ex.: `optOut.test.ts` — optOutHref — o link que o painel abre ligar ⇒ `/?nao-contar=1` na origem da loja…) | — |
| C11 | VIS-42 | '?nao-contar=0' não desliga mais a marca | `optOut.ts` | **morto — asserção** (3 casos; ex.: `optOut.test.ts` — optOutHref — o link que o painel abre o link que o painel escreve é o que a loja lê…) | — |
| C04 | VIS-09 | o dia escrito por new Date (meia-noite UTC vira o dia anterior) | `format.ts` | **morto — asserção** (2 casos; ex.: `format.test.ts` — no fuso de processo America/Sao_Paulo formatDayMonth escreve DD/MM por corte de texto…) | — |
| C07 | VIS-10/38/40 | a hora escrita no fuso do APARELHO (sem timeZone) | `format.ts` | **morto — asserção** (6 casos; ex.: `format.test.ts` — no fuso de processo UTC formatStoreHour escreve a hora de Brasília em HHhMM…) | — |
| C13 | VIS-10 | a hora escrita 'HH:MM' (não 'HHhMM') | `format.ts` | **morto — asserção** (9 casos; ex.: `format.test.ts` — no fuso de processo UTC formatStoreHour escreve a hora de Brasília em HHhMM…) | — |
| C14 | VIS-34 | o fuso do dono em TypeScript diverge do SQL (America/Bahia) | `zone.ts` | **morto — asserção** (1 caso; ex.: `format.test.ts` — o dono do fuso STORE_TIME_ZONE é America/Sao_Paulo…) | — |
| V01 | VIS-18 | marcador gravado ANTES do sucesso (otimista, antes do POST) | `VisitCounter.tsx` | **morto — asserção** (6 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 500 ⇒ sem prazo; UMA tentativa a mais na próxima navegação; depois nenhuma…) | — |
| V02 | VIS-24 | a recusa de cookies não apaga o id | `cookieConsentStore.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-24 — a recusa com a store REAL save(false) + navegar (já no dia seguinte) ⇒ zero fetch, e o…) | — |
| V03a | VIS-24/22 | a recusa de cookies não para o contador (statistics fixo em true na fiação) | `VisitCounter.tsx` | **morto — asserção** (7 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama Estatísticas recusada ⇒ nenhuma chamada, e nenhum id criado…) | — |
| V03b | VIS-22/24 | a decisão pura ignora a recusa de Estatísticas | `refusal.ts` | **morto — asserção** (8 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama Estatísticas recusada ⇒ nenhuma chamada, e nenhum id criado…) | — |
| V04 | VIS-25 | a recusa feita em outra aba é ignorada (sem syncFromStorage) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera trava segurada ⇒ OUTRA aba gra…) | — |
| V05 | VIS-25 | a releitura aplica armazenamento ausente (volta a "aceito") | `cookieConsentStore.ts` | **morto — asserção** (3 casos; ex.: `cookieConsentStore.test.ts` — VIS-25 — syncFromStorage relê a escolha feita em outra aba armazenamento AUSENTE mantém a memór…) | — |
| V06 | VIS-22/17 | o contador montado também na prévia (App) | `App.tsx` | **morto — asserção** (2 casos; ex.: `contadorMontado.test.tsx` — VIS-17 — o contador está montado no App âncora: o App foi lido e a forma `{!previewMode && <Vis…) | — |
| V06b | VIS-22 | a decisão pura conta na prévia | `refusal.ts` | **morto — asserção** (1 caso; ex.: `refusal.test.ts` — VIS-22 — a decisão de contar janela de prévia do painel ⇒ não conta…) | — |
| V34 | VIS-22 | a fiação diz preview: false (a decisão nunca vê a prévia) | `VisitCounter.tsx` | vivo (store: 300 · store: 5726 casos) | — |
| V07 | VIS-22 | a decisão pura conta em host interno | `refusal.ts` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama host de produção configurado e a loja em localhost ⇒ nenhuma chamada,…) | — |
| V08 | VIS-22 | a decisão pura ignora webdriver | `refusal.ts` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama navigator.webdriver ⇒ nenhuma chamada…) | — |
| V08b | VIS-22 | webdriver ignorado na fiação | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama navigator.webdriver ⇒ nenhuma chamada…) | — |
| V08c | VIS-22/23 | a decisão pura ignora o user agent de robô | `refusal.ts` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama user agent de robô ⇒ nenhuma chamada…) | — |
| V09 | VIS-19 | sem id (armazenamento que não grava), chama assim mesmo | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-19 — o componente montado sem armazenamento que grava (conserto G5 da verificação r1) `setI…) | — |
| V10 | VIS-16 | o prazo guardado é o do relógio do SERVIDOR (sem converter por duração) | `visitor.ts` | **morto — asserção** (2 casos; ex.: `marker.test.ts` — saveClock — o prazo no relógio LOCAL, por duração grava `ate = Date.now() + (ate − agora)` do s…) | — |
| V11 | VIS-16 | relógio que voltou não chama de novo | `visitor.ts` | **morto — asserção** (1 caso; ex.: `marker.test.ts` — markerAllowsCall — VIS-16 `agora < em` (o relógio voltou) ⇒ chama…) | — |
| V12 | VIS-17 | tentativa síncrona na montagem (fora do agendador) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico nenhum fetch antes de o agendador disparar; depois dele, um…) | — |
| V13 | VIS-17 | sem requestIdleCallback, a troca de rota espera um load que não vem | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico sem requestIdleCallback e com o documento já carregado (troca …) | — |
| V14 | VIS-20 | dentro da trava, ignora o id que já está gravado (cria outro) | `visitor.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo passado o prazo (virou o dia), a navegação seguinte chama de nov…) | — |
| V15 | VIS-42 | ?nao-contar sai do endereço com entrada nova no histórico (push) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL =1: grava a marca, apaga o id mantendo o prazo, ti…) | — |
| V37 | VIS-42 | ?nao-contar sai por history.replaceState cru (o router não sabe da troca) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL =1: grava a marca, apaga o id mantendo o prazo, ti…) | — |
| V48 | VIS-42 | ?nao-contar=1 apaga também os outros parâmetros (utm) | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL =1: grava a marca, apaga o id mantendo o prazo, ti…) | — |
| V16 | VIS-42 | ?nao-contar=1 não apaga o id | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-42 — o parâmetro de não contar, pela URL =1: grava a marca, apaga o id mantendo o prazo, ti…) | — |
| V17 | VIS-13 | o corpo leva uma chave a mais (o dia do aparelho) | `send.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo 5 navegações ⇒ 1 chamada; o marcador guarda o id e o prazo em re…) | — |
| V18 | VIS-13 | o envio leva os cookies (credentials include) | `send.ts` | **morto — asserção** (1 caso; ex.: `send.test.ts` — VIS-13 — o pedido sem cookies (credentials omit) e sem keepalive…) | — |
| V21 | VIS-13 | o envio leva o JWT da SESSÃO (Authorization) | `send.ts` | **morto — asserção** (26 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico nenhum fetch antes de o agendador disparar; depois dele, um…) | — |
| V19 | VIS-18 | duas tentativas a mais em vez de uma | `VisitCounter.tsx` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 500 ⇒ sem prazo; UMA tentativa a mais na próxima navegação; depois nenhuma…) | — |
| V19b | VIS-18 | nenhuma tentativa a mais depois de uma falha | `VisitCounter.tsx` | **morto — asserção** (6 casos; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 500 ⇒ sem prazo; UMA tentativa a mais na próxima navegação; depois nenhuma…) | — |
| V20 | VIS-18/16 | 429 com relógio tratado como falha | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-18 — a falha 429 com relógio ⇒ grava o prazo e não tenta mais no dia…) | — |
| V33 | VIS-16/18 | qualquer status com relógio grava o prazo (500 com {ate, agora} também) | `VisitCounter.tsx` | vivo (store: 300 · store: 5726 casos) | — |
| V22 | VIS-42/22 | a marca de não contar ignorada na fiação | `VisitCounter.tsx` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama a marca de não contar ⇒ nenhuma chamada…) | — |
| V23 | VIS-22 | não espera store_settings (settingsLoaded sempre true na fiação) | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama com a página NO HOST PADRÃO (conserto G6 da verificação r1) leitura s…) | — |
| V24 | VIS-22/17 | a chegada da configuração não reagenda (deps só pathname) | `VisitCounter.tsx` | **morto — asserção** (3 casos; ex.: `VisitCounter.test.tsx` — VIS-17 — fora do caminho crítico sem requestIdleCallback e com o documento já carregado (troca …) | — |
| V25 | VIS-26 | "Salvar escolhas" ignora o interruptor de Estatísticas | `CookiePreferencesSheet.tsx` | **morto — asserção** (2 casos; ex.: `CookieNotice.test.tsx` — a folha "Preferências de cookies" (AVS-04) medição DESLIGADA: "Salvar escolhas" grava a escolha…) | — |
| V26 | VIS-36/37 | a política diz 90 dias | `PrivacyPolicyPage.tsx` | **morto — asserção** (5 casos; ex.: `PrivacyPolicyPage.test.tsx` — PrivacyPolicyPage — a medição de audiência (PRV-01) tem exatamente quatro parágrafos: os três a…) | — |
| V27 | VIS-34 | o fuso escrito à mão fora do dono | `orderMeta.ts` | **morto — asserção** (3 casos; ex.: `fusoComDonoUnico.test.ts` — VIS-34 — o fuso da loja tem um dono só em TypeScript só o dono escreve o nome do fuso — sem all…) | — |
| V28 | VIS-12 | a chave do visitante escrita fora do dono | `VisitCounter.tsx` | **morto — asserção** (2 casos; ex.: `visitanteComDonoUnico.test.ts` — VIS-12 — as chaves do contador têm um dono só só o dono cita as chaves…) | — |
| V29 | VIS-12/15 | saveClock apaga o id a cada resposta (um id novo por dia — a semana somaria o navegador) | `visitor.ts` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo 5 navegações ⇒ 1 chamada; o marcador guarda o id e o prazo em re…) | — |
| V30 | VIS-16 | o 'em' do marcador é o instante do SERVIDOR (aparelho atrasado ⇒ chama a cada navegação) | `visitor.ts` | **morto — asserção** (1 caso; ex.: `marker.test.ts` — saveClock — o prazo no relógio LOCAL, por duração grava `ate = Date.now() + (ate − agora)` do s…) | — |
| V31 | VIS-16 | 'agora === em' passa a chamar (em < agora) | `visitor.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo 5 navegações ⇒ 1 chamada; o marcador guarda o id e o prazo em re…) | — |
| V32 | VIS-16 | 'agora === ate' não chama (agora <= ate) | `visitor.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo passado o prazo (virou o dia), a navegação seguinte chama de nov…) | — |
| V38 | VIS-24 | o id é apagado também no ACEITE ("Salvar" com Estatísticas ligada) | `cookieConsentStore.ts` | **morto — asserção** (1 caso; ex.: `cookieConsentStore.test.ts` — VIS-24 — recusar apaga o código do contador, e só o código com Estatísticas LIGADA o marcador n…) | — |
| V39 | VIS-25 | a releitura entre abas fecha a folha de preferências | `cookieConsentStore.ts` | **morto — asserção** (1 caso; ex.: `cookieConsentStore.test.ts` — VIS-25 — syncFromStorage relê a escolha feita em outra aba não fecha a folha de preferências ab…) | — |
| V50 | VIS-42 | qualquer valor guardado na marca tira da contagem (não só '1') | `visitor.ts` | **morto — asserção** (1 caso; ex.: `visitor.test.ts` — a marca de não contar (VIS-42) só `'1'` é marca: outro valor guardado não tira ninguém da conta…) | — |
| X02 | VIS-24 | sem a decisão DE REDE depois da trava | `VisitCounter.tsx` | vivo (store: 300 · store: 5726 casos) | — |
| X03 | VIS-16 | sem a trava de "uma em voo" | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-16 — uma chamada por prazo uma chamada em voo por vez: navegar com o POST no ar não dispara…) | — |
| X04 | VIS-16/18 | resposta com 'ate' e sem 'agora' aceita como relógio | `send.ts` | **morto — asserção** (1 caso; ex.: `send.test.ts` — VIS-16/VIS-18 — a resposta agora ausente ⇒ sem relógio (conta como falha)…) | — |
| X19 | VIS-25 | sem a marca memoriaSemGravar (o aceite antigo desfaz a recusa) | `cookieConsentStore.ts` | **morto — asserção** (2 casos; ex.: `VisitCounter.test.tsx` — VIS-25 — a recusa feita em outra aba gravação que lança + recusa + navegar ⇒ a recusa continua …) | — |
| G4a | VIS-24/42 | conserto G4 desfeito na fiação: ensureVisitorId sem a decisão | `VisitCounter.tsx` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera trava segurada ⇒ save(false) ⇒…) | — |
| G4b | VIS-24/42 | conserto G4 desfeito no módulo: criarOuLer não pergunta 'podeSeguir' | `visitor.ts` | **morto — asserção** (8 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera trava segurada ⇒ save(false) ⇒…) | — |
| N3 | VIS-24/25 | a decisão DENTRO da trava sem syncFromStorage (recusa de outra aba durante a trava) — G8 | `VisitCounter.tsx` | **morto — asserção** (1 caso; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera trava segurada ⇒ OUTRA aba gra…) | — |
| N6 | VIS-24 | esquecer o id apaga também o prazo (reaceitar no mesmo dia conta de novo) | `visitor.ts` | **morto — asserção** (5 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera id JÁ guardado + trava segurad…) | — |
| N7 | VIS-22 | a decisão pura não espera a configuração (sem 'esperando') | `refusal.ts` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-22 — quando não chama com a página NO HOST PADRÃO (conserto G6 da verificação r1) leitura s…) | — |
| N8 | VIS-24/42 | a decisão da trava avaliada ANTES de pedir a trava (congelada) | `VisitCounter.tsx` | **morto — asserção** (4 casos; ex.: `VisitCounter.test.tsx` — VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera trava segurada ⇒ save(false) ⇒…) | — |
| P1a | VIS-12 | a store de cookies passa a trazer 'readMarker' | `cookieConsentStore.ts` | **morto — asserção** (2 casos; ex.: `idDoVisitanteSoNoEnvio.test.ts` — VIS-12 — o id do navegador só viaja pela function `visit` âncora: o colhedor enxerga o consumid…) | — |
| P1b | VIS-12 | um widget passa a trazer 'ensureVisitorId' pelo barril | `CookiePreferencesSheet.tsx` | **morto — asserção** (1 caso; ex.: `idDoVisitanteSoNoEnvio.test.ts` — VIS-12 — o id do navegador só viaja pela function `visit` só `app/VisitCounter.tsx` traz `ensur…) | — |
| B01 | VIS-06 | erro de leitura vira ZERO (o painel mostra 0 em vez do erro) | `useStoreMovement.ts` | **morto — asserção** (3 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) o `{ error }` do supabase-js (que NÃO rejeita) vi…) | — |
| B02 | VIS-35 | o card "Pedidos Hoje" de volta | `AdminDashboard.tsx` | **morto — asserção** (2 casos; ex.: `AdminDashboard.test.tsx` — VIS-35 — saem "Pedidos Hoje" e "Fat. Hoje" o Dashboard renderizado não contém "Pedidos Hoje" ne…) | — |
| B03 | VIS-01 | o Dashboard não monta o bloco | `AdminDashboard.tsx` | **morto — asserção** (9 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` a raiz da página tem, nesta ordem: o…) | — |
| B34 | VIS-01 | o bloco montado DEPOIS da grade antiga (não é mais a primeira seção) | `AdminDashboard.tsx` | **morto — asserção** (1 caso; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` a raiz da página tem, nesta ordem: o…) | — |
| B04 | VIS-10d | o canal depende do callback (recria a cada render) | `useOrdersRealtime.ts` | **morto — asserção** (4 casos; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras o Dashboard montado abre UM canal, `admin-ord…) | — |
| B05 | VIS-10c | a virada medida pelo relógio da dona (expira_em − Date.now()) | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c) relógio da dona ADIANTAD…) | — |
| B06 | VIS-10c | a virada sem o piso de 1 s | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c) duração menor que 1 s (o…) | — |
| B07 | VIS-09 | a linha de Hoje escrita por new Date | `labels.ts` | **morto — asserção** (28 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` a raiz da página tem, nesta ordem: o…) | — |
| B08 | VIS-38 | "Contando desde" some no dia da contagem (>=) | `labels.ts` | **morto — asserção** (4 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-38 — "Contando desde", quando o período começa antes da contagem On…) | — |
| B09 | VIS-39 | o host do texto escrito à mão (não o do banco) | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-39 — o contador sem nenhuma visita registrada o host é o que o BANC…) | — |
| B10 | VIS-40 | "hoje" comparado com o relógio do navegador | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-40 — a última visita, comparada com o `hoje` e o `ontem` do BANCO h…) | — |
| B11 | VIS-44 | o teto aparece em toda aba | `labels.ts` | **morto — asserção** (10 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-44 — o teto do dia, só nos períodos que contêm o dia teto hoje: apa…) | — |
| B12 | VIS-39 | contador nunca usado mostra 0 | `labels.ts` | **morto — asserção** (4 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-07 — os valores VIS-39: contador nunca usado ⇒ Visitas `—`, NUNCA `…) | — |
| B13 | VIS-07/32 | o ticket recalculado na tela | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-07 — os valores Visitas e Vendas inteiros, Faturamento em reais, Ti…) | — |
| B14 | VIS-05 | sem aria-busy na primeira carga | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-05 — carregando resposta segurada: esqueleto nos quatro cards, `aria-busy`, e nenhum número…) | — |
| B15 | VIS-06 | erro na primeira carga não mostra a mensagem | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha primeira carga com `{ error }`: UMA mensagem, UM botão de 44px, nenhum…) | — |
| B16 | VIS-10/06 | releitura que falha esconde os valores | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha releitura que FALHA com dados na tela: os valores ficam, e o "Atualiza…) | — |
| B17 | VIS-05 | o StatCard mostra o valor enquanto carrega | `StatCard.tsx` | **morto — asserção** (3 casos; ex.: `StatCard.test.tsx` — StatCard — carregando e ⓘ (feature 71) carregando: nenhum `<p>` de valor e nenhum número no car…) | — |
| B19 | VIS-06 | três novas tentativas em vez de uma | `useStoreMovement.ts` | **morto — asserção** (3 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) o `{ error }` do supabase-js (que NÃO rejeita) vi…) | — |
| B22 | VIS-41 | o rótulo vira "Pessoas únicas" | `StoreMovement.tsx` | **morto — asserção** (5 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` o bloco é o real: as abas e os quatr…) | — |
| B23 | VIS-04 | a RPC passa a receber a data do navegador | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — a leitura (VIS-04, VIS-33) chama a RPC `store_movement` SEM segundo argument…) | — |
| B24 | VIS-42/43 | o link "sem contar" escrito à mão (fora de optOutHref) | `AccountMenu.tsx` | **morto — asserção** (2 casos, só na fase B; ex.: `parametroNaoContarComDonoUnico.test.ts` — VIS-42 — o parâmetro de "não contar" tem um dono só fora do dono (e do teste dele), NINGUÉM esc…) | — |
| B25 | VIS-43 | "Abrir a loja sem contar" não some sem VITE_STORE_URL | `AccountMenu.tsx` | **morto — asserção** (2 casos; ex.: `AccountMenu.test.tsx` — AccountMenu — os itens sem `VITE_STORE_URL`, "Abrir a loja" não é oferecido…) | — |
| B38 | VIS-43 | "Abrir a loja sem contar" abre na MESMA aba | `AccountMenu.tsx` | **morto — asserção** (1 caso; ex.: `AccountMenu.test.tsx` — AccountMenu — "Abrir a loja sem contar" (VIS-43) aponta para a loja com o parâmetro ligado, em …) | — |
| B26 | VIS-10d | o aviso do canal não relê o movimento | `AdminDashboard.tsx` | **morto — asserção** (1 caso; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras o aviso do canal relê as estatísticas E o mov…) | — |
| B27 | VIS-35 | useAdminStats volta a carregar 'ordersToday' (campo morto) | `useAdminStats.ts` | **morto — asserção** (1 caso; ex.: `useAdminStats.test.ts` — VIS-35 — o hook não calcula mais "hoje" em UTC o objeto devolvido não tem `ordersToday` nem `re…) | — |
| B28 | VIS-11 | a TabsList perde o h-auto | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-11 — os proxies de layout, por token exato grade em 2 colunas no celular e 4 a partir de `l…) | — |
| B29 | VIS-10c | o timer da virada nunca relê | `useStoreMovement.ts` | **morto — asserção** (4 casos; ex.: `useStoreMovement.test.ts` — useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c) relógios iguais: nenhuma…) | — |
| B30 | VIS-09 | numa segunda-feira a linha diz "De 19/10 a 19/10" | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-09 — a linha do período, montada das datas do banco numa segunda-fe…) | — |
| B32 | VIS-40 | a última visita de ontem sai "em DD/MM" (sem o ramo "ontem") | `labels.ts` | **morto — asserção** (3 casos; ex.: `labels.test.ts` — no fuso de processo UTC VIS-40 — a última visita, comparada com o `hoje` e o `ontem` do BANCO o…) | — |
| B36 | VIS-11 | o valor perde o whitespace-nowrap | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-11 — os proxies de layout, por token exato o valor não quebra linha (`whitespace-nowrap`) e…) | — |
| B41 | VIS-06 | "Tentar de novo" sem o alvo de 44px | `StoreMovement.tsx` | **morto — asserção** (1 caso; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha primeira carga com `{ error }`: UMA mensagem, UM botão de 44px, nenhum…) | — |
| B43 | VIS-10 | a linha "Atualizado às" some | `StoreMovement.tsx` | **morto — asserção** (3 casos; ex.: `StoreMovement.test.tsx` — VIS-06 — a leitura falha releitura que FALHA com dados na tela: os valores ficam, e o "Atualiza…) | — |
| B45 | VIS-01 | a aba aberta por padrão é Esta semana (não Hoje) | `StoreMovement.tsx` | **morto — asserção** (26 casos; ex.: `AdminDashboard.test.tsx` — VIS-01 — o bloco é a primeira seção depois do `PageHeader` a raiz da página tem, nesta ordem: o…) | — |
| X20 | VIS-10d | o aviso do canal chama a seta da primeira montagem | `useOrdersRealtime.ts` | **morto — asserção** (1 caso; ex.: `useOrdersRealtime.test.ts` — useOrdersRealtime — o canal de pedidos do Dashboard o aviso chama o callback MAIS RECENTE, e só…) | — |
| X23 | VIS-10b | o foco da janela não relê | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — foco da janela (VIS-10 b) a janela volta a ter foco ⇒ nova leitura…) | — |
| X24 | VIS-10b | staleTime de 1 min (o foco não relê dado "fresco") | `useStoreMovement.ts` | **morto — asserção** (1 caso; ex.: `useStoreMovement.test.ts` — useStoreMovement — foco da janela (VIS-10 b) a janela volta a ter foco ⇒ nova leitura…) | — |
| P2 | VIS-10 | o widget guarda a PRIMEIRA leitura (a linha não troca na virada) | `StoreMovement.tsx` | **morto — asserção** (2 casos; ex.: `AdminDashboard.test.tsx` — VIS-10 (d) — um canal de pedidos, duas releituras o aviso do canal relê as estatísticas E o mov…) | — |

**Lote 2 — 14 execuções dirigidas**: a fixtura do verificador, com controle, contra S33 e S33b; e os
11 mutantes de SQL que só os probes mataram, contra a suíte INTEIRA da loja, sem probe:

| # | Req. | Execução | Arquivo | Suíte automatizada | Probe |
| --- | --- | --- | --- | --- | --- |
| E-limpo | VIS-14/27 | CONTROLE: só um comentário muda — a fixtura relogio-do-servidor tem de PASSAR | `20261021120000_71-visitas-unicas.sql` | — (só a fixtura) | vivo (relogio-do-servidor) |
| E33 | VIS-14/16/27 | store_clock: 'ate' = o começo de HOJE (prazo no passado nas respostas robô/interno/limite) — contra a fixtura do verificador | `20261021120000_71-visitas-unicas.sql` | — (só a fixtura) | **morto** — `relogio-do-servidor`: store_clock: `ate` = a próxima 00:00 de Brasília (22/10 03:00Z), em ms |
| E33b | VIS-14/16/27 | store_clock: 'ate' = a meia-noite de DEPOIS de amanhã (prazo 24 h longo demais) — contra a fixtura do verificador | `20261021120000_71-visitas-unicas.sql` | — (só a fixtura) | **morto** — `relogio-do-servidor`: store_clock: `ate` = a próxima 00:00 de Brasília (22/10 03:00Z), em ms |
| S02-ci | VIS-15 | semana somando dias com o texto do guarda intacto (recálculo depois do select) — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S03b-ci | VIS-03/34 | store_day em UTC com o texto do guarda intacto (ramo morto) — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S04-ci | VIS-31/03 | fronteira de dia em UTC só nas vendas: v_ini_hoje = v_hoje::timestamptz — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S06-ci | VIS-03 | semana no domingo com o texto 'isodow … - 1' do guarda intacto — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S07b-ci | VIS-31 | vendas contando estorno, com payment_status = 'approved' intacto no texto — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S11-ci | VIS-15 | v_desde = segunda-feira (numa segunda, Ontem perde o domingo) — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S22-ci | VIS-14 | a visita repetida responde 'gravada' — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S23-ci | VIS-40 | a visita REPETIDA também avança last_recorded_at — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S26-ci | VIS-33/10 | expira_em = o começo de HOJE (o timer da virada viraria laço) — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S37-ci | VIS-15 | a varredura de visitas começa na segunda (Ontem perde o domingo numa segunda) — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |
| S46-ci | VIS-33 | a resposta da leitura carrega um id de visitante — a suíte INTEIRA da loja, sem probe | `20261021120000_71-visitas-unicas.sql` | vivo (store: 5726 casos) | — |

**Leitura do sensor.**

- **Lote 1: 169 mutantes — 163 mortos, 6 vivos.** 151 morrem por asserção de **régua** (em cada um,
  pelo menos um caso que não é sensor reprova), 11 de SQL morrem só pelos probes, e 1 (F07) pelo
  arame proposital do arquivo — o `Proxy` de `pedir()` que **lança** ao ler `Authorization`, derrubando
  50 casos: é a forma que o próprio teste escolheu para provar "não lê" (`handlers.test.ts:76-121`).
  Por camada: SQL 39 (26 régua + 11 probe, 2 vivos), function 23 (21 + F07, 1 vivo), núcleo 13 (13),
  loja 56 (53, 3 vivos), painel 38 (38 — B24 só na fase B, pelo guarda
  `parametroNaoContarComDonoUnico` da suíte da loja, que é onde ele mora).
- **Todos os pedidos explícitos da tarefa morreram**: semana somando dias (S01 pela régua; S02, com o
  texto do guarda intacto, pelo probe), fronteira de dia em UTC (S03 pela régua; S03b e S04 pelo
  probe; C07, B07 e B10 por asserção), semana começando no domingo (S05 pela régua; S06 pelo probe),
  marcador gravado antes do sucesso (V01), recusa de cookies que não apaga ou não para (V02, V03a,
  V03b, V04, V38, G4a, G4b, N3, N6, N8), prévia e host interno contando (V06, V06b, V07, F02, F03,
  F14), robô gravando (F01, V08, V08b, V08c, C01, C05, C08), id inválido gravando (F04, C02, C06, C09,
  C09b), vendas contando pedido não pago (S07 pela régua; S07b, o estorno, pelo probe), ticket
  dividindo por zero (S08: a régua e `division by zero` nos cinco probes), erro de leitura virando 0
  (B01), cards antigos de volta (B02, B27) e o Dashboard sem o bloco (B03 — e B34, com o bloco montado
  depois da grade).
- **43 dos 169 são mutantes novos desta rodada** (S24b, S33, S33b, S34, S37, S43, S44, S46, F06b,
  F06c, F15, F17, F18, F20, F23, F24, C08, C09, C09b, C11, C13, C14, V19b, V21, V29–V34, V37–V39,
  V48, V50, B30, B32, B34, B36, B38, B41, B43, B45). Os 6 sobreviventes saem todos daí: S33 e S33b
  são **G9**; F23, V33 e V34 são observações (abaixo); X02 é o da r2, agora medido.
- **Lote 2 confirma as duas leituras que dependiam de execução**: a fixtura do verificador passa no
  código atual (E-limpo) e mata S33 e S33b pela frase do `ate` (E33, E33b) — G9 é cobertura, não
  defeito —; e os **11** mutantes de SQL que só os probes matam são **invisíveis à suíte inteira da
  loja** (5.726 casos, sem probe): o CI não os pegaria. São os 9 que a r2 listou (S02, S03b, S04,
  S06, S07b, S11, S22, S23, S26) mais dois desta rodada (S37, S46).
- **Os consertos das rodadas anteriores morrem pela régua, nunca só por incidental**: X01 (G1), S19,
  S20, S21 (G2), S10 (G3), G4a, G4b, N8 (G4), V09 (G5), V23, N7 (G6), P1a, P1b (P1), P2 (P2), S08b (H1),
  S24, S25 (G7) e N3 (G8). S23 (G2) continua morrendo só pelo probe, como na r2.

### Lacunas, em ordem de severidade — e o conserto de cada uma

> **Nenhuma é defeito do comportamento medido.** O código de hoje devolve o prazo certo: a fixtura
> deste verificador passa nele (E-limpo, 6 `ok`) e reprova os dois mutantes (E33, E33b). É uma
> afirmação da spec que **nenhum teste, guarda ou probe do repositório discrimina** — o que o
> `validate.md` manda transformar em tarefa de conserto antes de fechar.

**G9 · `VIS-27` e `VIS-16` (e o `ate` de `VIS-14`) — o PRAZO que `store_clock` devolve não tem prova.
Ele é o `ate` das respostas `200 robô`, `200 interno` e `429 limite`, e S33 (prazo = o começo de hoje)
e S33b (prazo = a meia-noite de depois de amanhã) sobrevivem ao guarda, aos cinco probes e à suíte
inteira da loja.**

- A spec define o `ate` uma vez — "epoch em ms da próxima 00:00 de Brasília" (`VIS-14`) — e o usa nas
  respostas que não gravam: o `429` sai "com `{ dia, ate, agora }`" (`VIS-27`), e o navegador grava o
  prazo de **qualquer** `200` ou `429` com relógio e não chama de novo antes dele (`VIS-16`: "aparelho
  adiantado 2 h e 5 navegações depois de um `200` ⇒ no máximo 1 chamada"). Nas respostas `robô`,
  `interno` e `limite`, quem calcula esse `ate` é `store_clock`
  (`20261021120000_71-visitas-unicas.sql:208-209`), não `record_store_visit`.
- **O que existe prova só o OUTRO produtor do mesmo campo.** A régua "o prazo é
  `store_day_start(v_dia + 1)`" (`visitasSchema.test.ts:526-529`) lê só o bloco de
  `record_store_visit`; para `store_clock` o guarda confere `definer`, `search_path`, `revoke`,
  `grant`, qualificação e o `::bigint` de `ate`/`agora` — a forma, nunca o valor. O probe
  `visitas.sql` confere o `ate` da gravação; o único probe que chama `store_clock`
  (`papeis.sql:40-44`) confere `dia` e a presença de `production_host`, e `vendas.sql:159` só o host.
  O teste do handler dubla `store_clock` com o `ate` certo (`handlers.test.ts:33-38`), então prova que
  o handler **repassa** o valor, nunca que o banco o **calcula**.
- O que muda para quem usa a loja: com S33, o navegador que recebe `interno` ou `limite` grava um
  prazo no passado e passa a fazer **uma chamada por navegação** em vez de uma por dia (a promessa de
  `VIS-16` quebrada exatamente para as respostas que não gravam), e o `ClockCache` do `429` nunca
  serve (`now >= ate`), então toda recusa por IP volta a ler o banco; com S33b, um navegador barrado
  pelo teto por IP **não tenta no dia seguinte** — a visita daquele dia some da contagem.
- Prova: `relogio-do-servidor.sql` (no apêndice) — `store_clock` às 15h e às 22h30 de Brasília (a
  segunda na faixa em que o dia em UTC já é o seguinte, com a sessão em UTC) ⇒ `dia` 21/10, `ate`
  22/10 03:00Z inteiro, `agora` = o instante, e o mesmo `ate` que a gravação devolve. Passa no código
  atual e mata S33 e S33b (lote 2).
- Conserto: (1) levar a fixtura para `probes/dia.sql` (ou `papeis.sql`), com o mesmo preâmbulo;
  (2) estender ao `store_clock` a régua de `visitasSchema.test.ts:526-529` — o dia de
  `store_day(p_agora)` e o prazo de `store_day_start(v_dia + 1)` —, num `describe.each` das duas
  funções, com S33 e S33b como sensores. Uma régua só para os dois produtores evita que o terceiro
  (se vier) nasça sem prova.
- Severidade: média-baixa. Não há visita a mais em caso nenhum (quem grava continua sendo
  `record_store_visit`, provada); há tráfego a mais (S33) ou uma visita a menos para navegador barrado
  por IP (S33b). Mas é `SHALL` da spec com zero evidência no lado do banco, e o lado do banco é
  justamente o que nenhum dublê enxerga (`AD-012`).

### Observações (sem conserto exigido)

- **X02 — a decisão de rede depois da trava é defesa redundante, e agora isso está MEDIDO, não só
  argumentado.** A r2 declarou o mutante equivalente porque "nenhum navegador implementa a trava"
  resolvendo num passo seguinte ao callback. Esta rodada mediu (`trava.cjs`, apêndice): numa página
  servida em `localhost`, com `navigator.locks` presente, uma tarefa agendada **dentro** do callback
  (`setTimeout(0)` e `MessageChannel`) **nunca** roda antes da continuação depois do `await` — nas
  quatro formas (trava livre, trava disputada, e a forma exata do contador: `return await
  locks.request(…)` dentro de uma `async` e mais um `await` no chamador), 20 repetições cada, no
  **Chromium 149** e no **WebKit 26.5**. Entre a decisão de dentro da trava e a decisão de rede só
  correm microtarefas; um clique em "Salvar escolhas" (uma tarefa) não cabe no meio. O Firefox não
  foi medido (o Playwright disponível não o abriu). Mantém-se a classificação da r2, agora com
  evidência.
- **V34 — a fiação diz `preview: false` (a decisão nunca vê a prévia) sobrevive, e é equivalente na
  prática.** O contador só é montado sob `!previewMode` no `App.tsx` (V06, que tira o portão, morre
  pelo guarda `contadorMontado`), e `previewMode` é a mesma `isPreviewWindow` com os mesmos dois
  argumentos. Para a releitura dentro do componente fazer diferença, a loja teria de abrir num iframe
  **sem** `?preview=1` e depois navegar para um endereço com ele — e o `frame-ancestors` da loja só
  deixa o painel enquadrá-la, sempre com `?preview=1`. A linha é defesa barata.
- **V33 — "qualquer status com relógio grava o prazo" sobrevive, e é equivalente contra o servidor
  atual.** O cliente só se separa do mutante diante de uma resposta 4xx/5xx que traga `ate` e `agora`
  numéricos, e nenhuma resposta de falha da function traz relógio (`visit/handlers.ts`: os 405, 400
  e os três 500 são `{ error }`; e o `429` sem relógio já conta como falha no próprio cliente).
  Os casos de `VIS-18` usam corpos sem relógio (`VisitCounter.test.tsx:266`), então a régua do status
  é verdadeira nos dois mundos — se um dia o servidor passar a mandar o relógio também nas falhas, um
  caso `500 { ate, agora } ⇒ sem prazo, e a tentativa a mais acontece` fecha isso em uma linha.
- **F23 — a janela do teto por IP fechada (`<=`) sobrevive, e a fronteira não é definida pela spec.**
  O mutante só muda o veredito de uma batida de **exatamente** 60.000 ms atrás; `VIS-27` diz "30 por
  minuto" e não diz de que lado do minuto fica o milissegundo da borda. O caso da janela avança
  60.001 ms (`handlers.test.ts:199`). É código movido sem mudança da `checkout` (feature `49`), e a
  borda também não tinha caso lá.
- **Os mutantes de SQL que só os probes matam são 11, e a suíte inteira da loja (a do CI) é cega aos
  11** (lote 2): S02 (semana somando dias com o texto do guarda intacto), S03b, S04, S06, S07b, S11,
  S22, S23, S26, S37 e S46. É o risco que o autor já declarou (`tasks.md`, nota de H1: "a metade
  semântica do SQL depende dos probes, e eles NÃO rodam no CI"); esta rodada só o mede de novo, com
  dois mutantes novos (S37, S46) somando-se aos 9 da r2. Nenhum deles é lacuna — os probes os matam —,
  mas eles só morrem se alguém rodar os seis probes antes do deploy.
- **Higiene de documento** (não bloqueia): a rastreabilidade da `spec.md` (`:658-701`) ainda diz
  "aguarda verificação r2" em sete linhas — a proposta de status da r2 não foi aplicada —, e o
  cabeçalho do `tasks.md:28` também está na r1. O `CLAUDE.md` raiz (`:146-148`, `:512-514`) está certo:
  baselines iguais às medidas aqui e "Verifier independente pendente".

### Casos de borda da spec

- [x] Duas chamadas simultâneas ⇒ uma linha, as duas `200` — `concorrencia.sh` (rodado aqui).
- [x] Aba aberta da noite para a manhã ⇒ a navegação depois de `ate` registra o dia novo, com o MESMO
  id (`VisitCounter.test.tsx:229`; V29, que apagaria o id a cada resposta, morre ali); o Dashboard
  troca "Hoje, 21/10" por "Hoje, 22/10" no instante `expira_em` (`StoreMovement.test.tsx:413`).
  ⚠️ Para um navegador cuja última resposta foi `limite` (429), o prazo vem de `store_clock` — G9.
- [x] Relógio que volta ⇒ chama de novo (`marker.test.ts:116`; V11 e V31 mortos).
- [x] `production_host` vazio ⇒ tudo interno, nada gravado, o painel diz que está parado
  (`refusal.test.ts:72`, `handlers.test.ts:397`, `labels.test.ts:168`, `VisitCounter.test.tsx:367`).
- [x] Loja no `.vercel.app` com o host do domínio próprio ⇒ `interno` (`handlers.test.ts:377`), e o
  painel diz em que endereço conta (`labels.test.ts:161`).
- [x] Leitura de `store_settings` que falha na loja ⇒ o servidor decide pelo host do banco
  (`handlers.test.ts:387`).
- [x] Ids forjados enchendo o teto ⇒ `teto` e `capped_day`, e o painel avisa (`teto.sql`,
  `labels.test.ts:212`; S13, S18, S21, S29 mortos).
- [x] Paga ontem e cancelada hoje ⇒ sai de Ontem (`vendas.sql` (c)).
- [x] Venda com zero visita ⇒ os dois números como vierem (nenhum cálculo cruzado no painel).
- [x] Recusa e reaceite no mesmo dia ⇒ não conta de novo (o prazo fica: `cookieConsentStore.test.ts:157`,
  `VisitCounter.test.tsx:483`, `marker.test.ts:105`; N6 morto), inclusive com a recusa vinda de outra
  aba durante a trava (`VisitCounter.test.tsx:543` — G8 fechado).
- [x] O mesmo id depois de 8 dias ⇒ conta como novo para o banco (`visitas.sql` `fixtura_poda`).

### Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo / sem escopo a mais | ✅ — os consertos da r2 tocaram só teste, probe e documento (`tasks.md`, *Consertos da verificação r2*); o código de produção lido nesta rodada é o que a r2 mediu |
| Mudanças cirúrgicas | ✅ |
| Padrões do repositório | ✅ — guardas com âncora e sensores, `mutar()` que lança, régua por comando; o bloco G7 tem régua por campo **e** régua geral, com sensor que prova o alcance de cada uma (S24b, que só a do campo pega, foi o teste desta rodada) |
| Checagem ancorada na spec | ⚠️ — 42 de 44 no valor da spec; 2 com lacuna, as duas por G9 |
| Cobertura por camada | ⚠️ — regra pura, fiação do componente, function, painel e guardas cobertos; no SQL, o relógio (`store_clock`) tem a FORMA presa e o VALOR solto (G9) |
| Todo teste mapeia uma AC, caso de borda ou "done when" | ✅ |
| Diretrizes do projeto (`CLAUDE.md` raiz e dos módulos) | ✅ — baselines do `CLAUDE.md` raiz e do `apps/backoffice/CLAUDE.md` batem com o medido; chaves `estrelinha-visitor` e `estrelinha-nao-contar` na lista; "a próxima é a `72`" |

**UAT interativo**: não feito por este verificador. O layout (`VIS-11`), o Popover por toque e o
caminho real do gateway estão na prova em navegador do autor (`prova-em-navegador.md`); o que este
verificador levou ao navegador foi só a medida da trava (X02).

### Rastreabilidade (proposta para a `spec.md`, que ainda está no estado da r1)

| Requisito | Depois da r2 | Depois desta rodada |
| --- | --- | --- |
| VIS-24, VIS-25 | Needs fix (G8) | ✅ Verified (r3) — G8 fechado (N3 morto pelo caso novo) |
| VIS-33, VIS-38, VIS-40 | Needs fix (G7) | ✅ Verified (r3) — G7 fechado (S24, S25, S24b mortos pela régua e pelo probe) |
| VIS-27 | Verified (r2) | ❌ Needs fix — **G9** (o `ate` do 429 sai de `store_clock`, sem prova) |
| VIS-16 | Verified (r2) | ❌ Needs fix — **G9** (o prazo dos 200 `robô`/`interno` e do 429) |
| VIS-35 | Verified — assunção pendente | ✅ Verified (r3) — **assunção ainda pendente** de confirmação do usuário |
| as demais 36 | Verified (r2) | ✅ Verified (r3) — re-provadas nesta rodada (mutantes de comportamento mortos, ou o probe que os mata, conforme a tabela) |

### Lições candidatas

Escritas aqui, e **não** pelo `lessons.py` (o `list` dele reescreve e apaga o arquivo — memória do
projeto). Cada uma nasce de um achado desta rodada.

1. **Um campo do contrato com DOIS produtores precisa de prova em cada produtor.** O `ate` de
   `VIS-14` é escrito por `record_store_visit` e por `store_clock`; a régua do guarda e a fixtura do
   probe olhavam só o primeiro, e o segundo — que responde `robô`, `interno` e `limite` — saía com
   qualquer valor. Ao provar um campo, liste quem o produz antes de escrever a régua. *(S33, S33b)*
2. **O dublê do handler afirma o contrato do banco; ele não o verifica.** O teste da function dubla
   `store_clock` com o `ate` certo, então prova o repasse e é cego ao cálculo — a mesma família do
   `AD-012` ("tipo escrito à mão é afirmação"), um nível abaixo. Valor que o dublê fornece precisa de
   prova no produtor real (probe ou régua da migration). *(S33, S33b)*
3. **Equivalência por propriedade do runtime se MEDE nos runtimes-alvo, não se argumenta.** "Nenhum
   navegador resolve a trava num passo seguinte ao callback" era argumento na r2; a sonda desta
   rodada (`trava.cjs`) mede isso em Chromium e WebKit em quatro formas e transforma a observação em
   evidência — e deixa escrito o que não foi medido (Firefox). *(X02)*
4. **Um mutante morto só por probe precisa da confirmação de que a suíte do CI é cega a ele** antes
   de entrar na conta do risco declarado: sem a fase "suíte inteira, sem probe", não se sabe se o CI o
   pegaria por outro caminho. *(lote 2: 11 mutantes)*

### Apêndice — o que este verificador escreveu, para levar ao repositório

O arnês, as fixturas e as sondas ficaram fora do repositório (no diretório de rascunho da sessão, que
não sobrevive a ela). O texto que o conserto precisa está aqui.

**A fixtura `relogio-do-servidor.sql`** (G9) — passa no código atual (E-limpo: 6 `ok`) e mata S33 e
S33b (E33, E33b: *"store_clock: `ate` = a próxima 00:00 de Brasília (22/10 03:00Z), em ms"*). Dentro
de `probes/`, o preâmbulo volta a ser `\ir _comum.sql`:

```sql
-- Verificação r3 (verificador): o PRAZO que `store_clock` devolve — o `ate` das respostas `robô`,
-- `interno` e `limite` (429) — é a próxima 00:00 de Brasília, como o da gravação (VIS-14, VIS-16,
-- VIS-27). Nenhum probe nem régua do repositório confere esse valor (mutantes S33 e S33b vivos).
\set ON_ERROR_STOP 1
begin;
\ir _comum.sql

-- A sessão em UTC (o padrão do local e do hospedado).
set local timezone = 'UTC';

-- 15h de Brasília de 21/10.
select public.store_clock('2026-10-21T18:00:00Z') as c \gset
select pg_temp.confere((:'c'::jsonb ->> 'dia') = '2026-10-21', 'store_clock às 15h de 21/10 (Brasília) ⇒ dia 21/10');
select pg_temp.confere(jsonb_typeof(:'c'::jsonb -> 'ate') = 'number' and (:'c'::jsonb ->> 'ate') !~ '\.'
  and jsonb_typeof(:'c'::jsonb -> 'agora') = 'number' and (:'c'::jsonb ->> 'agora') !~ '\.',
  'store_clock: `ate` e `agora` são INTEIROS no JSON');
select pg_temp.confere((:'c'::jsonb ->> 'ate')::bigint = (extract(epoch from timestamptz '2026-10-22T03:00:00Z') * 1000)::bigint,
  'store_clock: `ate` = a próxima 00:00 de Brasília (22/10 03:00Z), em ms');
select pg_temp.confere((:'c'::jsonb ->> 'agora')::bigint = (extract(epoch from timestamptz '2026-10-21T18:00:00Z') * 1000)::bigint,
  'store_clock: `agora` = o instante do servidor, em ms');

-- 22h30 de Brasília de 21/10 (01:30Z de 22/10): o dia em UTC já é o seguinte.
select public.store_clock('2026-10-22T01:30:00Z') as c \gset
select pg_temp.confere((:'c'::jsonb ->> 'dia') = '2026-10-21'
  and (:'c'::jsonb ->> 'ate')::bigint = (extract(epoch from timestamptz '2026-10-22T03:00:00Z') * 1000)::bigint,
  'store_clock às 22h30 de 21/10 (Brasília) ⇒ dia 21/10 e `ate` 22/10 03:00Z — nunca o dia em UTC');

-- O mesmo prazo que a gravação devolve no mesmo instante.
select public.record_store_visit('ffffffff-0000-4000-8000-0000000000c1', '2026-10-21T18:00:00Z') as r \gset
select pg_temp.confere((:'r'::jsonb ->> 'ate') = (:'c'::jsonb ->> 'ate'),
  'o `ate` do relógio é o MESMO da gravação (22/10 03:00Z)');

rollback;
```

**A régua que acompanha a fixtura** (G9) — a de `visitasSchema.test.ts:526-529` estendida às duas
funções, com S33 e S33b como sensores (forma sugerida):

```ts
describe.each(['record_store_visit', 'store_clock'])('4. %s — o dia e o PRAZO vêm da régua', (nome) => {
  const bloco = (texto: string) => blocoDaFuncao(texto, nome) ?? ''
  const prazo = (texto: string) =>
    /v_dia\s+date\s*:=\s*public\.store_day\(\s*p_agora\s*\)/i.test(bloco(texto)) &&
    /v_ate\s+timestamptz\s*:=\s*public\.store_day_start\(\s*v_dia\s*\+\s*1\s*\)/i.test(bloco(texto))

  it('`v_dia` de `store_day(p_agora)` e `v_ate` de `store_day_start(v_dia + 1)`', () => {
    expect(prazo(sql)).toBe(true)
  })

  it('sensor — o prazo no começo de hoje (S33) e o de depois de amanhã (S33b) reprovam', () => {
    expect(prazo(mutarNoBloco(nome, 'store_day_start(v_dia + 1)', 'store_day_start(v_dia)'))).toBe(false)
    expect(prazo(mutarNoBloco(nome, 'store_day_start(v_dia + 1)', 'store_day_start(v_dia + 2)'))).toBe(false)
  })
})
```

**A sonda da trava** (X02) — `trava.cjs`, rodada com o `playwright-core` 1.61.1 que casa com os
navegadores instalados (Chromium 149, WebKit 26.5), numa página servida por um `http.createServer`
local em `http://localhost:<porta>/` (contexto seguro: `navigator.locks` presente). O coração dela,
avaliado 20 vezes em cada navegador:

```js
// (a) uma tarefa agendada DENTRO do callback roda antes da continuação depois do await?
let a = 'não'
await navigator.locks.request('a', async () => { setTimeout(() => { a = 'sim' }, 0); return 1 })
// (b) o mesmo com MessageChannel; (c) a forma do contador: `return await locks.request(…)` dentro de
// uma async e mais um await no chamador; (d) a trava DISPUTADA (outra requisição a segura por 50 ms)
```

Resultado nos dois navegadores, nas quatro formas, nas 20 repetições: **`'não'`** — nenhuma tarefa
roda entre o fim do callback e a continuação. O Firefox ficou de fora (o launch do Playwright não
abriu o binário instalado em 180 s).

## Fecho — 2026-10-22 (sem commit)

Não é uma rodada de verificação: é a remedição do fecho e o crítico de completude, feitos por quem
fechou a feature (autor ≠ verificador **não** vale aqui). **G9 não foi consertado** no fecho — o
veredito vigente continua sendo o da r3.

### Gates remedidos (um workspace por vez, `--testTimeout=20000` sem o `--`, exit code fora de pipe)

| Workspace | Entrada (`baseline.md`) | Fecho | Delta | Exit |
| --- | --- | --- | --- | --- |
| store | 5350/299 | **5726/312** | +376/+13 | 0 |
| backoffice | 3511/199 | **3648/207** | +137/+8 | 0 |
| core | 3414/133 | **3507/138** | +93/+5 | 0 |
| functions | 890/19 | **957/21** | +67/+2 | 0 |
| catalog-import | 512/23 | **512/23** | 0 | 0 |
| **Total** | **13677/673** | **14350/701** | **+673/+28** | |

Nenhuma queda (nenhum arquivo de teste removido). Lint **25/7** (backoffice 23/5 · store 2/2).
`tsc` 0 em `apps/store/tsconfig.app.json`, `apps/backoffice/tsconfig.app.json`,
`apps/store/tsconfig.server.json` e `tools/catalog-import/tsconfig.json`.
`git diff --name-only -- packages/core/src/payment` vazio. Em relação à r3 (14347), +3 no backoffice:
os dois consertos do ⓘ da prova de ponta a ponta (`StatCard.test.tsx` +1, `infoGutter.test.tsx` 2).

### Crítico de completude — o que ficou sem prova

1. **G9** (r3): o `ate` de `store_clock` (respostas `robô`, `interno`, `limite`) sem régua, probe ou
   teste no produtor. O conserto está no apêndice da r3.
2. **Os dois consertos do ⓘ** (`StatCard` `pointer-events-none` no ramo `info`; `collisionPadding`
   e teto no balão de `StoreMovement.tsx`) vieram depois da r3: teste e sensor do autor, sem
   verificador independente.
3. **A metade semântica do SQL fora do CI**: 11 mutantes de SQL só morrem pelos probes
   (`probes/*.sql`, `concorrencia.sh`, `ponta-a-ponta.sh`), que não rodam no CI.
4. **Aparelho real**: nem Safari de iPhone, nem o navegador interno do Instagram/WhatsApp (o caso de
   maior volume, e a assunção `n — medir` da spec); o toque foi o `touchscreen.tap` do Playwright.
   **Firefox** não rodou em nenhuma prova (a trava do id foi medida em Chromium e WebKit).
5. **Plataforma hospedada**: o gateway com `verify_jwt = false` e só `apikey`; a existência do
   `pg_cron` (o job de poda só nasce onde ele já existe); o comportamento na troca de DNS
   (`production_host` passando a casar com a origem). Tudo só depois do deploy.
6. **Em navegador, não exercitados**: o bloco relendo quando chega um pedido pago (tempo real de
   `orders`) e a virada do dia no painel — só na suíte.
7. **Desempenho**: o custo do `VisitCounter` no LCP/INP da loja em celular não foi medido (a chamada
   sai em `requestIdleCallback`/depois do `load`, por desenho, mas sem número).
8. **Decisões, não provas**: o texto do Apêndice A (aprovação da Adri, pré-condição do deploy) e as
   cinco assunções `n — confirmar` — entre elas a saída de "Pedidos Hoje" e "Fat. Hoje" (`VIS-35`).

## Pós-fecho — 2026-10-22 (orquestrador, sem r4)

- **G9 consertada como a r3 prescreveu.** `probes/relogio.sql` (a fixtura do apêndice da r3, com `\ir _comum.sql` relativo) roda no banco local com exit 0 e todos os `ok`. Em `visitasSchema.test.ts`, a régua do dia e do prazo virou `it.each(['record_store_visit','store_clock'])`, com os sensores S33 (`store_day_start(v_dia)`) e S33b (`v_dia + 2`) aplicados por `mutarNoBloco`, que lança quando não acha o alvo. O S33 injetado no `store_clock` do **arquivo real** da migration reprova a régua por asserção; o arquivo foi restaurado e o SHA-256 conferido.
- Store **5726/312 → 5731/312** (+5: −1 caso substituído, +6), exit 0. Os outros workspaces não foram tocados.
- **VIS-35 confirmada pelo usuário** em 2026-10-22 ("pode seguir o padrão").
- **Autor ≠ verificador não vale para este conserto**: não houve r4.
