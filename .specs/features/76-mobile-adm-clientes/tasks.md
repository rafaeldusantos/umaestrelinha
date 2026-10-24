# 76 — mobile-adm: Clientes — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto, acima da Skill** (`CLAUDE.md` raiz, `BL-012`): **sem** commit por
> task. Os commits saem juntos no fim, **no branch `feat/76-mobile-adm-clientes`**, e só no passo de
> fecho que o usuário pedir. Sub-agentes não fazem commit, nem `git stash`/`checkout`/`reset`/`merge`.
>
> **Worktree**: tudo em
> `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store-76-mobile-adm-clientes`, por
> caminho absoluto, todo comando começando por `cd <worktree> &&`. Nunca editar o checkout principal
> (`/Users/rafael.santos/Projetos/uma-estrelinha/store`).
>
> **Merge** (`AD-056`): finalizada e testada (tasks concluídas, Verificador com PASS, gates sem
> regressão, QA com os bugs consertados e retestados, prova em navegador escrita), a branch é mergeada
> em **`feature/mobile-adm`**, nunca na `master`.
>
> **Banco**: só o local (faixa 54440–54449). **Uma migration** (T08), aplicada **só no local** com
> `supabase migration up`. **Nunca** `supabase db reset` (o `seed.sql` não tem catálogo: o reset deixa a
> loja sem produto), nunca `supabase stop --all`, `db push` ou `secrets set`. Probes com fixturas
> identificadas (`P76-…`), **apagadas** no fim, conferindo a contagem de `orders` (54), `customers` (9)
> e `customer_list` (48) antes e depois. Portas 8082–8084 são de outras sessões: a prova em navegador
> usa `vite preview` numa porta livre.
>
> **Mutantes**: editar no lugar e restaurar conferindo **SHA-256**; o arnês **lança** quando a string
> alvo não existe; separar morte por asserção de morte por compilação (memória "mutante que morre por
> compilação").
>
> **O Design manda** (`design.md`; §13 são as perguntas do portão com a saída padrão, §14 a
> rastreabilidade). Onde o texto da spec e o do design divergem em detalhe de forma (nome de arquivo,
> assinatura), vale o design. Os ids `MAC-xx` são os da spec; uma task só está feita quando os `MAC` que
> ela cita têm a asserção que o "Done when" pede.
>
> **`strictNullChecks` é `false`**: união por literal de string estreita, por literal booleano **não**.
> **Todo especificador relativo em `packages/core` leva `.ts`**, `import type` incluso.

---

**Spec**: `.specs/features/76-mobile-adm-clientes/spec.md` (38 requisitos, `MAC-01`..`MAC-38`) ·
**Design**: `design.md` (`AD-060`, proposta `AD-061`, `BL-052`)
**Status**: **T01–T33 feitas** (2026-10-24). Faltam o Verificador independente, o QA (`qa-report` + `qa-execution`) e o Android real (TQ10).

---

## Decisões do portão de Tasks

| Id | Decisão | Confirmação |
| --- | --- | --- |
| **TQ1** | **33 tasks em 5 lotes sequenciais** (Execution Plan). Verificador e QA depois do Lote 5. A **T25** (os quatro blocos da ficha) e a **T26** (a página e as rotas) ficam inteiras, com autorização escrita para dividir **T25** em **T25a** (cabeçalho, números e contato: `MAC-15`..`MAC-17`) e **T25b** (pedidos: `MAC-18`..`MAC-20`, `MAC-22`) se o executor passar do orçamento de contexto. **Cortar a régua para caber é proibido**; dividir é a saída | fechada |
| **TQ2** | **Ordem: `core` → painel → banco → o app por baixo → a tela.** O painel (T07) entra logo depois de `core/customers` porque `voltaram` já tem dois leitores desde o primeiro dia (`AD-056`), e a suíte do painel é a rede de segurança de `MAC-23`/`MAC-25`. O banco (T08–T10) antes do app porque o `select` da lista pede `orders_open` | fechada |
| **TQ3** | **A migration (T08) é aplicada com `supabase migration up`, no banco local que já está de pé.** O container do banco já existe; o edge runtime não (nada na `76` o chama). Sem reinício. Se `migration up` recusar (histórico divergente), **parar e registrar** — nunca `db reset` | fechada |
| **TQ4 / Q1 do Design** | **A janela paginada vira `useJanelaPaginada` (T12).** Se a extração não fechar com a suíte da `74` verde **e o diff de testes vazio** dentro da própria T12, o executor **para** e devolve a questão: a saída é a abordagem B (cópia + guarda de paridade), decisão do validador, não do executor | confirmada pelo validador (2026-10-24) |
| **TQ5 / Q2 do Design** | `CUSTOMER_VIEWS` **fica no painel**; só `voltaram` sobe. O guarda G11 (T07) prova que a lista de seis não mudou | confirmada pelo validador (2026-10-24) |
| **TQ6 / Q3 do Design** | "Ver cliente" com e-mail repetido (A18) escolhe `has_account` desc, `created_at` asc, `limit 1` (T19) | confirmada pelo validador (2026-10-24) |
| **TQ7 / Q4 do Design** | O painel **não** é consertado para o vínculo sem curinga: `BL-052` (T33) | confirmada pelo validador (2026-10-24) |
| **TQ8 / Q5 do Design** | A busca por telefone só liga com "cara de telefone" (T04) | confirmada pelo validador (2026-10-24) |
| **TQ9** | O ponto aberto do `*` no `ilike` (R1 do Design) é **decidido pelo probe da T02**; a T04 implementa o que o probe mostrar, com o caso e a razão escritos. Não há suposição a confirmar: é medida | fechada |
| **TQ10** | A prova em **Android real** (teclado virtual e voltar com o campo focado) fica **pendente do usuário**, declarada em `prova-navegador.md`, no `STATE.md` e no handoff. A T32 emula o teclado (`visualViewport` reduzido) e o voltar (`history.back()`), como a `75`. O merge vai só para `feature/mobile-adm`; a pendência pode ser fechada antes da promoção para a `master` | **n — confirmar** |
| **TQ11** | As assunções da spec estão todas confirmadas (`AD-060`, `context.md`); nenhuma `n — confirmar` da spec chega às Tasks | fechada |

---

## Test Coverage Matrix

> Gerada do código, do `CLAUDE.md` raiz (*Baselines*, *Os guardas*, *Mobile é o caso principal*, *O
> defeito 01*, *`strictNullChecks` false*), de `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`,
> `supabase/CLAUDE.md`, dos `vitest.config.ts` dos workspaces e do `tasks.md` da `75` (molde). Lições
> aplicadas como cautela (nenhuma *confirmed*): `L-030`, `L-033`, `L-034`, `L-050`, `L-055`, `L-057`,
> `L-060`, `L-063`; memórias "dublê que não enxerga", "teste não monta a árvore que prova", "asserção
> subsumida pela vizinha", "amostra que filtra o defeito para fora", "mutante que morre por
> compilação".

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Regra pura de `core/customers` e `whatsappChatUrl` | unit | todo ramo; 1:1 com as ACs; as saídas de `openOrdersSqlFilter`, `ilike*` e `customerCursorFilter` **escritas por extenso** no teste (nunca lidas da constante que provam); a saída do painel de hoje comparada com uma cópia literal; especificador relativo com `.ts` | `packages/core/src/customers/__tests__/*.test.ts`, `notifications/__tests__/phone.test.ts` | `pnpm --filter @estrelinha/core test --testTimeout=20000` |
| Delegação do painel | unit + a suíte existente **sem asserção tocada** | `toBe` das reexportações; `voltaram` ≡ `recorrentes` no dublê que registra a cadeia | `apps/backoffice/src/**` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Migration | guarda de fonte (uma régua por comando, `L-033`) + **probe SQL** | colunas no fim e na ordem, `security_invoker`, nenhum `grant`/escrita; o predicado byte a byte; a semântica só pelo probe | `apps/store/src/shared/lib/__tests__`; `.specs/features/76-mobile-adm-clientes/probes/` | suíte da loja; `sh`/`pnpm tsx` do probe, banco em 54441/54442 |
| Janela, hooks e porta do app | unit (`renderHook` + `fakeSupabase` que **registra a cadeia inteira**) | cadeia por **igualdade** com a de `core`; recusa × falha × vazio; geração; id repetido; re-entrada (`L-057`); toque duplo no mesmo tique | `apps/mobile-adm/src/shared/api/__tests__`, `entities/customer/**/__tests__`, `features/open-customer/**/__tests__` | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` |
| UI do app | componente pela árvore **real** (`montarApp` / `<App />`) | caminho feliz + cada edge case + estados **exclusivos** (`L-063`) + `role` + alvo 44 e classes de layout por **token exato** + `motion-reduce:` | `apps/mobile-adm/src/pages/__tests__/{clientesPage,clientePage,verCliente}.test.tsx` e `__tests__` de cada slice | idem |
| Contrato com o client real | integração (`clientReal.ts`, `fetch` falso) | `customer_list` com a linha de uma cliente comum + `atelie_clock` em 403 ⇒ recusa e **nenhum texto dela no DOM em nenhum instante**; lista em 500 ⇒ a recusa ainda vence; RPC sem rede ⇒ falha, nunca recusa; mutantes de `lerComPapel` e de `useJanelaPaginada` | `apps/mobile-adm/src/app/__tests__/clientesComClientReal.test.tsx` | idem |
| Guardas de fonte (app, core, painel, loja) | guarda (AST onde a régua é de uso) | âncora dupla; uma régua por comando; sensores CRLF/LF/glob de dois asteriscos/forma quebrada; o inverso que prova que o certo passa | `apps/mobile-adm/src/**/__tests__`, `apps/store/src/shared/lib/__tests__`, `apps/backoffice/src/app/__tests__`, `packages/core/src/customers/__tests__` | o workspace do guarda |
| Semântica contra o banco (paridade, conta sem papel, tipos, cursor, escape) | probe (supabase-js real contra o banco local) | Success Criteria 2, 3 e 4 | `.specs/features/76-mobile-adm-clientes/probes/` | `pnpm tsx`/`sh` do probe |
| Layout 360/390/412/1440, fonte 100/130/200 %, teclado, voltar, menos movimento, **privacidade medida** | navegador real | **não alcançável por jsdom** | `prova-navegador.md` | Playwright no build servido |
| `package.json`/`exports`/tipos/build | build | `tsc` com os 11 herdados de `core`, zero novos; builds do mobile-adm e do backoffice | — | `npx tsc --noEmit -p …`; `pnpm --filter … build` |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task só de `core` ou só do app, sem arquivo novo fora do workspace | o workspace tocado: `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (**sem o `--`**), exit code fora de pipe |
| Full | **toda task que cria ou move arquivo em `apps/**` ou `packages/**`**, e toda task que toca o painel (os guardas da loja varrem os apps e `packages/`: `situacaoComDonoUnico`, `numeroDoPedidoComDonoUnico`, `brandScan`, `fusoComDonoUnico`, `marcacaoSoPorAcao`, `chaveDeServidorForaDoNavegador`, `originZipNotRead`…) | core + mobile-adm + **store** + backoffice, **um por vez**, mesmo comando, exit code fora de pipe |
| Build | fim de fase (e a T31) | Full + `npx tsc --noEmit -p` em `apps/{mobile-adm,store,backoffice}/tsconfig.app.json`, `apps/mobile-adm/tsconfig.node.json`, `apps/store/tsconfig.server.json`, `tools/catalog-import/tsconfig.json` e `packages/core/tsconfig.json` (11 herdados, nenhum novo) + `npx eslint .` em mobile-adm, backoffice e store (sem regressão contra a T01) + `pnpm --filter @estrelinha/mobile-adm build` + `pnpm --filter @estrelinha/backoffice build` |

Baseline: **a de `baseline.md`** — 16371 testes em 818 arquivos (store 5885/320 · backoffice 3696/212 ·
mobile-adm 1102/76 · core 4219/166 · functions 957/21 · catalog-import 512/23), tipos 0 nos apps e 11 em
`core`, lint 25/7 (0/0 no app). **A linha do `CLAUDE.md` raiz (15819/792) está envelhecida** e a T33 a
corrige.

---

## Execution Plan

```
Fase 1 (entrada, probe e regras puras):   T01 → T02 → T03 → T04 → T05 → T06 → T07
Fase 2 (banco e infra do app):            T08 → T09 → T10 → T11 → T12 → T13
Fase 3 (o app por baixo da tela):         T14 → T15 → T16 → T17 → T18 → T19 → T20
Fase 4 (a tela):                          T21 → T22 → T23 → T24 → T25 → T26 → T27 → T28
Fase 5 (o fecho e a prova):               T29 → T30 → T31 → T32 → T33
                                          → Verificador independente (sempre) → QA (qa-report + qa-execution)
                                          → bugs ⇒ tasks Bxx (teste antes do conserto) → reteste → Verificador de novo
```

**Lotes sequenciais para sub-agentes** (fases inteiras, ~7 tasks; um lote só começa quando o anterior
reporta tudo feito):

| Lote | Fases | Tasks | Fronteira |
| --- | --- | --- | --- |
| **1 — o `core` e o painel** | Fase 1 | T01–T07 | nenhum I/O de app; o painel só ganha reexportações; o probe T02 decide o `*` e os tipos |
| **2 — o banco e a infra do app** | Fase 2 | T08–T13 | uma migration (só local), os guardas dela, o probe SQL, e três extrações que **não mudam comportamento** (`lerComPapel`, `useJanelaPaginada`, `useSentinela`/`CampoDeBusca`) |
| **3 — o app por baixo da tela** | Fase 3 | T14–T20 | arnês, modelo, hooks e guardas de leitura; nenhum componente visível |
| **4 — a tela** | Fase 4 | T21–T28 | componentes, páginas, rotas, "Ver cliente" e os guardas de UI |
| **5 — fecho e prova** | Fase 5 | T29–T33 | client real, probe de paridade, gates, navegador e documentação |

Depois do Lote 5: o **Verificador** (autor ≠ verificador, sensor de mutação, `validation.md`), depois o
QA (`qa-report` planeja o ciclo em `docs/qa/`, `qa-execution` anda). **O ciclo de QA anda toda tela
tocada em 360, 390 e 412 de largura, e com a fonte do sistema a 100, 130 e 200 %** (regra do fecho do QA
da `73`). Todo bug vira uma task `Bxx` no fim deste arquivo, com teste que reprova antes do conserto, e o
Verificador roda de novo (laço de no máximo 3 rodadas antes de escalar).

---

## Tasks

### Fase 1 — entrada, probe e as regras puras em `core`

### T01 — `01-baseline-e-medicao`
- **What**: medir as seis suítes com a árvore parada, `tsc` dos sete projetos, lint dos três apps; ler o
  banco local (a distribuição de `orders` e de `customer_list`); gravar o SHA-256 dos seis arquivos que
  a `76` move ou reexporta; registrar o que o PostgREST fez com o `ilike`.
- **Where**: `.specs/features/76-mobile-adm-clientes/baseline.md`
- **Depends on**: —
- **Done when**: `baseline.md` com os seis números e exit codes (um workspace por vez, fora de pipe),
  tipos (11 herdados em `core`, linha a linha) e lint (25/7); os fatos do banco (48/54/18/3/4 nulos); a
  evidência do `ilike`; os seis hashes; a divergência contra o `CLAUDE.md` raiz **declarada**, não
  corrigida em silêncio.
- **Reqs**: — (gate de "sem regressão"; base de `MAC-23`, `MAC-25`, `MAC-26`).
- **Status**: ✅ **Feita** (2026-10-24, na abertura do Design). Árvore parada, `git status` só com
  `.specs/`; 16371/818, exit 0 nas seis; tipos 0 nos seis projetos de app e 11 em `core`; lint 25/7.
  **Divergência declarada**: o `CLAUDE.md` diz 15819/792; a árvore mede 16371/818 e o handoff da `75`
  diz 16316/818 (+55 testes em `core` e `mobile-adm`, depois do handoff).

### T02 — `02-probe-do-banco-e-do-postgrest`
- **What**: probe (supabase-js real contra o banco local, fixturas `P76-…` criadas e apagadas) que
  responde, **com dado**, as perguntas que o Design deixou abertas: (1) as **chaves** exatas que
  `customer_list`, `order_list`, `order_items` e `customer_directory` devolvem para cada `select` das
  constantes `COLUNAS_*` do Design §3.6, e o `typeof` de `orders_paid`, `orders_total`, `total_spent` e
  `avg_ticket`; (2) o **cursor**: fixtura com **empate** de `last_activity_at` (dois `id`), **dois nulos**,
  corte exatamente em página cheia, corte **no último com data** e corte **no nulo** — a soma das janelas
  tem de ser as mesmas N pessoas, sem repetir e sem pular; (3) o **escape**: fixturas cujo nome/e-mail
  contêm `%`, `_`, `\`, `"`, `(`, `,`, `)` e `*`, buscados entre aspas com `\`, `%`, `_`, `\\`, `\"` — o
  que casa o literal e **só** ele; (4) o **vínculo**: `VROSA_RJ@…` × `VROSAXRJ@…` (A10) — a ficha de uma
  não traz o pedido da outra; (5) o `ilike` exato sem `%` casa `Maria@X.com` com `maria@x.com`; (6) A18:
  dois cadastros com o mesmo e-mail — `has_account desc, created_at asc, limit 1` é determinístico.
- **Where**: `.specs/features/76-mobile-adm-clientes/probes/01-banco.{sql,sh,ts,saida.txt}` (e
  `01-limpa.sql`)
- **Depends on**: T01
- **Done when**: a saída gravada em `01-banco.saida.txt` com um `ok —` por caso e **nenhum** `FALHA`;
  a contagem de `orders` (54), `customers` (9) e `customer_list` (48) é a mesma antes e depois; cada
  resposta que decide código tem o **sentido escrito** no arquivo — em especial: *o `\*` chega literal ou
  não* (decide `escapeLike`, TQ9), *`bigint`/`numeric` chegam como número ou string* (decide se a leitura
  precisa de `Number()`), e *o conjunto de chaves de cada `select`* (a lista que G4 vai comparar). Um
  **mutante** do próprio probe (trocar `id.gt` por `id.lt` no cursor) é visto reprovando o caso certo.
- **Reqs**: `MAC-02`, `MAC-05`, `MAC-06`, `MAC-18`, `MAC-29` (base), A10, A14.
- **Tests**: probe · **Gate**: nenhum (rodado à mão; o resultado alimenta T03–T05 e T14).
- **Status**: ✅ **Feita** (2026-10-24). `probes/01-banco.{sql,sh,ts,saida.txt}` + `01-limpa.sql` + `01-banco.mutante.txt`: 46 `ok —`, nenhum `FALHOU`, banco restaurado 54/9/48. Mutante `id.gt`→`id.lt` reprova 7 casos do cursor. **Sentidos**: `bigint`/`numeric` chegam como `number` (sem `Number()`); `last_activity_at` chega com microssegundos e `+00:00` e volta entre aspas; **o `*` vira `%` no PostgREST mesmo escapado** (`\*` não casa nada) ⇒ `escapeLike` troca `*` por `_` (TQ9); A18: com `created_at` empatado só `id asc` como 3º critério é determinístico (recomendação da T19).


### T03 — `03-core-customers-recortes-e-em-aberto`
- **What**: `core/customers/{slices,open,id,index}.ts`: `CUSTOMER_SLICES`, `DEFAULT_CUSTOMER_SLICE`,
  `isCustomerSliceId`, `customerSliceRule`, `applyCustomerSlice` (builder estrutural, `gte` só),
  `RETURNING_CUSTOMER_RULE`, `OPEN_CUSTOMER_RULE`, `OPEN_ORDER_STATUSES`, `OPEN_ORDER_RULE` (uma
  `QueueRule`), `openOrdersSqlFilter(alias)`, `isCustomerId` (`toBe` de `isOrderId`); subpath
  `"./customers"` no `exports` de `packages/core/package.json`.
- **Where**: `packages/core/src/customers/{slices,open,id,index}.ts`, `packages/core/package.json`,
  `customers/__tests__/{slices,open,id}.test.ts`
- **Depends on**: T02
- **Reuses**: `QueueRule`, `toSqlPredicate` (`orders/queue.ts`), `isOrderId` (`orders/list.ts`)
- **Done when**: os três recortes na ordem do protótipo, com os rótulos **por extenso** no teste;
  `customerSliceRule('todas') === null` e id fora do vocabulário **lança** em `applyCustomerSlice`;
  `applyCustomerSlice` com dublê que registra a chamada: `recorrentes` ⇒ `gte('orders_paid', 2)`,
  `em-aberto` ⇒ `gte('orders_open', 1)`, `todas` ⇒ nenhuma chamada; `OPEN_ORDER_RULE` casa a Q2b
  (`payment_status = 'approved'` **e** `status in ('pending','paid','separating','shipped')`) e
  `openOrdersSqlFilter('v')` devolve **por extenso** `count(v.order_id) filter (where v.payment_status =
  'approved' and v.status in ('pending', 'paid', 'separating', 'shipped'))` (a forma exata de
  `toSqlPredicate`, copiada da saída real antes de escrever o teste); alias inválido lança; os quatro
  pares da Q2b (`pending`+`expired`, `delivered`+`approved`, `cancelled`+`approved`, `paid`+`approved`)
  testados como **dado** pela regra; `isCustomerId` aceita uuid e recusa `''`, `null`, número, uuid
  truncado e a forma com chaves; import com `.ts`; Quick (core).
- **Reqs**: `MAC-07`, `MAC-08`, `MAC-09`, `MAC-23` (regra), `MAC-24` (a fonte do SQL).
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `slices.ts`, `open.ts`, `id.ts`, `index.ts`, subpath `./customers`; core 4219→4313 no fecho da Fase 1.


### T04 — `04-core-customers-escape-e-busca`
- **What**: `core/customers/{like,search}.ts` — o dono do escape (`escapeLike`, `ilikeContains`,
  `ilikeExact`) e a busca subida **byte a byte** do painel (`CUSTOMER_SEARCH_COLUMNS`,
  `buildCustomerSearchCondition(search, opts?)`, `CUSTOMER_SEARCH_DEBOUNCE_MS`) com as opções do app
  (`literal`, `phoneDigits`, `APP_CUSTOMER_SEARCH`, `buildAppCustomerSearch`). O `*` conforme o que o
  probe da T02 mostrou.
- **Where**: `packages/core/src/customers/{like,search,index}.ts`, `customers/__tests__/{like,search}.test.ts`
- **Depends on**: T02, T03
- **Reuses**: `escapeSearchTerm` (`core/paging`), com import relativo `.ts`
- **Done when**: **sem `opts`**, `buildCustomerSearchCondition` devolve a saída de hoje do painel,
  caractere a caractere, provada contra uma **cópia literal** da função antiga colada no teste (e o
  teste do painel passa depois na T07); `like.ts`: `\` ⇒ `\\`, `%` ⇒ `\%`, `_` ⇒ `\_` e, **depois**,
  `\` e `"` do resultado escapados para o PostgREST (a ordem testada com `a\_b"c`), com as saídas
  escritas por extenso; `ilikeExact('Maria_X@a.com')` não tem `%`; o app: três colunas
  (`name`, `email`, `phone`), valor entre aspas, `(`, `)` e `,` **literais** (não viram espaço); termo
  vazio e só de espaços ⇒ `null`; `phoneDigits`: "(51) 99812-4471", "51998124471", "99812" e
  "+55 51 99812-4471" acrescentam `phone.ilike."%…%"` por dígitos (os dois primeiros saem quando começa
  com `55` e tem 12+ dígitos), e "joao2", "a1b2" e "ana 51" **não** (falso positivo); o caso do `*`
  escrito com a razão do probe; Quick (core).
- **Reqs**: `MAC-06`, `MAC-25`, A14.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `like.ts` (com `*` ⇒ `_`, decisão do probe) e `search.ts`; a saída sem `opts` é igual à cópia literal da função antiga. Detalhe: o telefone por dígitos não duplica a condição de `phone` quando o termo já é só dígitos.


### T05 — `05-core-customers-cursor-e-vinculo`
- **What**: `core/customers/{cursor,link}.ts`: `CustomerCursor`, `customerCursorFilter`,
  `CUSTOMER_PAGE_SIZE = 25`, `CUSTOMER_ORDERS_PAGE_SIZE = 20`, `customerOrdersCondition(id, email)` e
  `directoryEmailCondition(email)`; os testes de pureza e de alcance do Deno do módulo inteiro.
- **Where**: `packages/core/src/customers/{cursor,link,index}.ts`,
  `customers/__tests__/{cursor,link,purity,denoReach}.test.ts`
- **Depends on**: T03, T04
- **Reuses**: o molde de `orders/__tests__/purity.test.ts` (leitura de especificador de import, nunca de
  texto) e de `seo/__tests__/denoReach.test.ts` (grafo transitivo)
- **Done when**: `customerCursorFilter` com data ⇒ **por extenso** os três ramos
  (`last_activity_at.lt."…",and(last_activity_at.eq."…",id.gt.<id>),last_activity_at.is.null`) e, com
  data nula, `and(last_activity_at.is.null,id.gt.<id>)`; um cursor cujo `id` não é uuid **lança**;
  `customerOrdersCondition` lança para id que não é uuid e, para e-mails com `_`, `%`, `"`, `\`, `,` e
  `)`, devolve o valor **escapado e entre aspas**, sem `%` (o par `VROSA_RJ`/`VROSAXRJ`); `directoryEmailCondition`
  = `email.ilike.<ilikeExact>`; `purity`: nenhum import de React, Supabase, `node:`, Deno ou alias em
  `core/customers`, âncora ≥ 7 arquivos lidos; `denoReach`: o grafo **transitivo** (`customers` →
  `orders/queue.ts`, `orders/list.ts`, `orders/views.ts`, `paging/pageMath.ts`) sem especificador relativo
  sem `.ts` (`import type` incluso), com o número de arquivos do grafo lido do disco e sensor de um
  `import type` sem extensão; Quick (core).
- **Reqs**: `MAC-05`, `MAC-18` (regra do vínculo), `MAC-27` (G12).
- **Tests**: unit + guarda · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `cursor.ts`, `link.ts`, `purity` e `denoReach` (grafo de 12 arquivos, medido).


### T06 — `06-whatsapp-chat-url-e-bloco-cliente`
- **What**: `whatsappChatUrl` em `core/notifications/phone.ts`; `BlocoCliente` (`74`) passa a montar o
  `href` por ele, **sem mudar a saída**.
- **Where**: `packages/core/src/notifications/phone.ts`, `notifications/__tests__/phone.test.ts` (+),
  `apps/mobile-adm/src/widgets/order-detail/ui/BlocoCliente.tsx`,
  `apps/mobile-adm/src/widgets/order-detail/__tests__/BlocoClienteHref.test.tsx` (novo; os testes
  de hoje do bloco moram em `CabecalhoClienteMaterial.test.tsx` e **não** são tocados)
- **Depends on**: T01 (o hash de `BlocoCliente.tsx`)
- **Done when**: `whatsappChatUrl` para `+55 (51) 99812-4471`, `5551998124471`, `(51) 3012-3456`, `123`,
  `''`, `null` e `undefined` ⇒ `https://wa.me/5551998124471`, idem, `https://wa.me/555130123456`, `null`
  ×4 — **escritos por extenso**; sem `?text=`; o arquivo `phone.ts` continua **sem import**; o
  `BlocoCliente` chama `normalizeBrPhone` só para o telefone mascarado e `whatsappChatUrl` para o `href`;
  o teste de **saída idêntica** monta o `BlocoCliente` real com os cinco telefones e compara o `href`
  com uma **cópia literal** do `whatsappDe` antigo (`https://wa.me/${numero}`, lida do disco antes de o
  arquivo mudar, hash em `baseline.md`); os testes antigos de `BlocoCliente` passam **sem asserção
  tocada**; o comentário "Ver cliente **não** aparece até a `76` (A20)" **fica** até a T27; Quick (core
  e mobile-adm).
- **Reqs**: `MAC-26`, `MAC-17` (a função).
- **Tests**: unit · **Gate**: quick (core + mobile-adm)
- **Status**: ✅ **Feita** (2026-10-24). `whatsappChatUrl` em `phone.ts` (sem import); `BlocoCliente` o usa; o teste de saída idêntica passou contra o componente ANTIGO antes da troca e contra o novo depois; testes antigos do bloco sem asserção tocada.


### T07 — `07-painel-delega-ao-core`
- **What**: o painel reexporta de `@estrelinha/core/customers` a busca e o debounce e faz `applyView`
  chamar `applyCustomerSlice(builder, 'recorrentes')` no `case 'voltaram'`; guarda de referência novo.
- **Where**: `apps/backoffice/src/entities/customer/api/customerQuery.ts`,
  `apps/backoffice/src/app/__tests__/regrasDeClienteNoCore.test.ts`
- **Depends on**: T03, T04
- **Done when**: o diff do painel é **só** as reexportações e o `case 'voltaram'` (hash antes/depois em
  `baseline.md`; diff explicado); `regrasDeClienteNoCore.test.ts`: `buildCustomerSearchCondition`,
  `CUSTOMER_SEARCH_COLUMNS` e `CUSTOMER_SEARCH_DEBOUNCE_MS` são `toBe` os de `core`;
  `applyView('voltaram')` e `applyCustomerSlice('recorrentes')` produzem a **mesma** cadeia no dublê;
  `CUSTOMER_VIEWS` continua com as seis visões na ordem de hoje (por extenso); **a suíte inteira do
  painel passa com a contagem de arquivos igual (212) e `git diff` dos testes antigos vazio**; sensor:
  copiar de volta a função antiga (cópia com os mesmos valores) reprova o guarda; **Full** (a loja varre
  o painel).
- **Reqs**: `MAC-23`, `MAC-25`, `MAC-27` (G11).
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `customerQuery.ts` reexporta os três símbolos; `case 'voltaram'` chama `applyCustomerSlice`; `regrasDeClienteNoCore.test.ts` (10 casos; mutante de `voltaram` e mutante do debounce copiado, este achado por sobreviver ao `toBe` — primitivo —, mortos). Painel 3696/212 → 3706/213, nenhum teste antigo tocado. Observação: o retrato da base (`fetchPortrait`) ainda tem um `gte('orders_paid', 2)` próprio — fora do escopo do T07 ("nenhuma outra linha do painel muda").


### Fase 2 — o banco e a infra do app

### T08 — `08-migration-orders-open`
- **Status**: ✅ **Feita** (2026-10-24). `20261025120000_76-clientes-em-aberto.sql` aplicada no local com `supabase migration up`; `orders_open` por último nas duas views (11 e 19 colunas); filtro = saída colada de `openOrdersSqlFilter('v')`; `orders_open >= 1` = 18, `orders_paid >= 2` = 3; as 18 colunas antigas idênticas antes/depois (`EXCEPT` nos dois sentidos = 0, em transação desfeita); prefixo único; 54/9/48 intactos.
- **What**: `supabase/migrations/20261025120000_76-clientes-em-aberto.sql`: `CREATE OR REPLACE VIEW`
  de `customer_stats` (coluna `orders_open` no **fim**) e de `customer_list` (19ª coluna, depois de
  `same_email_count`), corpo **copiado** da migration `34`; aplicada no banco local.
- **Where**: `supabase/migrations/20261025120000_76-clientes-em-aberto.sql`
- **Depends on**: T03 (a forma SQL sai de `openOrdersSqlFilter`)
- **Done when**: o predicado na migration é **a saída de `openOrdersSqlFilter('v')`** (colada da saída
  real, não digitada); as 11 colunas de `customer_stats` e as 18 de `customer_list` na mesma ordem e com
  o mesmo texto da `34`; `security_invoker = true` nas duas; **nenhum** `grant`, `drop`, `insert`,
  `update`, `delete`; `COMMENT ON VIEW` atualizado; `supabase migration up` aplica no local sem erro e
  `\d customer_list` mostra 19 colunas com `orders_open` por último; `select count(*) from
  customer_list where orders_open >= 1` = **18** e `where orders_paid >= 2` = **3** (os números do
  `baseline.md`); o `select *` do painel continua devolvendo as 18 colunas antigas com os mesmos valores
  (comparação antes/depois numa transação); o prefixo `20261025120000` é **único** entre as migrations
  (`ls supabase/migrations | cut -c1-14 | sort | uniq -d` vazio — a lição do merge da `48` com a `49`).
- **Reqs**: `MAC-24`, `MAC-09` (a coluna).
- **Tests**: verificação por `psql` · **Gate**: nenhum (a T09 guarda; a T10 prova a semântica)

### T09 — `09-guardas-da-migration`
- **Status**: ✅ **Feita** (2026-10-24). `clientesSchema.test.ts` (14) e `emAbertoComDonoUnico.test.ts` (9) na loja; mutante real em `core/customers/open.ts` (sem `separating`) derrubou 6 de 9, SHA-256 conferido. Store 5885/320 → 5908/322.
- **What**: os dois guardas da loja: `clientesSchema.test.ts` (uma régua por comando) e
  `emAbertoComDonoUnico.test.ts` (a migration × o dono em `core`, byte a byte).
- **Where**: `apps/store/src/shared/lib/__tests__/{clientesSchema,emAbertoComDonoUnico}.test.ts`
- **Depends on**: T08
- **Reuses**: o molde de `overviewSchema.test.ts` (`mutar()` que lança) e `filaComDonoUnico.test.ts`
- **Done when**: `clientesSchema` — **uma asserção e um sensor por mutação** para: as duas
  `CREATE OR REPLACE VIEW`; `security_invoker = true` nas duas (a sumida reprova); `orders_open` é a
  **última** coluna de cada view (movê-la reprova); as colunas anteriores de cada view são, em ordem e
  texto, as da migration `34` (lida do disco); `coalesce(s.orders_open, 0)`; nenhum `grant`, `drop`,
  `insert`, `update` ou `delete`; o `COMMENT`; âncora (arquivo lido + 2 views + as 11 e as 18 colunas
  contadas); `emAbertoComDonoUnico` — a migration contém **exatamente** `openOrdersSqlFilter('v')`;
  `OPEN_ORDER_RULE` tem `approved` **e** os quatro status; **mutante** em `core/customers/open.ts`
  (tirar `separating`) derruba a suíte; **mutante** na migration (`'approved'` ⇒ `'pending'`) derruba;
  Quick (store).
- **Reqs**: `MAC-24`, `MAC-27`.
- **Tests**: guarda · **Gate**: quick (store)

### T10 — `10-probe-sql-orders-open-e-desempenho`
- **Status**: ✅ **Feita** (2026-10-24). `probes/02-em-aberto.{sql,sh}` + `02-desempenho.sql` + `02-em-aberto.saida.txt`: 8 situações `ok` (as seis, A10 e o sem-pedido com 0 não nulo), banco restaurado 54/9/48. **Desempenho: ~7,9 s** (3.000 pessoas/6.000 pedidos), **acima de 1 s**, mas a definição ANTIGA da `34` mede ~7,8 s na mesma carga: o custo é do `OR` do CTE `vinculo`, não da `orders_open`. Aberto **`BL-053`** no `BACKLOG.md` (não consertado, como manda a task).
- **What**: probe SQL de **semântica** de `orders_open` e **medida** de custo.
- **Where**: `.specs/features/76-mobile-adm-clientes/probes/02-em-aberto.{sql,sh,saida.txt}`
- **Depends on**: T08
- **Done when**: com fixturas `P76-` (pessoa com conta e pessoa convidada), a coluna dá o número certo
  em **seis** situações: só pago e entregue (0), pago e `shipped` (1), `pending`+`approved` (1, o
  material esperado), `pending`+`expired` (0), `cancelled`+`approved` (0), e **duas** abertas (2); a
  convidada que depois cria conta soma os pedidos de antes e de depois (A10); a pessoa **sem nenhum
  pedido** tem `orders_open = 0` (não nulo) em `customer_list`; **desempenho**: numa transação desfeita,
  3.000 pessoas e 6.000 pedidos de fixtura, `explain (analyze)` de `select … from customer_list order by
  last_activity_at desc nulls last, id limit 25` com o tempo gravado; **acima de 1 s** a T10 abre uma
  entrada no `BACKLOG.md` (não conserta); contagem de `orders`/`customers` igual antes e depois.
- **Reqs**: `MAC-24`, `MAC-09`, `MAC-01` (convidada que criou conta).
- **Tests**: probe · **Gate**: nenhum

### T11 — `11-lercompapel-sobe-para-shared`
- **Status**: ✅ **Feita** (2026-10-24). Arquivo movido com o mesmo SHA-256 (`458520…`); `entities/order` não exporta mais `conferirPapel`; guardas só com o caminho novo. App 1110/77 → 1111/78 (o teste "é exportada pelo slice" virou "o slice não a reexporta" em `entities/order/__tests__/conferirPapelMoraEmShared.test.ts`; `lerComPapelComClientReal` usa literal local no lugar de `COLUNAS_DA_LISTA`, por causa de `shared` → `entities`).
- **What**: `lerComPapel` e `conferirPapel` saem de `entities/order/api` para `shared/api/lerComPapel.ts`
  (conteúdo idêntico); os importadores e os guardas ganham o caminho novo.
- **Where**: `apps/mobile-adm/src/shared/api/lerComPapel.ts` (+ `__tests__/{lerComPapel,lerComPapelComClientReal}.test.ts`
  movidos), `entities/order/api/{useListaDePedidos,usePedido}.ts`, `entities/order/index.ts`,
  `features/order-actions/api/gravarAcao.ts`, `entities/order/api/__tests__/{leituraSoComPapel,escritaSoPelaPorta}.test.ts`,
  `shared/lib/__tests__/regraDePedidoSoNoCore.test.ts`, `pages/{PedidosPage,PedidoPage}.tsx` (se importarem),
  `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (o caminho)
- **Depends on**: T01
- **Done when**: o arquivo movido tem o **mesmo SHA-256** do original (`458520…`); nenhum import de
  `entities/order/api/lerComPapel` sobrou (`grep` vazio); `entities/order/index.ts` não exporta mais
  `conferirPapel`; os guardas mudaram **só o caminho** (diff explicado, âncoras iguais: 4 importadores do
  client, 7 chamadas `.from(`, 1 `</Route>`); a suíte do app, a da loja (`marcacaoSoPorAcao`) e a do
  painel (nenhuma mudança esperada) passam; contagem de testes do app **igual** à da T01 (1102/76);
  **Full**.
- **Reqs**: `MAC-11` (infra), `MAC-27` (G2 — o caminho), A5.
- **Tests**: unit + guardas existentes · **Gate**: full

### T12 — `12-use-janela-paginada`
- **Status**: ✅ **Feita** (2026-10-24), **com um desvio declarado**: os testes de COMPORTAMENTO de pedidos (`useListaDePedidos`, `usePedido`, `pedidosComClientReal`…) passaram sem uma linha tocada, mas `leituraSoComPapel.test.ts` (guarda de FONTE) reprovava a âncora "cada hook chama `lerComPapel(`" — o hook agora a chama dentro de `useJanelaPaginada`. Foi aplicada a emenda **G2 do Design** (o `consultar` da janela é o segundo ponto de pareamento) **só aditiva** — nenhuma asserção afrouxada — mais a régua 4 (no dono, toda chamada à consulta está dentro de `lerComPapel(`) e 3 sensores. `useJanelaPaginada.test.tsx` (26); 3 mutantes (geração, recusa solta do `dataUpdatedAt`, `Promise.all`) mortos por asserção, SHA-256 conferido. App 1111/78 → 1142/79.
- **What**: extrair de `useListaDePedidos` o hook genérico `useJanelaPaginada` (abordagem A, §1.1 do
  Design) e fazer `useListaDePedidos` chamá-lo. **Nenhuma mudança de comportamento.**
- **Where**: `apps/mobile-adm/src/shared/api/useJanelaPaginada.ts`,
  `apps/mobile-adm/src/entities/order/api/useListaDePedidos.ts`,
  `shared/api/__tests__/useJanelaPaginada.test.tsx`
- **Depends on**: T11
- **Reuses**: a máquina existente — `geracoes`, `recusasDaProxima`, `tamanhoDaJanela`, `emVoo`
- **Done when**: `useListaDePedidos.ts` tem ~25 linhas e **mantém os exports** (`LISTA_DE_PEDIDOS_KEY`,
  `chaveDaLista`, `tamanhoDaJanela`, `useListaDePedidos`); o objeto devolvido tem as **mesmas chaves**;
  **o diff de TODOS os testes do app é vazio** (`git diff --stat -- '*.test.*'` sem nenhum arquivo do
  app) e a suíte do app passa com 1102 + os casos novos do hook; `useJanelaPaginada.test.tsx` cobre com
  consulta injetada: janela relida em múltiplos de 25, geração (página velha descartada quando uma
  releitura começou), recusa da próxima presa ao `dataUpdatedAt`, `desduplicar` (o `id` repetido na
  página seguinte é descartado; `false` mantém a lista como está — o caso de pedidos), falha da próxima
  com as linhas mantidas, `42501` não repete e rede repete uma vez; cada consulta injetada roda **dentro**
  de `lerComPapel` (o dublê vê a RPC e a consulta no mesmo tique); **3 mutantes** reinjetados no hook
  novo (geração apagada, recusa da próxima solta do `dataUpdatedAt`, `Promise.all` no lugar de
  `allSettled` em `lerComPapel`) mortos por asserção, SHA-256 conferido. **Se a suíte da `74` ficar
  vermelha e a causa não se resolver aqui, PARAR e devolver Q1** (TQ4). **Full**.
- **Reqs**: `MAC-05`, `MAC-11`, `MAC-12`, `MAC-27` (infra do G2), `AD-061`.
- **Tests**: unit · **Gate**: full

### T13 — `13-use-sentinela-e-campo-de-busca-sobem`
- **Status**: ✅ **Feita** (2026-10-24). `useSentinela` em `shared/lib`, `CampoDeBusca` em `shared/ui` (Enter faz `blur`), `BuscaDePedidos` invólucro com o mesmo id/rótulo/placeholder; testes de `BuscaDePedidos` e `ListaDePedidos` sem asserção tocada. Novos: `CampoDeBusca.test.tsx` (8) e o guarda `umDonoDoObservador.test.ts` (9, âncora dupla e sensores); `grep IntersectionObserver` em produção = 1 arquivo. App 1142/79 → 1158/81. Gate full do lote: core 4313/175 · store 5908/322 · backoffice 3706/213 · mobile-adm 1158/81 · tsc 0 (app e loja) · lint do app 0/0.
- **What**: `useSentinela` vai de `widgets/order-list/model` para `shared/lib`; `CampoDeBusca` é extraído
  de `BuscaDePedidos` para `shared/ui`, que vira um invólucro.
- **Where**: `apps/mobile-adm/src/shared/lib/useSentinela.ts`, `shared/ui/CampoDeBusca.tsx`,
  `features/order-search/ui/BuscaDePedidos.tsx`, `widgets/order-list/ui/ListaDePedidos.tsx` (o import),
  os testes que acompanham
- **Depends on**: T12
- **Done when**: o `BuscaDePedidos` mantém **o mesmo `id` (`busca-de-pedidos`), rótulo, placeholder e
  classes** (`PLACEHOLDER_DA_BUSCA`, `ROTULO_DA_BUSCA` exportados como hoje); o debounce não emite na
  primeira montagem e não reemite o `inicial`; `CampoDeBusca` recebe `id`, `rotulo`, `placeholder`,
  `atraso` e `aoBuscar`, e **Enter tira o foco** do campo (`blur`) — o único comportamento novo, com
  caso; o teste de `BuscaDePedidos` e o de `ListaDePedidos` passam **sem asserção tocada**; `grep` por
  `IntersectionObserver` em `apps/mobile-adm/src` acha **um** dono (`shared/lib/useSentinela.ts`);
  **Full**.
- **Reqs**: `MAC-34` (Enter), `MAC-06` (o campo), `MAC-27` (um dono do debounce).
- **Tests**: unit · **Gate**: full

### Fase 3 — o app por baixo da tela

### T14 — `14-arnes-de-clientes`
- **Status**: ✅ **Feita** (2026-10-24). `test/clientes.ts` (`cliente`, `fichaDeCliente`, `pedidoDaFicha`, `listaDeClientes`, 10 fixturas nomeadas e `ilikeDoPostgres`, o `ILIKE` do Postgres para o dublê provar o vínculo exato de A10); o `fakeSupabase` ganhou `not` na cadeia (a cadeia de `customer_list`/`order_list`/`order_items`/`customer_directory` já era registrada e a tabela sem resposta já lançava); `clientReal.ts` **não precisou mudar** (o `tabelas` já responde qualquer tabela), então `clientRealPareado` segue verde sem tocar a loja. `test/__tests__/clientes.test.ts` (19). Os tipos das fixturas vieram de `entities/customer/model/linha.ts`, escrito aqui (parte da T15) porque a T14 não compila sem eles.
- **What**: estender o arnês de testes do app para clientes: `fakeSupabase.ts` e `clientReal.ts` ganham
  `customer_list`, `customer_directory`, `order_list` (já existe) e `order_items` por `tabelas`;
  `test/clientes.ts` com a fábrica de fixturas.
- **Where**: `apps/mobile-adm/src/test/{fakeSupabase,clientReal,clientes}.ts`,
  `apps/mobile-adm/src/test/__tests__/*` (+)
- **Depends on**: T11
- **Done when**: `clientes.ts` exporta `cliente()`, `fichaDeCliente()`, `pedidoDaFicha()`, `listaDeClientes(n)`
  (as **chaves exatas** da T02) e as fixturas nomeadas: a convidada, a com conta, a sem nome, a sem
  telefone, a com e-mail longo (60+ caracteres) e a de `_`; o dublê **registra a cadeia inteira** das
  leituras de `customer_list`/`order_list`/`order_items`/`customer_directory` (cada `or`, `gte`, `order`,
  `limit`, `not`), e uma tabela sem resposta configurada **lança**; `clientReal.ts` e a cópia da loja
  seguem **pareados** (`clientRealPareado.test.ts` verde — se o arnês da loja precisar da mesma
  mudança, a T14 a faz nos dois); testes do próprio arnês: a cadeia é registrada, a tabela sem resposta
  lança, uma resposta por `tabelas` com a forma do PostgREST; Quick (mobile-adm) + `clientRealPareado`
  (loja).
- **Reqs**: — (infra de `MAC-01`..`MAC-22`).
- **Tests**: unit · **Gate**: quick

### T15 — `15-entidade-cliente-modelo`
- **Status**: ✅ **Feita** (2026-10-24). `linha.ts` (6 `COLUNAS_*` + tipos), `identidade.ts`, `frases.ts`, `index.ts`; testes por extenso (62 casos). **Nota**: as listas da T02 (probe `01-banco`) são de ANTES da migration da T08, então não têm `orders_open`; as de `LISTA` e `FICHA` aqui são as do probe MAIS `orders_open` (provado pelo probe `02-em-aberto`). Acréscimos fora da lista da task, nos limites dela: `ticketMedio` (travessão) e o `clienteDesde` recebe a cidade como argumento.
- **What**: `entities/customer/model/{linha,identidade,frases}.ts` e o `index.ts` — colunas, tipos,
  nome/inicial/telefone, e **todas** as frases.
- **Where**: `apps/mobile-adm/src/entities/customer/model/{linha,identidade,frases}.ts`, `index.ts`,
  `model/__tests__/*.test.ts`
- **Depends on**: T02 (as chaves), T14
- **Reuses**: `relativeAge`, `monthName`, `calendarParts`, `formatOrderNumber`, `maskPhone`, `whatsappChatUrl`
- **Done when**: as seis constantes `COLUNAS_*` do Design §3.6 **iguais** às chaves da T02 (G4 as
  compara na T20); nenhuma contém `cpf`, `material_kinds`, `orders_with_material`, `same_email_count`,
  `address_street…`, `customer_document`, `customer_phone`; `nomeDoCliente` (nome aparado; vazio, só
  espaços e `null` ⇒ e-mail), `inicialDoCliente` (primeira letra do que `nomeDoCliente` devolve, em
  maiúscula) e `telefoneDoCliente` (`+55 (51) …`, `5551…`, `123`, `null` ⇒ `null` ou `{ mascarado, whatsapp }`)
  cobertos; **cada frase de §3.6 escrita por extenso no teste**, com singular **e** plural
  (`1 cliente`/`12 clientes`, `1 compra`/`4 compras`, `Pedidos · 1`), `Sem compra paga ainda`, a frase
  vazia da busca com aspas curvas e o termo, o "cliente desde" **com** e **sem** cidade (nenhum
  separador solto), o ticket `null` ⇒ travessão; `subtituloDaLinha` usa `relativeAge` contra o
  `lido_em` passado (o relógio do aparelho trocado por `vi.setSystemTime` não muda o texto); Quick
  (mobile-adm).
- **Reqs**: `MAC-03`, `MAC-04` (a frase), `MAC-10` (os textos), `MAC-15`, `MAC-16`, `MAC-29`, `MAC-35`.
- **Tests**: unit · **Gate**: quick

### T16 — `16-endereco-de-clientes-com-dono-unico`
- **Status**: ✅ **Feita** (2026-10-24). `clientesHref.ts` e G1 (`enderecoDeClientesComDonoUnico`, 22 casos, âncora dupla, sensores CRLF/LF/glob/inverso). A **metade positiva** (a página lê por `recorteDeClientesDoEndereco`) está como `it.todo`, a ser promovida a asserção na **T24**.
- **What**: `entities/customer/model/clientesHref.ts` (`CLIENTES_PATH`, `clientesHref`,
  `lerRecorteDeClientes`, `recorteDeClientesDoEndereco`, `clienteHref`) e o guarda G1.
- **Where**: `apps/mobile-adm/src/entities/customer/model/clientesHref.ts`,
  `model/__tests__/clientesHref.test.ts`,
  `apps/mobile-adm/src/entities/customer/__tests__/enderecoDeClientesComDonoUnico.test.ts`
- **Depends on**: T03, T15
- **Reuses**: o molde de `pedidosHref.ts` e de `enderecoDePedidosComDonoUnico.test.ts`
- **Done when**: `clientesHref('todas') === '/clientes'` (sem query), `clientesHref('em-aberto') ===
  '/clientes?recorte=em-aberto'`, id fora do vocabulário **lança**; `lerRecorteDeClientes('?recorte=zzz')
  === null` e `recorteDeClientesDoEndereco` cai em `todas`; `clienteHref(uuid)` e **lança** para id que não
  é uuid (um e-mail jamais vira endereço); o vocabulário vem de `CUSTOMER_SLICES` (lido, não repetido);
  G1: o nome `recorte` como parâmetro, `useSearchParams` e a montagem de `/clientes/…` fora de
  `clientesHref.ts` reprovam (allowlist de UM); **metade positiva** (declarada nesta task, **cobrada na
  T24**): a página lê o recorte por `recorteDeClientesDoEndereco`; âncora dupla (arquivos lidos e o dono
  encontrado); sensores com CRLF, LF, glob de dois asteriscos e o inverso (um componente que apenas
  *chama* `clientesHref` passa); Quick (mobile-adm).
- **Reqs**: `MAC-07`, `MAC-14` (o endereço), `MAC-28`, `MAC-27` (G1).
- **Tests**: unit + guarda · **Gate**: quick

### T17 — `17-use-lista-de-clientes`
- **Status**: ✅ **Feita** (2026-10-24). `useListaDeClientes` sobre `useJanelaPaginada` (`desduplicar`), 30 casos; mutantes M1, M2, M2b, M2c mortos por asserção.
- **What**: `entities/customer/api/useListaDeClientes.ts` sobre `useJanelaPaginada`.
- **Where**: `apps/mobile-adm/src/entities/customer/api/useListaDeClientes.ts`,
  `api/__tests__/useListaDeClientes.test.tsx`
- **Depends on**: T04, T05, T12, T14, T15
- **Done when**: a cadeia registrada pelo dublê é **igual por igualdade** à que `core` monta
  (`select(COLUNAS_DA_LISTA, { count: 'exact' })` → `applyCustomerSlice` → `or(buildAppCustomerSearch)` →
  `or(customerCursorFilter)` → `order(last_activity_at, desc, nullsLast)` → `order(id)` → `limit`); na
  primeira leitura `limit` = 25 e `count: 'exact'`; a página seguinte pede `limit` 25, o cursor da última
  linha (as **strings** do servidor) e **sem** contagem; releitura relê a janela inteira em múltiplos de
  25; o `id` repetido ao anexar é descartado e a ordem se mantém (`MAC-05`); `42501` não repete, rede
  repete uma vez; **a recusa vence** a consulta que falhou e a que trouxe linhas; **chave** com o termo
  aparado (`"  ana "` e `"ana"` = a mesma entrada); `staleTime: 0` e `refetchOnWindowFocus`;
  recorte/termo diferentes não herdam a falha da próxima; Quick (mobile-adm).
- **Reqs**: `MAC-01`, `MAC-02`, `MAC-04`, `MAC-05`, `MAC-06`, `MAC-11`, `MAC-12`, `MAC-13`.
- **Tests**: unit · **Gate**: quick

### T18 — `18-use-cliente-e-pedidos-da-cliente`
- **Status**: ✅ **Feita** (2026-10-24). `useCliente` (22) e `usePedidosDoCliente` (19). O helper `ler` (leitura que não lança) subiu de `usePedido` para `shared/api/lerSemLancar.ts` (aceita a leitura ou uma função que a monta) — duas cópias seriam o defeito 01; `usePedido` o importa e seus 28 testes passaram sem uma linha tocada. Os itens: `order_items.in('order_id', ids)` ordenado por `created_at` e `id` (o "primeiro" estável). Mutantes M3, M4, M5, M5b, M9, M10 mortos.
- **What**: `useCliente` (cabeçalho + cidade) e `usePedidosDoCliente` (a janela de pedidos, itens em uma
  leitura) — as duas pareadas com `lerComPapel`.
- **Where**: `apps/mobile-adm/src/entities/customer/api/{useCliente,usePedidosDoCliente}.ts`,
  `api/__tests__/{useCliente,usePedidosDoCliente}.test.tsx`
- **Depends on**: T05, T12, T14, T15
- **Done when**: `useCliente`: id que não é uuid ⇒ `{ cliente: null }` **sem nenhuma chamada** ao dublê
  (nem RPC) — `expect(log()).toEqual([])`; uuid válido: o cabeçalho lê `customer_list` com
  `COLUNAS_DA_FICHA`, `.eq('id', id).maybeSingle()`; a **cidade** é lida **depois** (segunda onda) com
  `customerOrdersCondition(id, email)`, `not('address_city','is',null)`, `created_at desc`, `limit 1`; o
  cabeçalho `null` ⇒ `{ cliente: null }`; erro no cabeçalho ⇒ a query falha; erro na cidade ⇒ cidade
  `null` e a ficha **não** cai; a recusa da RPC vence os dois; `usePedidosDoCliente`: `enabled` só com o
  cabeçalho; cadeia **por igualdade** com a de `core` (`or(customerOrdersCondition)`, cursor
  `cursorFilter(…, 'desc')`, `order(created_at desc).order(id desc)`, `limit 20`); os nomes dos itens
  vêm de **uma** leitura `in('order_id', ids)` para a janela (não uma por linha — `log()` vê uma só) e
  o **primeiro** item por pedido; a leitura dos itens falhando ⇒ as linhas **saem sem o item**, a janela
  vive; falha dos pedidos ⇒ só esse bloco; a página seguinte falhando mantém as linhas; um cliente com
  `_` no e-mail **não** traz o pedido de `VROSAXRJ@…` (a fixtura do A10, dublê que aplica o
  `ilike` literal); Quick (mobile-adm).
- **Reqs**: `MAC-14`, `MAC-15`, `MAC-18`, `MAC-19`, `MAC-22`, `MAC-11`, `MAC-12`.
- **Tests**: unit · **Gate**: quick

### T19 — `19-buscar-cliente-e-abrir-cliente`
- **Status**: ✅ **Feita** (2026-10-24). `buscarClientePorEmail` (12), `useAbrirCliente` e `VerCliente` (9); `min-h-11` vem de `cn(BOTAO_SECUNDARIO, 'min-h-11')` (a fusão troca o `min-h-12`). Estado `navegou` incluído. Mutantes M6 (trava por state), M7, M8, M11, M12 mortos. Ainda **não** composto no `BlocoCliente` (T27).
- **What**: `entities/customer/api/buscarClientePorEmail.ts` e `features/open-customer/` (`useAbrirCliente`,
  `VerCliente`), sem ainda compor no `BlocoCliente`.
- **Where**: `apps/mobile-adm/src/entities/customer/api/buscarClientePorEmail.ts`,
  `apps/mobile-adm/src/features/open-customer/{index.ts,model/useAbrirCliente.ts,ui/VerCliente.tsx}` e os
  testes
- **Depends on**: T05, T14, T15
- **Done when**: `buscarClientePorEmail` lê `customer_directory` com `select('id')`,
  `or(directoryEmailCondition(email))`, `order(has_account desc).order(created_at asc)`, `limit(1)` —
  **cadeia por igualdade**, e nenhuma escrita à mão de `ilike`; achou ⇒ `{ id }`; nenhuma linha ⇒
  `null`; erro da RPC e da consulta lançam; `useAbrirCliente`: estados `ocioso → abrindo →
  (nao-achou | falhou | navegou)`; **dois toques no mesmo tique ⇒ uma leitura** (a trava é um `useRef`,
  não `useState`); a recusa (`42501`) é devolvida a quem chamou (`aoRecusa`) e **não** vira
  `falhou`; rede ⇒ `falhou`; `VerCliente`: `BOTAO_SECUNDARIO`, `min-h-11` por **token exato**,
  `Ver cliente` → `Abrindo…` **sem mudar de tamanho** (mesmas classes de largura/altura), `Não encontrei
  esta cliente.` (`role="status"`) e `Não consegui abrir agora. Tente de novo.` (`role="alert"`), sucesso
  ⇒ `navigate(clienteHref(id), { state: { doApp: true } })`; Quick (mobile-adm).
- **Reqs**: `MAC-21`, `MAC-11`.
- **Tests**: unit · **Gate**: quick

### T20 — `20-guardas-de-leitura`
- **Status**: ✅ **Feita** (2026-10-24). G2: `leituraSoComPapel` e `escritaSoPelaPorta` passam a **oito** importadores (aditivo); nova régua 2 para os quatro hooks de cliente (froms contados pela AST **e** por texto, iguais) e a régua de que nenhum faz `insert`/`update`/`upsert`/`delete`/`rpc(` (+ 9 sensores). G3 `regraDeClienteSoNoCore` (37) e G4 `semDadoSensivelDeClienteNoApp` (32). 8 mutantes dos guardas mortos. **Gate do lote (Fase 3)**: mobile-adm 1158/81 → **1447/94** (+289/+13), store 5908/322 (inalterado), tipos 0, lint do app 0/0.
- **What**: ampliar `leituraSoComPapel` (G2) e criar `regraDeClienteSoNoCore` (G3) e
  `semDadoSensivelDeClienteNoApp` (G4).
- **Where**: `apps/mobile-adm/src/shared/api/__tests__/leituraSoComPapel.test.ts` (o arquivo movido na
  T11), `apps/mobile-adm/src/shared/lib/__tests__/{regraDeClienteSoNoCore,semDadoSensivelDeClienteNoApp}.test.ts`
- **Depends on**: T17, T18, T19
- **Done when**: **G2** — a igualdade de importadores do client vira **oito** (`shared/api/lerComPapel.ts`,
  os dois hooks de pedido, `gravarAcao.ts` e os quatro de cliente); `.from(` só dentro de função passada
  a `lerComPapel(` **ou** a `useJanelaPaginada(` (o segundo ponto de pareamento, com sensor de uma
  consulta fora dos dois); nos quatro arquivos de cliente, **nenhum** `insert`/`update`/`upsert`/
  `delete`/`rpc(` (`MAC-30`); `useJanelaPaginada.ts` chama `lerComPapel` em torno de **toda** consulta
  injetada (AST); a âncora das chamadas `.from(` sobe pelas dos hooks de cliente (contadas, não
  digitadas); **G3** — entrada de mapa ou `case` com os ids/rótulos de `CUSTOMER_SLICES`,
  `.gte(`/`.eq(` sobre `orders_paid`/`orders_open`, `.ilike(` e a string `ilike.` e `or(` montado por
  template com `customer_id`/`last_activity_at`, tudo **fora de `core`**, reprovam; **G4** — `cpf`,
  `material_kinds`, `customer_notes`, `addresses`, `customer_document`, `nuvemshop_` e `same_email_count`
  em produção do app; cada `COLUNAS_*` comparada **por igualdade de chaves** com a lista da T02; `select('*')`
  e `select()` vazio em arquivo de cliente; cada guarda com âncora dupla, sensores CRLF/LF/glob e o
  inverso; Quick (mobile-adm).
- **Reqs**: `MAC-11`, `MAC-27` (G2, G3, G4), `MAC-29`, `MAC-30`.
- **Tests**: guarda · **Gate**: quick

### Fase 4 — a tela

### T21 — `21-linha-do-cliente-e-selo-em-aberto`
- **Status**: ✅ **Feita** (2026-10-24). `LinhaDoCliente`, `SeloEmAberto` e `Inicial` em `entities/customer/ui` (18 casos). A inicial usa `bg-estrelinha-ground-deep`, e não o `serenity` do tom `progress`: `Selo.test` recusa a classe de pílula fora do `Selo`. O total aparece também para quem nunca pagou (`R$ 0`, verdadeiro).
- **What**: `entities/customer/ui/{LinhaDoCliente,SeloEmAberto,Inicial}.tsx`.
- **Where**: `apps/mobile-adm/src/entities/customer/ui/*.tsx` e `ui/__tests__/*`
- **Depends on**: T15, T16
- **Reuses**: `Selo`, `formatPriceWhole`, `subtituloDaLinha`
- **Done when**: a linha é **um** `<Link to={clienteHref(id)} state={{ doApp: true }}>` com
  `aria-label` = `nomeDoCliente` e `min-h-11` por token exato; mostra inicial, nome, subtítulo e total
  inteiro (`R$ 1.250`); **`orders_open ≥ 1` ⇒ o selo "Em aberto" (tom `progress`); `0` ⇒ nenhum**;
  o selo **não** é âmbar de alerta (a classe do tom `alert` ausente, por token exato); sem nome ⇒ o
  e-mail e a inicial dele; e-mail de 60 caracteres **quebra** (`[overflow-wrap:anywhere]` no nome); **sem
  `truncate`, sem `whitespace-nowrap` e sem `shrink-0`** no selo, no total e no nome (por token exato,
  `L-034`); o total e o selo podem descer para a linha de baixo (`flex-wrap`); a inicial é decorativa
  (`aria-hidden`); "Sem compra paga ainda" aparece para quem nunca pagou; Quick (mobile-adm).
- **Reqs**: `MAC-03`, `MAC-09`, `MAC-31`, `MAC-32`.
- **Tests**: componente · **Gate**: quick

### T22 — `22-chips-e-busca-de-clientes`
- **Status**: ✅ **Feita** (2026-10-24). `ChipsDeClientes` (afordância por `useMaisAdiante`, a posição REAL de rolagem; camada `aria-hidden` apagada em jsdom) e `BuscaDeClientes` (invólucro de `CampoDeBusca`). 21 casos.
- **What**: `features/customer-slice/ui/ChipsDeClientes.tsx` e `features/customer-search/ui/BuscaDeClientes.tsx`.
- **Where**: `apps/mobile-adm/src/features/customer-slice/**`, `features/customer-search/**`
- **Depends on**: T13, T16
- **Reuses**: o molde de `ChipsDeRecorte`; `CampoDeBusca`
- **Done when**: três chips de `CUSTOMER_SLICES` na ordem do protótipo, rótulos de `core`; **só o chip do
  recorte atual está `aria-pressed`**; o toque emite só o id (quem navega é a página); `min-h-11` por
  token exato (o protótipo tinha 38 px); a faixa tem `overflow-x-auto min-w-0`, os chips `shrink-0
  whitespace-nowrap` (o chip **pode** não encolher — é a faixa que rola), e a **afordância** de que há
  mais (o degradê/seta do molde de `useOverflowAffordance`, medida só em navegador na T32 — aqui, a
  presença da camada e do `aria-hidden`); `BuscaDeClientes`: `id="busca-de-clientes"`, rótulo `Buscar
  cliente` (`sr-only`), placeholder `Nome, e-mail ou telefone`, `type="search"`, `inputMode="search"`,
  48 px (`CAMPO`); o termo sai só depois de 300 ms parada, a primeira montagem não emite, `inicial` não
  é reemitido; **Enter fecha o teclado**; Quick (mobile-adm).
- **Reqs**: `MAC-06`, `MAC-07`, `MAC-31`, `MAC-34`.
- **Tests**: componente · **Gate**: quick

### T23 — `23-lista-de-clientes`
- **Status**: ✅ **Feita** (2026-10-24). `ListaDeClientes` (24 casos). Acréscimos de frase em `frases.ts`: `VAZIO_SEM_RECORRENTE` (o terceiro vazio de recorte, que a spec não nomeava) e `LIMPAR_CLIENTES`.
- **What**: `widgets/customer-list/ui/ListaDeClientes.tsx`.
- **Where**: `apps/mobile-adm/src/widgets/customer-list/{index.ts,ui/ListaDeClientes.tsx}` e testes
- **Depends on**: T13, T15, T21
- **Done when**: **cinco estados exclusivos** (cada um com asserção da **ausência** dos outros):
  recusa/falha sem dado ⇒ `Não consegui carregar as clientes.` + "Tentar de novo" e **nenhum zero**;
  carregando ⇒ `aria-busy="true"`, quatro esqueletos, nenhum texto de conteúdo; vazio ⇒ **um texto por
  causa** (`Ainda não há clientes.`, `Ninguém com pedido em aberto agora.`, `Não achei ninguém com
  “ana”.`) e "Limpar" só com recorte ≠ `todas` ou busca; dado ⇒ a contagem do **servidor**
  (`aria-live="polite"`: com `total` 12 e 3 linhas na tela a frase diz `12 clientes`, nunca `3`), singular
  com 1, a lista, e a falha da próxima **no rodapé** (`Tentar de novo`) **sem apagar as linhas**; a
  sentinela carrega a próxima página perto do fim, se rearma, e **some** com `fim`; sem esqueleto
  eterno; Quick (mobile-adm).
- **Reqs**: `MAC-04`, `MAC-05`, `MAC-10`, `MAC-12`, `MAC-31`.
- **Tests**: componente · **Gate**: quick

### T24 — `24-clientes-page`
- **Status**: ✅ **Feita** (2026-10-24). `ClientesPage` (27 casos pela árvore real). A metade positiva de G1 saiu de `it.todo` para asserção (mais sensor). "Limpar" remonta o campo de busca por `key`. `TabBar.test` ganhou a MUDANÇA DE ASSERÇÃO declarada (Clientes saiu do "em construção").
- **What**: `pages/ClientesPage.tsx` no lugar de `EmConstrucao`.
- **Where**: `apps/mobile-adm/src/pages/ClientesPage.tsx`, `pages/__tests__/clientesPage.test.tsx`
- **Depends on**: T17, T22, T23
- **Done when**, pela **árvore real** (`montarApp` em `/clientes`): o recorte vem **só** de
  `recorteDeClientesDoEndereco` (`?recorte=zzz` abre em `todas`); o chip troca o endereço por
  **substituição** (`history.length` não cresce); a busca é estado da página — o **termo não aparece na
  URL** (`location.search` sem ele) e volta com o voltar do Android (`useTermoDaEntrada`) junto com a
  posição (`useRolagemRestaurada`); a recusa (`42501`) ⇒ a vigia leva à recusa da `72` e **nenhuma linha**
  é desenhada, nem a do cache; foco/puxar/volta da rede releem e o "Atualizado às" é o `lido_em` da RPC em
  hora de Brasília (o relógio do aparelho trocado não muda o texto); `naoAtualizou` com a releitura
  falhando e dado na tela; o `h1` "Clientes" existe em **todo** estado; o `<section>` dos resultados
  recebe `paddingBottom` = `useTecladoVirtual()`; **a metade positiva de G1**: a página lê o recorte por
  `recorteDeClientesDoEndereco` e os chips trocam por `clientesHref`; os dois recortes e o selo "Em
  aberto" leem a **mesma** coluna (mudar `orders_open` de uma linha de 1 para 0 no dublê tira o selo **e**
  a tira do recorte — nos dois sentidos); **toque duplo numa linha ⇒ uma navegação**; Quick
  (mobile-adm).
- **Reqs**: `MAC-01`..`MAC-10`, `MAC-13`, `MAC-34`, `MAC-28`.
- **Tests**: componente pela árvore real · **Gate**: quick

### T25 — `25-blocos-da-ficha`
- **Status**: ✅ **Feita** (2026-10-24). `CabecalhoDaCliente`, `NumerosDaCliente`, `ContatoDaCliente`, `PedidosDaCliente`, `LinhaDoPedidoDaCliente`, `CartaoDaFicha` e `TopoDaFicha` (23 casos). Sem dividir em T25a/T25b. O botão do WhatsApp chama `whatsappChatUrl` direto (G5).
- **What**: `widgets/customer-detail/ui/{CabecalhoDaCliente,NumerosDaCliente,ContatoDaCliente,PedidosDaCliente,LinhaDoPedidoDaCliente}.tsx`.
  *(Divisível em T25a — cabeçalho, números e contato — e T25b — pedidos, TQ1.)*
- **Where**: `apps/mobile-adm/src/widgets/customer-detail/{index.ts,ui/*.tsx}` e testes
- **Depends on**: T15, T18, T06
- **Reuses**: `whatsappChatUrl`, `SituacaoDoPedido`, `pedidoHref`, `relativeAge`, `formatPrice`
- **Done when**: `CabecalhoDaCliente` — inicial, nome (ou e-mail) e `clienteDesde` **com** e **sem**
  cidade (sem cidade, nenhum `·` solto); `NumerosDaCliente` — três números (`orders_paid`,
  `total_spent`, `avg_ticket`), **ticket `—` quando `null`** ("R$ 0,00" nunca), a legenda `Contam só os
  pedidos pagos.`, e o contêiner `grid` em `auto-fit` com piso em `rem` (token exato do `minmax(…rem…)`,
  como o `MonthCards` da `73`) — **sem coluna fixa**; `ContatoDaCliente` — e-mail sempre; **com telefone
  válido** a linha do telefone mascarado e "Conversar no WhatsApp" (`<a target="_blank" rel="noopener
  noreferrer">`, `href` **igual a `whatsappChatUrl`**, sem `?text=`, `min-h-11` + largura inteira, as
  cores de `shared/config/whatsapp.ts`); **sem telefone válido nem a linha nem o botão existem** (e o
  e-mail fica); `PedidosDaCliente` — título `Pedidos · <orders_total>` (do cabeçalho), `Nenhum pedido
  ainda.` com 0, as linhas, "Ver mais pedidos" **só** com `!fim` (44 px), a falha **do bloco** (`Não
  consegui carregar os pedidos.` + "Tentar de novo") sem tocar no resto, e a falha da próxima no rodapé
  com as linhas mantidas; `LinhaDoPedidoDaCliente` — `<Link to={pedidoHref(id)} state={{ doApp: true }}>`
  de 44 px, `#0244 · Pingente Gota` (sem item: só o número), "<data curta> · há N dias" contra o `lido_em`,
  `formatPrice(total)`, e `SituacaoDoPedido` (**nenhuma tabela de rótulo no app**:
  `situacaoComDonoUnico` da loja); tudo que pode ser longo quebra (`[overflow-wrap:anywhere]`); Quick
  (mobile-adm).
- **Reqs**: `MAC-15`..`MAC-20`, `MAC-22`, `MAC-31`, `MAC-32`.
- **Tests**: componente · **Gate**: quick

### T26 — `26-cliente-page-e-rotas`
- **Status**: ✅ **Feita** (2026-10-24). `ClientePage`, rota `/clientes/:id` dentro do `RequireAdmin`, `abasSaoAsRotas` (2 subrotas) e `rotasSobGuarda` (11 rotas, 1 `</Route>`). 25 casos. Entrada nova abre no topo (`useNavigationType !== 'POP'`); o voltar restaura a posição (`useRolagemRestaurada`).
- **What**: `pages/ClientePage.tsx`, a rota `/clientes/:id` e os guardas de rota ampliados.
- **Where**: `apps/mobile-adm/src/pages/ClientePage.tsx`, `app/App.tsx`,
  `pages/__tests__/clientePage.test.tsx`, `widgets/tab-bar/__tests__/abasSaoAsRotas.test.ts`,
  `app/__tests__/rotasSobGuarda.test.ts`
- **Depends on**: T18, T25
- **Done when**: a rota está **dentro** do `RequireAdmin`, logo depois de `/clientes`; a aba Clientes
  continua marcada na subrota (`aria-current="page"`) e `*` continua levando a `/`; `abasSaoAsRotas`
  passa a esperar **duas** subrotas (`/pedidos/:id`, `/clientes/:id`) com a regra "subrota de aba"
  intacta (o sensor de `/estoque/:id` ainda reprova); `rotasSobGuarda` segue com **um** `</Route>`; a
  página: `:id` que não é uuid ⇒ `Não encontrei esta cliente.` **sem RPC e sem leitura**
  (`log()` vazio); uuid sem linha ⇒ o mesmo texto; a recusa pela mesma vigia (nenhum bloco, nem o do
  cache — `MAC-37`); o `h1` "Cliente" existe em todo estado; **`document.title` é a constante
  `Cliente · Ateliê`, em todo estado, com o nome da pessoa ausente do título**; abre no topo
  (`scrollTo(0, 0)`); "Voltar" = `navigate(-1)` quando veio de dentro do app (`state.doApp`) e
  `navigate('/clientes')` quando não; o voltar do Android a partir de um pedido da ficha traz de volta à
  **ficha**, e dela à lista no **mesmo recorte, busca e posição**; a falha dos pedidos não derruba o
  cabeçalho nem o contato; Quick (mobile-adm).
- **Reqs**: `MAC-14`, `MAC-20`, `MAC-22`, `MAC-28` (título), `MAC-36`, `MAC-37`.
- **Tests**: componente pela árvore real + guardas · **Gate**: quick

### T27 — `27-ver-cliente-no-detalhe-do-pedido`
- **Status**: ✅ **Feita** (2026-10-24). `BlocoCliente` recebe `verCliente?: ReactNode`; `PedidoPage` compõe `VerCliente`, e a recusa do botão relê o pedido (o `42501` fica no erro da leitura e sobrevive à splash da reconferência). 7 casos pela árvore real.
- **What**: compor `VerCliente` no `BlocoCliente` do detalhe do pedido; remover o comentário da A20.
- **Where**: `apps/mobile-adm/src/widgets/order-detail/ui/BlocoCliente.tsx`,
  `apps/mobile-adm/src/pages/PedidoPage.tsx`, `pages/__tests__/verCliente.test.tsx`
- **Depends on**: T19, T26
- **Done when**: o `BlocoCliente` recebe um nó opcional (`verCliente?: ReactNode`) e a `PedidoPage`
  compõe o `VerCliente` (o mesmo padrão dos blocos da `75`: os blocos só recebem o nó); o comentário
  "Ver cliente não aparece até a `76` (A20)" **removido**; pela árvore real: o percurso **Pedidos → pedido
  de uma convidada → "Ver cliente" → a ficha dela** (a leitura do `customer_directory` por e-mail sai
  pareada com a RPC) e **ficha → pedido → voltar**; durante a espera o botão mostra `Abrindo…` sem sair do
  lugar; pessoa não achada ⇒ `Não encontrei esta cliente.` na própria linha e **nenhuma navegação**;
  a recusa vinda da leitura entra na **mesma vigia** da página do pedido (um episódio só); os testes
  antigos de `BlocoCliente` e de `PedidoPage` passam **sem asserção tocada**; Quick (mobile-adm).
- **Reqs**: `MAC-21`, `MAC-20` (o voltar), `MAC-11`.
- **Tests**: componente pela árvore real · **Gate**: quick

### T28 — `28-guardas-de-ui-e-troca-de-conta`
- **Status**: ✅ **Feita** (2026-10-24). G5 `whatsappComDonoUnico` (18), G6 `semDadoDeClienteNoAparelho` (30), G7 `tomMemorialDeClientes` (32), G8 `movimentoDeClientes` (8) e G15 em `trocaDeContaLimpaCache` (+4). Gate Full verde. 20 mutantes nos arquivos reais (SHA conferido): 19 mortos por asserção na primeira passada e o M8 (botão do WhatsApp sem href) depois de o caso passar a procurar pelo TEXTO.
- **What**: G5 (`whatsappComDonoUnico`), G6 (`semDadoDeClienteNoAparelho`), G7 (`tomMemorialDeClientes`),
  G8 (`movimentoDeClientes`) e G15 (`trocaDeContaLimpaCache` ampliado).
- **Where**: `apps/mobile-adm/src/shared/lib/__tests__/{whatsappComDonoUnico,semDadoDeClienteNoAparelho,tomMemorialDeClientes,movimentoDeClientes}.test.ts`,
  `apps/mobile-adm/src/app/__tests__/trocaDeContaLimpaCache.test.tsx` (+)
- **Depends on**: T24, T26, T27
- **Done when**: **G5** — o literal `wa.me` em `apps/mobile-adm/src`, **comentário removido** (`LembreteDoEnvio.tsx`
  cita `wa.me` em prosa), fora de `core/notifications/phone.ts` e `core/orders/charge.ts` reprova; **nos
  testes** o literal só é aceito como **valor esperado**, isto é, em linha com `expect(` (os de hoje:
  `CabecalhoClienteMaterial.test.tsx:101,110` e `acoesDoPedido.test.tsx:817` seguem verdes **sem edição**) —
  um teste que *monta* a URL (fora de `expect(`) reprova; **metade positiva** (`BlocoCliente` e
  `ContatoDaCliente` chamam `whatsappChatUrl`); sensores de interpolação, concatenação, CRLF, LF, glob
  de dois asteriscos e o inverso; **G6** — nos arquivos de cliente: `localStorage`, `sessionStorage`,
  `indexedDB`, `console.`, `document.title =` com valor que não seja literal, `history.pushState`/
  `replaceState`, `state:` diferente de `{ doApp: true }` e `navigate(` com texto que não venha de
  `clientesHref`/`clienteHref`/`pedidoHref`/`PEDIDOS_PATH`/`CLIENTES_PATH` reprovam, com sensor por forma;
  **G7** — emoji, `!`, "VIP", "melhor(es)", "top", "ranking", "atenção", "urgente", "últimas unidades" e
  os sete materiais em qualquer literal dos arquivos de cliente reprovam, com o inverso (`Em aberto` e
  `cliente desde` passam); **G8** — classe de `transition-*`/`animate-*` sem `motion-reduce:` que
  **desligue** movimento na mesma linha, nos arquivos de UI da `76` (escopo literal; `motion-reduce:opacity-100`
  não vale como par; âncora de tokens e pares medida com a própria régua); **G15** — com a lista, a
  ficha e a ficha dos pedidos no cache e um termo guardado, a troca de conta (A → B) e o sair deixam
  `getQueryCache().getAll()` **sem** nenhuma chave `atelie-clientes`, `atelie-cliente` ou
  `atelie-cliente-pedidos` e `esquecerTermos` apagou o termo (`MAC-38`); cada guarda com **âncora dupla**
  e `mutar()` que lança; Quick (mobile-adm) e **Full** ao fim do lote (a loja varre o app).
- **Reqs**: `MAC-27` (G5), `MAC-28`, `MAC-33`, `MAC-35`, `MAC-38`.
- **Tests**: guarda · **Gate**: full

### Fase 5 — o fecho e a prova

### T29 — `29-clientes-com-client-real`
- **Status**: ✅ **Feita** (2026-10-24). `clientesComClientReal.test.tsx` (12 casos, `<App />` real sobre o supabase-js real): lista e ficha com o par (RPC 200 ⇒ as linhas) e a recusa (403 `42501` + as linhas DELA ⇒ recusa e nenhum texto em ~80 instantes; consultas em 500 ⇒ a recusa vence; rede caída ⇒ falha, nunca recusa, papel lido uma vez); a ficha aberta cujo papel cai (`MAC-37`); "Ver cliente" com 200, 403 e rede. 5 mutantes (ordem trocada, erro da RPC ignorado, `queryFn` sem `lerComPapel`, `Promise.all`, rede como recusa) mortos por asserção, SHA-256 conferido.
- **What**: `clientesComClientReal.test.tsx` — o `<App />` real sobre o supabase-js real.
- **Where**: `apps/mobile-adm/src/app/__tests__/clientesComClientReal.test.tsx`
- **Depends on**: T24, T26, T27
- **Done when**, em `/clientes`, `/clientes/<id>` e no "Ver cliente" de `/pedidos/<id>`: `customer_list` (ou
  `customer_directory`/`order_list`) devolvendo a linha de uma cliente **comum** + `atelie_clock` em 403
  `42501` ⇒ a recusa da `72` e **nenhum texto dela** (nome, e-mail, telefone) no DOM em **nenhum** dos
  ~80 instantes lidos; com a lista em 500 a recusa **ainda vence**; a RPC sem rede ⇒ falha de leitura,
  nunca a recusa; o par com a RPC em 200 ⇒ as linhas aparecem; a ficha aberta cujo papel cai e a releitura
  volta `42501` ⇒ a recusa assume e a ficha **não** fica desenhada (`MAC-37`); **cinco mutantes** de
  `lerComPapel`/`useJanelaPaginada` (ordem trocada, erro da RPC ignorado, dado antes da confirmação,
  `Promise.all`, rede tratada como recusa) reinjetados nos arquivos reais — SHA-256 na restauração — e
  **mortos por asserção**; Quick (mobile-adm).
- **Reqs**: `MAC-11`, `MAC-12`, `MAC-22`, `MAC-37`, `MAC-38`.
- **Tests**: integração · **Gate**: quick

### T30 — `30-probe-de-paridade-do-app`
- **Status**: ✅ **Feita** (2026-10-24). `probes/03-paridade.{sh,ts,saida.txt,mutantes.txt}` + `03-fixturas.sql`/`03-limpa.sql`: 42 `ok —` em duas fases (48 pessoas reais: todas 48 · recorrentes 3 · em aberto 18, janelas de 25 com 48 `id` distintos, selo = chip; com fixturas, 73 pessoas, a ficha soma `orders_total` em TODAS, VROSA_RJ × VROSAXRJ, a conta sem papel lê a linha dela sem erro e `atelie_clock` a recusa com 42501). 2 mutantes nos arquivos reais de core (`like.ts` sem escape; `cursor.ts` sem o ramo dos nulos) reprovam o caso certo; banco 54/9/48 antes e depois.
- **What**: probe contra o banco local (supabase-js real, sessão do admin do `seed.sql` e uma conta de
  cliente) que prova o que os Success Criteria 2, 3 e 4 pedem.
- **Where**: `.specs/features/76-mobile-adm-clientes/probes/03-paridade.{sh,ts,saida.txt}`
- **Depends on**: T17, T18, T19
- **Done when**: as janelas somadas da lista (cursor, 25 por vez) têm **48 `id` distintos** e cobrem
  `customer_list`; a contagem de cada chip = `select count(*) from customer_list where <predicado>`
  (**todas 48 · recorrentes 3 · em aberto 18**); o selo "Em aberto" (linhas com `orders_open ≥ 1`) = as
  linhas do chip; para **toda** pessoa do banco, o total de pedidos lidos pela cadeia da ficha =
  `orders_total` de `customer_list`, **inclusive a convidada e a fixtura de `VROSA_RJ`/`VROSAXRJ`**; uma
  **conta sem papel admin com pedido próprio** lendo as mesmas cadeias recebe `atelie_clock` `42501`
  (e o dado sozinho traria a linha dela — o vazamento falso-plausível que `lerComPapel` fecha); 2
  mutantes (o vínculo sem escape; o cursor sem o ramo dos nulos) reprovam o caso certo; fixturas
  `P76-` apagadas, contagens iguais.
- **Reqs**: `MAC-01`, `MAC-02`, `MAC-05`, `MAC-08`, `MAC-09`, `MAC-11`, `MAC-18`, `MAC-19`.
- **Tests**: probe · **Gate**: nenhum

### T31 — `31-gates-e-build`
- **Status**: ✅ **Feita** (2026-10-24), um workspace por vez, exit fora de pipe: core **4313/175** · mobile-adm **1698/107** · store **5908/322** · backoffice **3706/213** · functions 957/21 · catalog-import 512/23 = **17094/861** (+723/+43 contra 16371/818). `tsc` 0 em store (app e server), backoffice, mobile-adm (app e node) e catalog-import; 11 herdados em core, os mesmos; lint 0/0 · 23/5 · 2/2; builds do mobile-adm e do backoffice verdes; `git status` de `apps/backoffice/**/*.test.*` só com arquivo NOVO; `payment/**` sem alteração; uma migration, prefixo único; `marcacaoSoPorAcao` só com comentário de caminho mudado (nenhuma RPC nova).
- **What**: o gate de fecho — nada de regressão, painel sem asserção tocada, build.
- **Where**: — (`validation.md` recebe a evidência)
- **Depends on**: T29, T30
- **Done when**: as **seis** suítes, um workspace por vez e exit code fora de pipe, **sem queda** contra
  `baseline.md` (store ≥ 5885/320, **backoffice 3696/212 + só os casos da T07**, mobile-adm ≥ 1102/76 +
  os novos, core ≥ 4219/166 + os novos, functions 957/21, catalog-import 512/23) e a queda só passa se
  *declarada e reaparecida do outro lado*; **`git diff` de `apps/backoffice/**/*.test.*` mostra apenas
  arquivos NOVOS** (nenhum teste antigo tocado — `AD-056`); `tsc` 0 nos sete projetos de app e 11
  herdados em `core` (os mesmos, linha a linha); `eslint` 0/0 · 23/5 · 2/2; `pnpm --filter
  @estrelinha/mobile-adm build` e `… backoffice build` verdes; `swSemDadosDaLoja` verde (o service worker
  não guarda dado, `MAC-29`); `packages/core/src/payment/**` sem **uma linha** alterada
  (`git diff --name-only`); a migration é a **única** e seu prefixo é único; nenhuma RPC nova na lista de
  `marcacaoSoPorAcao`.
- **Reqs**: `MAC-23`, `MAC-24`, `MAC-25`, `MAC-29`, `MAC-30`; Success Criteria de gate.
- **Tests**: gate · **Gate**: build

### T32 — `32-prova-em-navegador`
- **Status**: ✅ **Feita** (2026-10-24). `prova-navegador.md` + `prova/`: build servido, percurso completo, 60 medidas de layout (360/390/412/1440 × 100/130/200 %) sem falha, voltar com recorte/busca/posição, teclado emulado, menos movimento, varredura de privacidade e a conta sem papel. Nenhum defeito achado. **Android real pendente** (TQ10).
- **What**: a prova em navegador real (Playwright no build servido), escrita em `prova-navegador.md`.
- **Where**: `.specs/features/76-mobile-adm-clientes/prova-navegador.md` (+ `prova/`)
- **Depends on**: T31
- **Done when**: o **build** do mobile-adm servido por `vite preview` numa porta livre, apontando para o
  Supabase local, **o bundle servido conferido** (grep do texto da tela nova) antes de medir; o percurso
  **Início → Pedidos → pedido → "Ver cliente" → ficha → pedido dela → voltar** feito de verdade, com a
  sessão do admin do `seed.sql`, e a **conta de cliente sem papel** recebendo a recusa; medido em
  **360, 390, 412 e 1440** de largura e com a fonte do sistema a **100, 130 e 200 %**: sem rolagem
  horizontal do corpo na lista e na ficha (`scrollWidth ≤ clientWidth`); a faixa de chips rolando
  **dentro de si** com a afordância; todos os alvos (linha, chip, "Conversar no WhatsApp", "Ver
  cliente", "Ver mais pedidos", linha do pedido) com **≥ 44 px**; o nome e o e-mail longos quebram, o
  selo "Em aberto" e o total descem para a linha de baixo, os três números **empilham** a 200 % e nada
  se sobrepõe nem é cortado (com as fixturas da T14 gravadas no banco local e **removidas** depois); o
  teclado emulado (`visualViewport` reduzido): o campo e o último resultado visíveis, Enter fecha o
  teclado, `history.back()` com o campo focado; o voltar da ficha traz o **mesmo recorte, busca e
  posição**; `prefers-reduced-motion` ligado e desligado mostram os mesmos estados; **a varredura de
  privacidade** com a lista, a busca por telefone, a ficha e "Ver cliente": nenhum nome, e-mail ou
  telefone na URL (`location.href` em cada passo), no `history.state`, em `localStorage`/`sessionStorage`/
  IndexedDB (chaves e valores), no `document.title`, no console, e nenhuma requisição fora do Supabase
  local — interceptação **por caminho** (`**/rest/v1/**`), nunca por domínio, **bloqueando `*.supabase.co`**
  para o banco local não alcançar o Storage hospedado (a lição da `71`); o filtro de robô do contador de
  visitas não interfere (a `76` não monta nada dele); **a pendência de Android real declarada** (TQ10);
  cada defeito achado vira uma entrada com **teste antes do conserto** e reteste.
- **Reqs**: `MAC-28`, `MAC-31`..`MAC-34`; Success Criteria 1 e 5.
- **Tests**: navegador · **Gate**: nenhum

### T33 — `33-baselines-e-documentacao`
- **Status**: ✅ **Feita** (2026-10-24). `CLAUDE.md` raiz (baselines medidas no fecho, linha da `76`, os guardas, a linha envelhecida corrigida), `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `STATE.md` (`AD-061` aceita e handoff), `BACKLOG.md` (`BL-052`), `spec.md`/`design.md` (Status), `validation.md` (evidência do gate; o Verificador independente ainda não correu).
- **What**: atualizar as baselines e a documentação que a feature tocou.
- **Where**: `CLAUDE.md` (raiz), `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`,
  `apps/backoffice/CLAUDE.md` (se mexer em `entities/customer`), `.specs/STATE.md`, `.specs/BACKLOG.md`,
  `.specs/features/76-mobile-adm-clientes/spec.md` (Status) e `design.md` (Status)
- **Depends on**: T32
- **Done when**: o `CLAUDE.md` raiz — a tabela *Baselines* com os números **medidos no fecho** (nunca
  somados), a linha da `76` na lista de features (IMPLEMENTADA, a decisão `AD-060`/`AD-061`), **cada
  guarda novo** na tabela *Os guardas* (G1–G12, G15, com onde mora e o que derruba), a correção da linha
  envelhecida (15819/792 → o que a árvore mede) e a ressalva do que NÃO foi provado (Android real);
  `apps/mobile-adm/CLAUDE.md` — a tabela de rotas (`/clientes`, `/clientes/:id`) e uma seção "Clientes
  (feature `76`)" com `lerComPapel` em `shared/api`, `useJanelaPaginada`, `core/customers`, o endereço,
  a privacidade (nada na URL/título/storage) e o que não existe (notas, CPF, ranking);
  `packages/core/CLAUDE.md` — o módulo `customers` e `whatsappChatUrl`; `supabase/CLAUDE.md` — a
  migration e a **ordem de publicação migration → bundle**; `STATE.md` — `AD-061` e o handoff (o que
  entrega, números, o que ficou pendente: **Android real**, as assunções `n — confirmar`, a aplicação da
  migration em produção); `BACKLOG.md` — **`BL-052`** (o painel chama `customerOrdersCondition`) e,
  se a T10 mediu > 1 s, a entrada de desempenho; `validation.md` e `prova-navegador.md` existem; um
  `grep` nos arquivos tocados não acha o `TODO`/`FIXME` da feature.
- **Reqs**: `MAC-36` (CLAUDE.md do app), `MAC-27`; regra do projeto "ao fechar uma feature, atualize as
  baselines".
- **Tests**: — · **Gate**: leitura (as contagens do texto = as do disco)

---

## Requisito → Task

| Req | Tasks |
| --- | --- |
| MAC-01 | T10, T17, T23, T24, T30 |
| MAC-02 | T02, T17, T24, T30 |
| MAC-03 | T15, T21, T24 |
| MAC-04 | T15, T17, T23, T24 |
| MAC-05 | T02, T05, T12, T17, T23, T30 |
| MAC-06 | T02, T04, T13, T17, T22, T24 |
| MAC-07 | T03, T16, T22, T24 |
| MAC-08 | T03, T07, T24, T30 |
| MAC-09 | T03, T08, T10, T21, T24, T30 |
| MAC-10 | T15, T23, T24 |
| MAC-11 | T11, T12, T17, T18, T19, T20, T27, T29, T30 |
| MAC-12 | T12, T17, T18, T23, T25, T29 |
| MAC-13 | T17, T24 |
| MAC-14 | T02, T16, T18, T26 |
| MAC-15 | T15, T18, T25 |
| MAC-16 | T15, T25 |
| MAC-17 | T06, T25 |
| MAC-18 | T02, T05, T18, T25, T30 |
| MAC-19 | T18, T25, T30 |
| MAC-20 | T25, T26, T27 |
| MAC-21 | T19, T27 |
| MAC-22 | T18, T25, T26, T29 |
| MAC-23 | T03, T07, T31 |
| MAC-24 | T08, T09, T10, T31 |
| MAC-25 | T04, T07, T31 |
| MAC-26 | T06 |
| MAC-27 | T05 (G12), T07 (G11), T09 (G9, G10), T16 (G1), T20 (G2–G4), T28 (G5–G8, G15), T33 |
| MAC-28 | T16, T24, T26, T28, T32 |
| MAC-29 | T02, T15, T20, T31 |
| MAC-30 | T20, T31 |
| MAC-31 | T21, T22, T23, T25, T32 |
| MAC-32 | T21, T25, T32 |
| MAC-33 | T28 |
| MAC-34 | T13, T22, T24, T32 |
| MAC-35 | T15, T28 |
| MAC-36 | T26, T33 |
| MAC-37 | T26, T29 |
| MAC-38 | T28, T29 |

**Cobertura**: 38 de 38 requisitos mapeados a pelo menos uma task; nenhum requisito só em T33.

---

## Conserto do QA (Bxx)

Cada bug do ciclo de QA (`docs/qa/bugs/BUG-20261024-*`) vira uma task aqui, com teste que reprova ANTES do
conserto, conserto pela causa e o defeito reinjetado no arquivo real (alvo único, SHA-256 conferido na
restauração). **Mutantes: 20 reinjetados, 20 mortos por asserção, 0 por compilação** (dois sobreviveram na
primeira escrita — a retentativa do "Ver mais" com a falha já na tela e o recorte de `role="search"` do
`useBuscaEmFoco` — e ganharam caso). **Medido** (2026-10-24, um workspace por vez, exit fora de pipe,
`--testTimeout=20000` sem o `--`): mobile-adm **1736/110** (+38/+3), core **4337/175** (+24), backoffice
**3707/214** (+1/+1), store **5908/322** (0) — todos verdes. `tsc`: 0 · 0 · 0, core 11 herdados; eslint
0/0 · 23/5 · 2/2; build do mobile-adm verde. **Não feito aqui**: reteste em navegador (B06 e B07 são
layout, que jsdom não mede) e Android real.

### B01 — `b01-busca-espaco-duplo-ou-nbsp` (`MAC-06`; `BUG-20261024-busca-nao-acha-colada-com-espaco-duplo-ou-nbsp`)

- **Causa**: `buildCustomerSearchCondition` aparava só as pontas; os espaços do meio (dois, ou o U+00A0 do
  WhatsApp Web) entravam crus no `ilike`.
- **Teste que reprovou antes** (`core/customers/__tests__/search.test.ts`): 18 casos, entre eles
  `Marina  Albuquerque`, `Marina\u00A0Albuquerque` e o caractere de largura zero.
- **Conserto pela causa (em `core`, o dono)**: `limparTermoColado` — `\s+` vira um espaço, invisíveis somem —
  chamado só por `buildAppCustomerSearch`. O painel (sem opts) segue caractere a caractere (caso novo
  compara com a função antiga).
- **Mutantes**: sem o `replace(/\s+/g, ' ')`; `buildAppCustomerSearch` sem chamar a limpeza — mortos.
- **Status**: fixed.

### B02 — `b02-busca-email-colado-com-sinais` (`MAC-06`; `BUG-20261024-busca-nao-acha-email-colado-com-sinais`)

- **Causa**: o termo colado de um cabeçalho (`Nome <e-mail>`, `mailto:`, ponto final) ou com rótulo
  (`Cel:`) ia inteiro ao `ilike`.
- **Conserto**: a mesma `limparTermoColado`. Havendo `usuário@domínio` no meio, o termo é ele, sem
  `< > " , ; ( )`, sem `mailto:` e sem a pontuação final; `maria@` e `@dominio` (pedaço) ficam como estão.
  O rótulo de telefone é de **lista fechada** (`cel`, `celular`, `tel`, `telefone`, `fone`, `whats(app)`,
  `zap`, `wpp`) e só cai quando o resto tem cara de telefone — `Telma Souza`, `Cel Silva` e `Marina 2`
  são nomes e ficam intactos (casos de guarda).
- **Mutantes**: extração do e-mail desligada e rótulo desligado — mortos.
- **Status**: fixed.

### B03 — `b03-busca-sem-acento` (`BUG-20261024-busca-sem-acento-nao-acha-nome-com-acento`)

- **Não consertado: decisão humana.** `ilike` não dobra acento; a saída honesta é `unaccent` (ou coluna
  dobrada) no banco — uma migration, e a busca do painel passa a ter o mesmo comportamento (hoje a
  paridade é exata). Opções do bug: (a) manter a paridade, (b) migration com `unaccent`, (c) filtro no
  cliente (não serve acima de 25 linhas). Devolvida como pergunta.
- **Status**: open.

### B04 — `b04-painel-ficha-vinculo-por-email-exato` (A10, `BL-052`; `BUG-20261024-painel-ficha-puxa-pedido-de-outra-pessoa-por-underscore`)

- **Causa**: `useAdminCustomer` ligava a pessoa aos pedidos por `customer_email.ilike.<e-mail cru>`; o `_`
  de `VROSA_RJ@…` é curinga.
- **Teste que reprovou antes** (`backoffice/entities/customer/api/useAdminCustomer.vinculo.test.ts`):
  o `.or()` da leitura de `orders` tem de ser `customerOrdersCondition(id, e-mail)`, com o `_` escapado.
- **Conserto**: o painel chama o dono já existente (`core/customers`), uma linha. A BUSCA do painel segue
  como está (BL-052 fica aberta só nela). Nenhum teste antigo tocado.
- **Mutante**: o `.or()` antigo reinjetado — morto.
- **Status**: fixed.

### B05 — `b05-recusa-com-papel-admin-sem-tempestade` (`MAC-11`, `MAC-37`; `BUG-20261024-recusa-com-papel-admin-vira-tempestade-de-requisicoes`)

- **Causa**: o episódio da vigia (`reconferidoPara`, do módulo) terminava com a mera ausência de erro. Na
  remontagem depois de `retryAdminCheck`, a consulta sem dado recomeça e o React Query apaga o erro enquanto
  ela lê: o episódio "acabava", o `42501` seguinte reconferia, a página desmontava, e assim para sempre.
- **Teste que reprovou antes** (`app/__tests__/recusaComPapelAdmin.test.tsx`, o `<App />` e o supabase-js
  reais, papel `admin` + `atelie_clock` 403 + consulta 500, 8 s de relógio falso, três rotas): **149**
  consultas de papel contra o teto de 4.
- **Conserto pela causa**: `useRecusaDePapel(erros, leituraBoa)` — o episódio só acaba com uma leitura que
  voltou com dado e sem erro; as cinco páginas (`Inicio`, `Pedidos`, `Pedido`, `Clientes`, `Cliente`) passam
  o segundo argumento. Sem ele, só a troca de conta encerra. `esquecerReconferencia()` (para testes) é
  chamado no `beforeEach` do `setup.ts` por **import dinâmico** — o estático carregaria o client do
  supabase antes do `vi.mock` do arquivo de teste e quebraria 20 casos.
- **Teste de unidade** (`useRecusaDePapel.test.tsx` +1): "sem erro porque recomeçou" não encerra o episódio.
- **Mutante**: `leituraBoa &&` removido — morto (3 casos de página + 1 de unidade).
- **Status**: fixed.

### B06 — `b06-barra-de-abas-some-com-a-busca-em-foco` (`MAC-34`; `BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca`)

- **Causa**: a barra de abas é `fixed` embaixo; com o teclado aberto sobra pouco da tela e a barra cobria a
  primeira linha (a 130 % e a 200 %, ela inteira ficava atrás da barra).
- **Testes que reprovaram antes** (`pages/__tests__/clientesPage.test.tsx` +4, pelo `<App />`): foco no
  campo ⇒ a `nav` "Áreas do ateliê" não está na tela (a reserva dela, sim); Enter e tocar fora a devolvem;
  um chip em foco não a esconde; as linhas seguem na tela.
- **Conserto**: `useBuscaEmFoco` (`shared/lib`, escuta `focusin`/`focusout` no documento; só o campo de
  texto dentro de `role="search"`) e o `MobileLayout` não desenha a `TabBar` enquanto verdadeiro. Vale
  igualmente para a busca de Pedidos. `useBuscaEmFoco.test.tsx` (+5): o campo do rastreio e um botão dentro
  da busca não contam.
- **Mutantes**: `{true && <TabBar` e o recorte de `role="search"` — mortos (o segundo só depois do caso do
  campo fora da busca).
- **Ressalva**: no Android o voltar fecha o teclado sem tirar o foco do campo; a barra só volta ao tocar
  fora ou no Enter. E **a prova em navegador a 130 %/200 % ainda não foi refeita**.
- **Status**: fixed (reteste pendente).

### B07 — `b07-nome-da-ficha-a-200` (`MAC-32`; `BUG-20261024-nome-da-ficha-quebra-no-meio-da-palavra-a-200`)

- **Causa**: o avatar (`h-14`, em `rem`) cresce com a fonte e o texto ficava numa coluna de ~260 px.
- **Conserto**: `CabecalhoDaCliente` com `flex-wrap` e `min-w-[min(100%,12rem)]` no bloco do texto: a 200 %
  o avatar sobe e o nome usa a largura inteira; a 100 % a linha segue única. Teste de fonte por token exato
  (`BlocosDaFicha.test.tsx` +1; jsdom devolve 0 para layout).
- **Mutantes**: `flex-wrap` removido e o piso removido — mortos.
- **Status**: fixed (medição em navegador pendente).

### B08 — `b08-linha-do-cliente-diz-tudo` (`MAC-03`; `BUG-20261024-linha-do-cliente-so-diz-o-nome`)

- **Causa**: `aria-label={nome}` substitui o conteúdo do link.
- **Conserto**: `aria-label` = "nome, N compras, última há X, R$ total[, em aberto]" (o `·` vira vírgula).
  Testes em `LinhaDoCliente.test.tsx` (+3). Dois testes antigos que liam o `aria-label` como se fosse o
  nome passaram a ler `data-parte="nome"` / o nome começando por (o dado era o mesmo, a fonte mudou).
- **Mutante**: `aria-label={nomeDoCliente(cliente)}` — morto.
- **Status**: fixed.

### B09 — `b09-vazio-e-limpar-anunciados` (`MAC-10`; `BUG-20261024-vazio-da-busca-nao-e-anunciado`)

- **Causa**: o vazio era um `<p>` sem papel, montado no lugar da lista; uma região viva que nasce com o
  texto costuma não ser anunciada, e o botão "Limpar" sumia em silêncio.
- **Conserto**: `ListaDeClientes` mantém uma região `aria-live="polite"` montada em todo estado:
  "Nenhum resultado." (curto, para a frase com o termo não aparecer duas vezes na árvore) e "Busca e recorte
  desfeitos." depois do "Limpar". Sem `role="status"`: `getByRole('status')` do puxar de `clientesPage`
  ficaria ambíguo, e a tela já tem um.
- **Testes** (`ListaDeClientes.test.tsx` +6): a região é a mesma entre estados, e a frase entra nela.
- **Mutantes**: sem a frase do vazio e sem a frase do "Limpar" — mortos.
- **Status**: fixed.

### B10 — `b10-ver-mais-pedidos-foco` (`MAC-18`, `MAC-22`; `BUG-20261024-ver-mais-pedidos-foco-cai-no-body`)

- **Causa**: o botão saía do DOM com a última janela e o foco caía no `<body>`.
- **Conserto**: `PedidosDaCliente` guarda quantas linhas havia no toque; quando chegam mais, o foco vai à
  primeira nova e a região viva diz "Agora são N pedidos na lista."; se a próxima página falha, o foco vai
  ao "Tentar de novo" do rodapé (só numa falha NOVA — um "Tentar de novo" que falha de novo não mexe).
  Sem toque, uma releitura não rouba o foco. `BlocosDaFicha.test.tsx` +6.
- **Mutantes**: sem o foco na linha, sem o foco no rodapé, sem o aviso, sem o recorte da falha nova — mortos.
- **Status**: fixed.

### B11 — `b11-link-de-aba-nova-avisa` (`MAC-17`; `BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba`)

- **Causa**: `target="_blank"` sem aviso no nome acessível — e o mesmo padrão em outros dois links do app.
- **Conserto**: `shared/config/novaAba.ts` é o dono do aviso; os três links (`ContatoDaCliente`,
  `BlocoCliente` da 74, `LembreteDoEnvio` da 75) levam `aria-label` "<rótulo> (abre em outra aba)", com o
  rótulo visível primeiro. Guarda `novaAbaAvisada.test.ts` (âncora dupla: arquivos lidos e os três links;
  5 sensores). Testes antigos de 74 e 75 que casavam o nome exato tiveram o nome esperado atualizado.
- **Mutantes**: o aviso removido de cada um dos três — mortos pelo guarda.
- **Status**: fixed.

### B12 — `b12-material-no-nome-do-item` (`MAC-18` × `MAC-35`; `BUG-20261024-ficha-nomeia-o-material-pelo-item`)

- **Não consertado: decisão humana.** A spec se contradiz: `MAC-18` manda mostrar o nome do item e `MAC-35`
  (e o Out of Scope) manda não nomear o material; os nomes do catálogo trazem o material. Opções: (a) tirar
  o item da linha do pedido na ficha (recomendação do bug), (b) manter e reescrever `MAC-35`, (c) mostrar só
  a categoria da peça. Devolvida como pergunta.
- **Status**: open.

### B13 — `b13-teclado-aberto-resultados` (`MAC-34`; `BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca`, residual de B06)

- **Causa**: sem a barra de abas, o título, o campo, os chips e a hora da leitura ainda ocupavam a tela curta (teclado aberto, fonte 130 %/200 %).
- **Conserto**: com o foco na busca o `h1` vira `sr-only` e a linha de frescor sai (menos quando traz "não atualizou"); `CampoDeBusca` sobe ao topo (`scrollIntoView`) 300 ms depois do foco. Os chips ficam (tirá-los no blur perderia o toque). Testes `clientesPage.test.tsx` +2, reprovavam antes.
- **Status**: fixed (reteste em navegador a 130 %/200 % pendente; a 200 % a linha tem ~566 px e pode seguir parcial).

### B14 — `b14-limpar-devolve-o-foco` (`BUG-20261024-limpar-da-busca-deixa-o-foco-no-body`)

- **Causa**: "Limpar" remonta o campo e o botão sai do DOM. **Conserto**: efeito em `ClientesPage` foca `#busca-de-clientes` após a remontagem. Teste +1 (reprovava antes). **Status**: fixed.

### B15 — `b15-tentar-de-novo-da-ficha-foco` (`BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo`)

- **Causa**: o rodapé sai do ar durante a releitura e `falhaNoToque` impedia o foco na falha seguinte. **Conserto**: a flag zera quando a falha sai; a falha seguinte é nova e foca o botão novo. Teste +1 no fluxo real (falha, no ar, falha, sucesso). **Status**: fixed.

Remedido: mobile-adm 1752 verdes, store 5908 verdes, tsc mobile-adm 0, lint mobile-adm limpo.

### bug-16 — `bug-16-primeiro-toque-em-chip-com-busca-em-foco` (`MAC-34`; `BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco`, regressão do B13)

- **Causa**: o `focusout` do toque devolvia o `h1` e a linha de frescor antes do clique; o chip descia ~32 px e o clique caía fora dele.
- **Conserto**: `useBuscaEmFoco` segura a saída do foco quando há um dedo no vidro (`pointerdown`) e a solta no `click`, 150 ms depois do `pointerup` ou no `pointercancel`; sem dedo (Enter, teclado) é imediata; o foco que volta ao campo cancela a saída pendente.
- **Testes** (reprovavam antes): `useBuscaEmFoco.test.tsx` +3, `clientesPage.test.tsx` +1 (o primeiro toque no chip, pelo `<App />`).
- **Status**: fixed (reteste em navegador com toque, 390x844, pendente).

### bug-17 — `bug-17-linha-do-cliente-a-200` (`MAC-32`; `BUG-20261024-linha-do-cliente-quebra-palavra-e-pilula-a-200`)

- **Causa**: a inicial grande a 200 % deixava ~155 px ao texto, e `overflow-wrap:anywhere` partia "Albuquerque" e a pílula.
- **Conserto**: `LinhaDoCliente` embrulha (`flex-wrap`) e o bloco de texto tem piso `min-w-[min(100%,12rem)]`: sem espaço ao lado da inicial, desce e ganha a linha inteira. Testes +2 (reprovavam antes) — régua de forma, jsdom não mede layout.
- **Status**: fixed (reteste a 200 % em navegador pendente).

Remedido: mobile-adm 1762 verdes (+10), store 5908 verdes, tsc mobile-adm 0, lint mobile-adm limpo.

### bug-18 — `bug-18-foco-no-botao-tocado-solta-o-sinal` (`MAC-34`; `BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco`, regressão do bug-16)

- **Causa** (medida no reteste 3): a ordem do toque no Chromium é `pointerdown, pointerup, mousedown, focusout (campo), focusin (botão)`. O `bug-16` segurava o `focusout`, mas `entrou` zerava o pendente e fazia `setEmFoco(false)` no `focusin` do botão tocado, e o `h1` voltava antes do clique. O teste de unidade nunca disparava o `focusin` num botão.
- **Conserto**: `entrou` só aplica a entrada quando o alvo é campo de busca; foco que chega a outro elemento com o dedo no vidro mantém a espera (`pendente`) até o `click` ou o fim do toque; sem dedo, solta na hora.
- **Testes** (reprovavam antes): `useBuscaEmFoco.test.tsx` +2 (`focusin` no botão tocado; `focusin` noutro campo fora da busca com o dedo no vidro).
- **Status**: fixed (reteste em navegador com toque, 390x844, pendente).

Remedido: mobile-adm 1765 verdes, store 5908 verdes, tsc mobile-adm 0, lint mobile-adm limpo.
