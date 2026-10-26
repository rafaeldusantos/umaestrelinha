# 75 — mobile-adm: ações no pedido — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto, acima da Skill** (`CLAUDE.md` raiz, `BL-012`): **sem** commit por
> task. Os commits saem juntos no fim, **no branch `feat/75-mobile-adm-acoes-do-pedido`**, e só no
> passo de fecho que o usuário pediu. Sub-agentes não fazem commit, nem `git stash`/`checkout`/
> `reset`/`merge`.
>
> **Worktree**: tudo em
> `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store-75-mobile-adm-acoes-do-pedido`,
> por caminho absoluto, todo comando começando por `cd <worktree> &&`. Nunca editar o checkout
> principal (`/Users/rafael.santos/Projetos/uma-estrelinha/store`).
>
> **Merge** (`AD-056`): finalizada e testada (tasks concluídas, Verificador com PASS, gates sem
> regressão, QA com os bugs consertados e retestados, prova em navegador escrita), a branch é
> mergeada em **`feature/mobile-adm`**, nunca na `master`.
>
> **Banco**: só o local (faixa 54440–54449). **Sem migration nesta feature** (design, cabeçalho).
> **Nunca** `supabase stop --all`, `db push` ou `secrets set`. Probes com fixturas identificadas
> (`P75-…`) e apagadas no fim, conferindo a contagem de `orders` antes e depois. Portas 8082–8084 são
> de outras sessões: a prova em navegador usa `vite preview` numa porta livre.
>
> **Mutantes**: editar no lugar e restaurar conferindo **SHA-256**; o arnês **lança** quando a string
> alvo não existe; separar morte por asserção de morte por compilação (memória "mutante que morre por
> compilação").
>
> **O Design manda** (`design.md`, aprovado; §14 são as decisões do portão, §15 a rastreabilidade).
> Onde o texto da spec e o do design divergem em detalhe de forma (nome de arquivo, assinatura), vale
> o design. Os ids `MAA-xx` são os da spec; uma task só está feita quando os `MAA` que ela cita têm a
> asserção que o "Done when" pede.

---

**Spec**: `.specs/features/75-mobile-adm-acoes-do-pedido/spec.md` (41 requisitos, `MAA-01`..`MAA-41`)
· **Design**: `design.md` (abordagem A, `AD-059`, `BL-051`)
**Status**: Approved — portão de Tasks fechado em 2026-10-24 (validador independente, `approved: true`).
As decisões que dependem do usuário seguem como **`n — confirmar`** (tabela abaixo) e **não** bloqueiam
o Execute.

---

## Decisões do portão de Tasks

| Id | Decisão | Confirmação |
| --- | --- | --- |
| **TQ1** | 31 tasks em **5 lotes sequenciais** (tabela do Execution Plan); Verificador e QA depois do Lote 5. A **T23 fica inteira**, com autorização escrita para dividi-la em **T23a** (caminhos felizes e rótulos: `MAA-01`, `02`, `05`, `06`, `07`, `13`, `15`, `16`, `38`) e **T23b** (falha, recusa, zero linhas, exclusividade, sem conexão e Realtime: `MAA-03`, `04`, `09`, `20`..`26`, `35`, `40`, `41`) se o executor passar do orçamento de contexto — o mesmo arquivo de teste e o mesmo *Done when* servem às duas. **Cortar a régua para caber é proibido**; dividir é a saída. Juntar os Lotes 4 e 5 foi recusado (UI × banco/build servido) | fechada |
| **TQ2** | **Painel e guarda primeiro** (T12 → T13), depois o app: o dono único (`AD-059`) tem dois consumidores desde o primeiro dia, e a metade positiva do app nasce condicional (T13) e vira incondicional na T16. Conferido: as três escritas e o `cancelOrder` moram hoje em `useAdminOrders.ts:122–215`, e `pedidoComDonoUnico` só recusa `insert` em `orders`/`order_items` em `apps/store` e `apps/backoffice` — mover `update`/`insert` para `packages/core` não quebra guarda nenhum, e o guarda novo é quem passa a proteger | fechada |
| **TQ3** | Reiniciar o Supabase local é **permitido com condições** (T01 e T29): (1) antes de qualquer restart, conferir `send-notification` viva (`401` sem auth) e registrar em `baseline.md` o caminho montado pelo container do edge runtime (`docker inspect`, campo `Mounts`); (2) só reiniciar se o `503` citar um arquivo **que existe no disco** (bind-mount obsoleto, features `53`/`56`); (3) `supabase stop` **sem `--all` e sem `--no-backup`**, depois `supabase start`; (4) o `project_id` `uma-estrelinha-store` é o **mesmo** no worktree e no checkout principal — o stop derruba a instância das outras sessões (portas 8082–8084): avisar no relatório e reiniciar logo; se o start sair do worktree, as functions passam a ser montadas de um diretório que será removido depois do merge — o handoff da T30 registra que o próximo `supabase start` deve sair do checkout principal. Nenhum comando de escrita no hospedado | fechada |
| **TQ4 / A8** | O código de rastreio é **aparado, sem espaços internos, em maiúsculas**, e recusado com **menos de 8** caracteres, **sem formato imposto** (Jadlog, Loggi, Melhor Envio passam). Precedente: `parcelTrackingUrl` já trata o código como insensível a caixa. A validação vale **só no app**: o painel não passa a validar, e por isso `writeTrackingCode` **não normaliza nem valida** (T09/T12) | **n — confirmar** |
| **TQ5 / A11** | Os textos de confirmação da spec, citando e-mail **só com `sent === true`** e só quando o evento produzido é o que a frase nomeia — nunca a partir de `delivered`, nem em "Alterar" de `shipped`, nem no idempotente de `MAA-05`. Sujeito à leitura da Adri | **n — confirmar** |
| **TQ6 / A17** | O lembrete aparece só com `aguardando_material`, pedido não cancelado e `normalizeBrPhone(customer_phone)` válido. Sem número o botão **some no app**; o painel continua como hoje (`chargeMaterialUrl` sobe byte a byte com o ramo sem número, e o painel reexporta por `toBe`). O corte é a **condição de exibição** (`canChargeMaterial` em `core`), não uma mudança na função compartilhada. Conferido: `COLUNAS_DO_DETALHE` (`linha.ts:20–23`) já traz `customer_phone`, e `queueSince` já está em `core/orders/row.ts` — nenhuma coluna nova | **n — confirmar** |
| **TQ7 / A23** | O voltar do Android **fecha a folha sem sair do pedido**: a entrada de histórico vai só no `state`, nada na URL; F5 com o marcador faz `replace` sem ele. `pedidosHref.ts` continua o único dono do endereço (`MAP-04`). Prova: T20 (roteador real, histórico montado pelo teste) e T31 (navegador); Android real pendente (TQ10) | **n — confirmar** |
| **TQ8 / A24** | O dono confirma o efeito por `.select('id')`, e **zero linhas viram "Nenhum pedido foi alterado." também no painel** — a única mudança de comportamento do painel, **declarada contra a letra do `AD-056`** ("painel sem mudança"). Conferido: `useAdminOrders.ts:124` e `:166` não têm `.select` hoje, então zero linhas passa como sucesso, grava histórico e dispara aviso | **n — confirmar** (obrigatória) |
| **TQ9 / Q7** | A confirmação some em **5 s**; uma nova substitui a anterior e **reinicia** o prazo; não rouba o foco (`role="status"`). A falha não some sozinha (`role="alert"`, fica até a próxima ação, `MAA-35`). Prova na T21 com relógio falso | **n — confirmar** |
| **TQ10** | A prova em **Android real** (teclado virtual e voltar) fica **pendente do usuário**, declarada em `prova-navegador.md`, no `STATE.md` e no handoff. A T31 emula o teclado (`visualViewport` reduzido pelo CDP) e o voltar (`history.back()`). O merge vai só para `feature/mobile-adm` (`AD-056`); a pendência pode ser fechada antes da promoção para a `master` | **n — confirmar** |

**Observação (sem ação)**: "Recebi o material" usa a RPC **`set_material_status`**
(`22-material-afetivo.sql:136`), como as T10/T11 já dizem. `set_material_tracking` (`:206`) é o
rastreio da **remessa da cliente** e **não** entra nesta feature — qualquer texto que diga o contrário
está errado.

---

## Test Coverage Matrix

> Gerado do código, do `CLAUDE.md` raiz (*Baselines*, *Os guardas*, *Mobile é o caso principal*,
> *O defeito 01*, *`strictNullChecks` false*), de `apps/mobile-adm/CLAUDE.md`,
> `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, dos `vitest.config.ts` dos workspaces e do
> `tasks.md` da `74` (molde). Lições aplicadas como cautela (nenhuma *confirmed*): `L-030`, `L-033`,
> `L-034`, `L-050`, `L-052`, `L-053`, `L-055`, `L-057`, `L-060`, `L-063`; memórias "dublê que não
> enxerga", "teste não monta a árvore que prova", "asserção subsumida pela vizinha", "amostra que
> filtra o defeito para fora", "mutante que morre por compilação".

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Regra pura de `core/orders` (`appAction`, `tracking`, `charge`) | unit | todo ramo; 1:1 com as ACs; a tabela de §5.1 e a de A11 **uma linha por caso**; frases **por extenso** no teste (nunca lidas da constante que provam); a mensagem do lembrete byte a byte a do painel, lida do disco do painel **antes** de movê-la; especificador relativo com `.ts` | `packages/core/src/orders/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Dono da escrita (`core/order-actions`) | unit com dublê que **registra a cadeia inteira** (valores de `update`, cada `eq`/`in`, `select`, `insert`, `rpc`, `notify`) | cada desfecho (`ok`, `nenhuma-linha`, `falhou` nas três formas `{error}`/lançada/rejeitada, `sem-papel`, `material-recusado`, `parcial`); **um caso por passo que falha provando que o seguinte não roda** (`L-050`); ausência de chave por `not.toHaveProperty`; pureza do módulo | `packages/core/src/order-actions/__tests__/*.test.ts` | idem |
| Delegação do painel | unit (`vi.mock('@estrelinha/core/order-actions')`) + a suíte existente **sem asserção tocada** | a tabela de tradução de §3.3, uma linha por caso; `toBe` para `chargeMaterial*`; `git diff` dos testes antigos só no dublê | `apps/backoffice/src/**` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Porta, estado em módulo e hooks do app | unit (`renderHook` + `fakeSupabase` registrador) | recusa × mudou × falhou; trava no **mesmo tique**; releitura provada por `isInvalidated` das três chaves **e** da vizinha; re-entrada (`L-057`) | `apps/mobile-adm/src/features/order-actions/**/__tests__`, `shared/lib/__tests__` | `pnpm --filter @estrelinha/mobile-adm test` |
| UI do app | componente pela árvore **real** (`montarApp` / `<App />`) | caminho feliz + cada edge case + exclusividade dos estados (`L-063`) + `role` + alvo 44 por **token exato** + `motion-reduce:` | `apps/mobile-adm/src/pages/__tests__/acoesDoPedido.test.tsx` e `__tests__` de cada slice | idem |
| Contrato com o client real | integração (`clientReal.ts`, `fetch` falso) | PATCH `[]` + `atelie_clock` 403 ⇒ recusa e **nenhuma** confirmação; RPC `not_admin` ⇒ recusa; PATCH 500 ⇒ falha, nunca recusa | `apps/mobile-adm/src/app/__tests__/acoesComClientReal.test.tsx` | idem |
| Guardas de fonte (loja, app, core) | guarda (AST onde a régua é de uso) | âncora dupla; uma régua por comando (`L-033`); sensores CRLF/LF/glob de dois asteriscos/forma quebrada/tabela em variável; inverso | `apps/store/src/shared/lib/__tests__`, `apps/mobile-adm/src/**/__tests__`, `packages/core/src/order-actions/__tests__` | o workspace do guarda |
| Semântica contra o banco (paridade app × painel, conta sem papel) | probe (supabase-js real contra o banco local) | Success Criteria 1 e 2 | `.specs/features/75-mobile-adm-acoes-do-pedido/probes/` | `pnpm tsx` / `sh` do probe, banco em 54441/54442 |
| Layout 360/390/412, fonte 130/200 %, teclado virtual, voltar do Android, menos movimento | navegador real | **não alcançável por jsdom** | `prova-navegador.md` | Playwright no build servido |
| `package.json`/`exports`/tipos | build | `tsc` com os 11 herdados de `core`, zero novos | — | `npx tsc --noEmit -p packages/core/tsconfig.json` |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task só de `core` ou só do app, sem arquivo novo fora do workspace | o workspace tocado: `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (**sem o `--`**), exit code fora de pipe |
| Full | **toda task que cria ou move arquivo em `apps/**` ou `packages/**`**, e toda task que toca o painel (os guardas da loja varrem os apps e `packages/`: `pedidoComDonoUnico`, `marcacaoSoPorAcao`, `notificationSingleOwner`, `numeroDoPedidoComDonoUnico`, `situacaoComDonoUnico`, `brandScan`, `fusoComDonoUnico`, `originZipNotRead`…) | core + mobile-adm + **store** + backoffice, **um por vez**, mesmo comando, exit code fora de pipe |
| Build | fim de fase (e a T30) | Full + `npx tsc --noEmit -p` em `apps/{mobile-adm,store,backoffice}/tsconfig.app.json`, `apps/mobile-adm/tsconfig.node.json`, `apps/store/tsconfig.server.json` e `packages/core/tsconfig.json` (11 herdados, nenhum novo) + `npx eslint .` em mobile-adm, backoffice e store (sem regressão contra a T01) + `pnpm --filter @estrelinha/mobile-adm build` + `pnpm --filter @estrelinha/backoffice build` |

Baseline: **medida na T01 com a árvore parada** (a linha do `CLAUDE.md` raiz é 15819/792 depois do
QA da `74`; a entrada real é a do disco no `2a285bab`).

---

## Execution Plan

```
Fase 1 (entrada e regras puras):        T01 → T02 → T03 → T04 → T05 → T06
Fase 2 (o dono da escrita e o painel):  T07 → T08 → T09 → T10 → T11 → T12 → T13
Fase 3 (porta e estado do app):         T14 → T15 → T16 → T17 → T18 → T19 → T20
Fase 4 (a tela):                        T21 → T22 → T23 → T24 → T25 → T26 → T27
Fase 5 (o fecho):                       T28 → T29 → T30 → T31
                                        → Verificador independente (sempre) → QA (qa-report + qa-execution)
                                        → bugs ⇒ tasks Bxx (teste antes do conserto) → reteste → Verificador de novo
```

**Lotes sequenciais para sub-agentes** (fases inteiras, ~7 tasks; um lote só começa quando o anterior
reporta tudo feito):

| Lote | Fases | Tasks | Fronteira |
| --- | --- | --- | --- |
| **1 — fundação pura em `core`** | Fase 1 | T01–T06 | nenhum I/O; o painel só ganha a reexportação do lembrete |
| **2 — o dono da escrita** | Fase 2 | T07–T13 | `core/order-actions` + a delegação do painel + o guarda de `AD-059`; fecha com o painel verde sem asserção tocada |
| **3 — o app por baixo da tela** | Fase 3 | T14–T20 | arnês, porta, estado em módulo e hooks; nenhum componente visível |
| **4 — a tela** | Fase 4 | T21–T27 | componentes, fiação nas páginas e os guardas de UI |
| **5 — fecho e prova** | Fase 5 | T28–T31 | client real, probe contra o banco, gates/documentação e navegador |

**T23 divisível (TQ1)**: se o executor do Lote 4 passar do orçamento de contexto, a T23 vira **T23a**
(caminhos felizes e rótulos: `MAA-01`, `02`, `05`, `06`, `07`, `13`, `15`, `16`, `38`) e **T23b**
(falha, recusa, zero linhas, exclusividade, sem conexão e Realtime: `MAA-03`, `04`, `09`, `20`..`26`,
`35`, `40`, `41`), no **mesmo** arquivo de teste e com o **mesmo** *Done when* somado. Dividir, nunca
cortar a régua.

Depois do Lote 5: o **Verificador** (autor ≠ verificador, sensor de mutação, `validation.md`), depois o
QA (`qa-report` para planejar o ciclo em `docs/qa/`, `qa-execution` para andar). **O ciclo de QA anda
toda tela tocada em 360, 390 e 412 de largura, e com a fonte do sistema a 100, 130 e 200 %** (regra do
fecho do QA da `73` no `CLAUDE.md` raiz) — não só a 100 %. Todo bug vira uma
task `Bxx` no fim deste arquivo (molde do "Conserto do QA" da `74`), com teste que reprova antes do
conserto, e o Verificador roda de novo sobre o conserto (laço limitado a 3 rodadas antes de escalar).

---

## Tasks

### Fase 1 — entrada e as regras puras em `core`

### T01 — `01-baseline-e-medicao`
- **What**: medir as seis suítes com a árvore parada (contagem, arquivos, exit code), `tsc` dos seis
  projetos de app + `packages/core` (11 herdados), lint dos três apps; ler do disco, **antes de mover**,
  o texto atual de `chargeMaterialText`/`chargeMaterialUrl` do painel e as sequências de
  `updateStatus`/`addTrackingCode`/`setMaterialStatus` (as linhas citadas em §2.2), e o `git diff`
  vazio de `useAdminOrders.test.ts` como ponto de comparação de `MAA-27`; no banco local, quantos
  pedidos existem por `appPrimaryAction` provável (status × material × retirada), para a T29 saber
  que fixturas criar; conferir que `send-notification` responde no edge runtime local (`401` sem auth
  = vivo, R7) e registrar o caminho montado pelo container do edge runtime (`docker inspect`,
  `Mounts`). Reinício só nas condições de **TQ3** (503 citando arquivo que existe no disco;
  `supabase stop` sem `--all` e sem `--no-backup`; aviso de que derruba a instância das outras
  sessões; reiniciar logo).
- **Where**: `.specs/features/75-mobile-adm-acoes-do-pedido/baseline.md`
- **Depends on**: —
- **Done when**: `baseline.md` com os seis números e exit codes (um workspace por vez, fora de pipe),
  tipos e lint; o SHA-256 de `useAdminOrders.test.ts`, `notifyOrder.test.ts`, `orderList.test.ts` e
  `regrasDoPedidoNoCore.test.ts` registrados (a T12 e a T30 os comparam); a contagem por estado no
  banco; o estado do edge runtime **e o caminho montado** (`Mounts`), e, se houve reinício, o motivo
  (o arquivo citado no 503) e de qual diretório o `supabase start` saiu; o que o painel grava hoje em
  `shipping_carrier` com o campo vazio (`AdminOrderPage.tsx:109` passa `carrier.trim()`, ou seja,
  **string vazia**) e de onde vem o `from` de `updateStatus` (`orders.find(o => o.id === id)?.status`,
  o cache da lista) — as duas linhas citadas; divergência contra o `CLAUDE.md` raiz **declarada**, não
  corrigida em silêncio.
- **Reqs**: — (gate de "sem regressão"; base de `MAA-27`).
- **Status**: ✅ **Feita** (2026-10-24). `baseline.md` com as seis suítes (15819/792, exit 0 nas seis,
  um workspace por vez, fora de pipe), tipos (0 nos seis projetos de app; 11 herdados em `core`, linha a
  linha), lint (25/7), os SHA-256 de `useAdminOrders.test.ts`, `notifyOrder.test.ts`,
  `orderList.test.ts`, `regrasDoPedidoNoCore.test.ts`, `chargeMaterial.ts` e `useAdminOrders.ts`, o
  texto do lembrete e as sequências do painel lidos antes de mover, a contagem por estado no banco
  local (54 pedidos) e o `shipping_carrier` vazio = `''`. **Divergência declarada**: o edge runtime
  local **não existe** (503 `name resolution failed` do Kong, sem container) — sem `Mounts` a registrar
  e **sem reinício** (a condição (2) da TQ3 não se cumpre). Fica para quem orquestra decidir antes da
  T29.

### T02 — `02-codigo-de-rastreio-em-core`
- **What**: `normalizeTrackingCode`, `trackingCodeRefusal` e `TRACKING_CODE_MIN_LENGTH = 8` em
  `core/orders/tracking.ts` (o arquivo continua sem import), exportados pelo barril de `orders`.
- **Where**: `packages/core/src/orders/{tracking,index}.ts`, `orders/__tests__/tracking.test.ts` (+)
- **Depends on**: T01
- **Reuses**: `parcelTrackingUrl` (mesmo arquivo, já faz `trim().toUpperCase()`)
- **Done when**: `normalizeTrackingCode` apara, tira espaços **internos** e põe em maiúsculas (casos:
  `" an 123 456 789 br "` ⇒ `AN123456789BR`, tab/quebra de linha); `trackingCodeRefusal` devolve
  `"Confira o código — ele costuma ter 13 caracteres."` (escrita **por extenso** no teste) com 7
  caracteres **depois** de normalizar e `null` com 8, e `null` para um código Jadlog/Loggi sem o
  formato dos Correios (prova de "sem formato imposto", A8); vazio ⇒ a frase; `purity.test.ts` de
  `orders` verde; Quick gate (core).
- **Reqs**: `MAA-12` (regra), A8 (`n — confirmar`, TQ4).
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). +10 casos em `orders/__tests__/tracking.test.ts` (4 → 14),
  escritos antes e vistos **vermelhos** (10 reprovando) antes do código; frase por extenso; 7 ⇒ frase,
  8 ⇒ `null`, contagem **depois** de normalizar (`' ab 12 345 '`); Jadlog/Loggi/Melhor Envio ⇒ `null`;
  vazio/nulo ⇒ frase. `tracking.ts` continua sem import. `purity` verde. Mutantes do autor M01–M03
  (off-by-one, `trim` no lugar do recorte interno, sem maiúsculas): **3 mortos por asserção**.

### T03 — `03-lembrete-do-material-sobe-para-core`
- **What**: `core/orders/charge.ts` com `chargeMaterialText`, `chargeMaterialUrl` e
  `ChargeMaterialInput` (entrada estrutural), **byte a byte** o arquivo do painel; o
  `features/order-list/model/chargeMaterial.ts` do painel passa a reexportar de
  `@estrelinha/core/orders` (mantendo `whatsappNumber`); guarda de referência novo no painel.
- **Where**: `packages/core/src/orders/{charge,index}.ts`, `orders/__tests__/charge.test.ts`;
  `apps/backoffice/src/features/order-list/model/chargeMaterial.ts`,
  `apps/backoffice/src/app/__tests__/lembreteNoCore.test.ts`
- **Depends on**: T02
- **Reuses**: `material/material.ts`, `material/aging.ts`, `notifications/phone.ts`, `./format.ts`,
  `./row.ts` (relativos com `.ts`)
- **Done when**: `charge.test.ts` com os textos **escritos por extenso** (copiados do disco do painel
  na T01) para `aguardando_material` fresco × atrasado, `material_enviado` ("Vi que você já
  postou…"), nome vazio, e o `wa.me` **sem número** quando não há telefone; a idade calculada contra
  um `now` injetado; nenhum material nomeado (`BL-015`) e nenhuma palavra de urgência (régua sobre o
  texto produzido); `lembreteNoCore.test.ts` prova `toBe` das duas funções e tem o sensor (uma cópia de
  valor igual reprova); `orderList.test.ts` do painel **intocado** (SHA-256 igual ao da T01) e verde;
  `purity.test.ts` de `orders` verde (âncora ≥ 16); Full gate.
- **Reqs**: `MAA-18` (URL), `MAA-19`, `MAA-28`, A18.
- **Tests**: unit + guarda `toBe` · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `core/orders/charge.ts` com `ChargeMaterialInput`; o corpo das
  duas funções é **idêntico** ao do painel (conferido por `diff` das funções, só o tipo de entrada
  muda); `charge.test.ts` (+22) com os três textos por extenso (fresco, `stale` por `now` injetado,
  `material_enviado`), `queueSince` pelo recebimento, nome vazio/espaço/nulo ⇒ "Oi, Oi!" (o texto do
  painel, sem conserto de passagem), régua de material por `MATERIAL_KIND_LABELS` (com sensor) e de
  urgência por `URGENCY_TERMS`, e a URL com e sem número. O `chargeMaterial.ts` do painel virou
  reexportação (mantém `whatsappNumber`); `app/__tests__/lembreteNoCore.test.ts` (+8) prova `toBe` nos
  seis caminhos, com o sensor de uma cópia de valor igual reprovando. `orderList.test.ts` **intocado**
  (SHA-256 `0290000d…`, igual ao da T01) e verde. `purity` com âncora ≥ 17 (`charge.ts` na lista).
  Mutantes M04–M07 (degrau `warm`, idade desde a compra, URL sem número, wrapper no lugar do
  reexport): **4 mortos por asserção**. Full gate medido junto com o Build da T06 (abaixo).

### T04 — `04-acao-do-app-em-core`
- **What**: `core/orders/appAction.ts` com `AppActionId`, `AppActionInput`, `AppActionPlan`,
  `AppAction` e `appPrimaryAction(row)` (ordem de A14: cancelado/entregue ⇒ `nenhuma`; retirada em
  `separating` ⇒ `marcar-retirado` com `nextStep(row).actionLabel ?? PICKUP_DONE_ACTION`; senão
  `rowSummary`, com `anotar-rastreio-envelope` ⇒ `nenhuma`).
- **Where**: `packages/core/src/orders/{appAction,index}.ts`, `orders/__tests__/appAction.test.ts`
- **Depends on**: T03
- **Reuses**: `rowSummary`, `nextStep`, `PICKUP_DONE_ACTION`, `isPickupOrder` (**intocados**)
- **Done when**: a tabela de §5.1 **linha a linha** (um caso por linha, rótulo por extenso): cancelado
  **com** material aguardando ⇒ `nenhuma`; entregue ⇒ `nenhuma`; aguardando/enviado com pagamento
  pendente ⇒ `registrar-recebimento` (A15); `shipped` sem código ⇒ `salvar-rastreio`; `shipped` com
  código e `pending` ⇒ `nenhuma`; `paid` com e sem `material_recebido` ⇒ `separar` e o
  `materialAntes` certo; `separating` retirada ⇒ "Marcar como retirado" e `plano.to = 'delivered'`;
  `separating` não retirada ⇒ `marcar-enviado`; o plano discrimina por `tipo` **string** (R9);
  `rowSummary.ts` e `nextStep.ts` com `git diff` vazio; R10 pinado (o texto do rótulo da retirada);
  Quick gate.
- **Reqs**: `MAA-01`, `MAA-06`, `MAA-16` (rodapé), `MAA-38` (regra), A14, A14b, A15, A16.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `appAction.ts` + 16 casos em `appAction.test.ts`, um por
  linha de §5.1, rótulos por extenso (R10: "Marcar como retirado"), vistos vermelhos antes do código.
  `rowSummary.ts` e `nextStep.ts` com `git diff` vazio. **Divergência resolvida pela opção
  conservadora**: §5.1 diz "`shipped` sem código, **não retirada**" e não diz o que a retirada levada a
  `shipped` à mão recebe; o `rowSummary` sozinho diria "Salvar rastreio". Como `MAA-16` proíbe rastreio
  na retirada em **qualquer** status, `appPrimaryAction` devolve `nenhuma` aí (caso próprio). Mutantes
  M08–M10 (cancelado sem corte, retirada com folha, `materialAntes` alargado): **3 mortos por
  asserção**.

### T05 — `05-folha-entrega-e-lembrete-em-core`
- **What**: no mesmo `appAction.ts`: `TrackingSheet`, `trackingSheet(row, origem)`, `trackingEdit(row)`
  e `canChargeMaterial(row)`.
- **Where**: `packages/core/src/orders/appAction.ts`, `orders/__tests__/appAction.test.ts`
- **Depends on**: T04
- **Done when**: `trackingSheet` nos **cinco** casos — `separating` (modo `enviar`, título "Marcar como
  enviado", frase 1, `guarda = ['separating','shipped']`, `avancaPara = 'shipped'`,
  `citaEmailSeEnviado = true`), `shipped` sem código (`salvar`, frase 1, `['shipped']`, `true`),
  `shipped` com código (`alterar`, frase 2, `false`), `delivered` sem código ("Salvar rastreio", frase
  3, `['delivered']`, `false`) e `delivered` com código ("Alterar rastreio", frase 3, `false`) —, as
  três frases de A10 **por extenso**; `valorInicial` = o código em `alterar` **e** em `enviar` com
  código, `''` em `enviar` sem código e em `salvar` (Q9-b); retirada ⇒ `null` em **todo** status;
  `pending`/`paid`/`cancelled` ⇒ `null`; `trackingEdit` ⇒ "Informar"/"Alterar" só em
  `shipped`/`delivered` não retirada; `canChargeMaterial` verdadeiro só com `aguardando_material` **e**
  não cancelado **e** telefone que normaliza — com o par de cada condição falsa (sem número, número
  inválido, `material_enviado`, cancelado); Quick gate.
- **Reqs**: `MAA-10`, `MAA-11`, `MAA-14` (guarda e `citaEmail`), `MAA-15` (b, `valorInicial`),
  `MAA-16`, `MAA-17` (regra), A10, A17 (`n — confirmar`, TQ6), A23 (`n — confirmar`, TQ7), A25.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). +28 casos: os cinco casos de `trackingSheet` com o objeto
  inteiro por igualdade (frases de A10 por extenso, `guarda`, `avancaPara`, `citaEmailSeEnviado`,
  `valorInicial` — inclusive `enviar` já com código, Q9-b), retirada ⇒ `null` em todo status e nas duas
  origens, `pending`/`paid`/`cancelled` ⇒ `null`, `trackingEdit`, e `canChargeMaterial` com o par de
  cada condição falsa. **Divergência resolvida pela opção conservadora — o papel de `origem`**: o design
  dá a assinatura `trackingSheet(row, origem)` sem dizer o que a origem muda. Ficou: a folha só existe se
  a origem a **oferece** naquele estado — `'acao'` quando `appPrimaryAction` é de folha (`separating`,
  `shipped` sem código), `'entrega'` quando `trackingEdit` não é `null` (`shipped`/`delivered`). É o que
  dá sentido a `MAA-26` (§3.8: a folha fecha quando `trackingSheet(row, origem)` vira `null` ou muda de
  `modo`) e não muda nenhum dos cinco casos da task. Mutantes M11–M15, M19, M21 (`citaEmail` sempre,
  guarda sem `shipped`, `valorInicial` vazio em `enviar`, cancelado no lembrete, telefone ignorado,
  origem ignorada, frase de troca em `delivered`): **7 mortos por asserção**.

### T06 — `06-confirmacao-e-frases-em-core`
- **What**: `actionConfirmation(input)` e as frases fixas `ACTION_FAILED`, `ORDER_CHANGED`,
  `PARTIAL_MATERIAL`, `PARTIAL_TRACKING`, `SAVING` em `appAction.ts`.
- **Where**: `packages/core/src/orders/appAction.ts`, `orders/__tests__/appAction.test.ts`
- **Depends on**: T05
- **Reuses**: `formatOrderNumber`
- **Done when**: **uma linha de A11 por caso**, com título e frase por extenso: recebi com
  `emailSent` verdadeiro e falso; o idempotente (`MAA-05`, `emailSent` falso) sem e-mail; separar com
  material e `sent` ⇒ "Pedido #0251 em produção." com e-mail; separar **sem** material com
  `sent === true` ⇒ "em separação." **sem** e-mail; rastreio de `separating` e de `shipped` sem código
  com e sem `sent`; "Alterar" de `shipped` com `sent === true` ⇒ sem e-mail; **`delivered` sem código
  com `sent === true` ⇒ "Rastreio salvo." + "O código ficou no pedido."** (`MAA-14`); retirada
  ⇒ "Retirada registrada." + "Pedido #0251 entregue."; `customer_name` vazio ⇒ "A cliente recebe…";
  só o primeiro nome; as cinco constantes iguais às frases da spec escritas por extenso; nenhuma frase
  com exclamação ou urgência (régua); `purity.test.ts` de `orders` verde; Full gate (fecho da fase:
  Build gate).
- **Reqs**: `MAA-02` (frase), `MAA-05`, `MAA-14` (frase), `MAA-24` (frase), `MAA-38` (frase), A11 (`n — confirmar`, TQ5), A12.
- **Tests**: unit · **Gate**: build
- **Status**: ✅ **Feita** (2026-10-24). `actionConfirmation` + as cinco frases fixas, exportados pelo
  barril de `orders`; +20 casos em `appAction.test.ts` (64 no arquivo): uma linha de A11 por caso, o
  `citaEmailSeEnviado` lido da **folha real** de cada estado (não escrito à mão), `delivered` sem código
  com `emailSent: true` ⇒ "O código ficou no pedido." (`MAA-14`), o idempotente de `MAA-05` sem e-mail
  mesmo com `emailSent` verdadeiro (`materialJaEstava`), separar sem material com `sent` ⇒ "em
  separação." sem e-mail, nome vazio ⇒ "A cliente recebe…", só o primeiro nome; as cinco constantes por
  extenso; régua de exclamação e urgência sobre as 28 frases (âncora) com sensor. `purity` com âncora
  ≥ 18 (`appAction.ts`). **Duas divergências, registradas**: (1) a entrada de §5.3 traz `modo?`, que
  **não basta** — `salvar` é o mesmo modo em `shipped` sem código (cita) e em `delivered` sem código
  (nunca cita) —, então a entrada recebe `citaEmailSeEnviado?` da folha, e a ausência vale **não
  citar**; (2) **spec-precision gap**: A11 não escreve a frase do e-mail de "Iniciar separação" com o
  material; ficou "Pedido #0251 em produção. Juliana recebe o aviso por e-mail." (molde de "Recebi"),
  marcada `SPEC_DEVIATION` no código e sujeita à leitura da Adri (TQ5). Mutantes M16–M18, M20 (sem o
  corte do idempotente, rastreio citando sem a folha, "Oi" no lugar de "A cliente", separar ignorando o
  material): **4 mortos por asserção**.
- **Gate da Fase 1 (Build, 2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000`
  sem o `--`)**: core **4112/160** (exit 0; base 4016/158, **+96/+2**: tracking +10, charge +22,
  appAction +64), mobile-adm **811/61** (exit 0, igual), store **5852/319** (exit 0, igual), backoffice
  **3679/211** (exit 0; base 3671/210, **+8/+1**, `lembreteNoCore`). `tsc`: 0 em mobile-adm (app e
  node), store (app e server) e backoffice; `packages/core` **11**, os herdados (mesmos arquivos e
  contagens da T01), zero em `orders/**`. Lint: mobile-adm 0/0, backoffice 23/5, store 2/2 — sem
  regressão. `pnpm --filter @estrelinha/mobile-adm build` e `… backoffice build` exit 0.
  **Sensor do autor (Fase 1)**: 21 mutantes nos arquivos reais, alvo que não existe lança, SHA-256
  conferido na restauração: **21 mortos por asserção, 0 por compilação, 0 sobreviventes**
  (autor = verificador nesta passada; o Verificador independente vem depois do Lote 5).

### Fase 2 — o dono da escrita em `core` e o painel delegando

### T07 — `07-modulo-order-actions-e-notificador`
- **What**: o módulo `core/order-actions`: `peerDependencies` de `@supabase/supabase-js` (`^2.103.0`)
  em `packages/core/package.json` + `pnpm install` (o diff do lock **só** no importer `packages/core`);
  o subpath `"./order-actions"` no `exports`; `types.ts` (§4); `notify.ts`
  (`triggerOrderNotification`, o corpo do `notifyOrder` de hoje com o client recebido, nunca lança);
  `index.ts`; o guarda de pureza do módulo.
- **Where**: `packages/core/package.json`, `pnpm-lock.yaml`,
  `packages/core/src/order-actions/{types,notify,index}.ts`,
  `order-actions/__tests__/{notify,purity}.test.ts`
- **Depends on**: T06
- **Reuses**: `apps/backoffice/src/entities/order/api/notifyOrder.ts:24–33` (texto), `core/hooks` (lugar)
- **Done when**: `notify.test.ts` com dublê de `functions.invoke` registrador: o caminho, o corpo
  (`order_id`, `trigger`) e `action=trigger` iguais aos do painel; `true` só quando a resposta diz que
  saiu; `{ error }`, exceção síncrona e promessa rejeitada ⇒ `false` sem lançar (`MAA-24`);
  `purity.test.ts` recusa React, `@estrelinha/*`, alias, relativo sem `.ts`, e aceita
  `@supabase/supabase-js` **só** em `import type` — com sensor de `import { createClient }` acusado e
  âncora ≥ 3 arquivos (sobe para ≥ 7 na T11); `npx tsc --noEmit -p packages/core/tsconfig.json` com
  **os mesmos 11 erros herdados, linha a linha**, e zero em `order-actions/**`; Full gate.
- **Reqs**: `MAA-24` (notificador), `MAA-27` (base), `AD-059`.
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `peerDependencies` + subpath `./order-actions`; `pnpm install`
  queria também subir `browserslist` num snapshot alheio (4.28.6 → 4.29.3) — **revertido à mão** e
  reinstalado com `--frozen-lockfile`: o diff do `pnpm-lock.yaml` é **só** o importer `packages/core`
  (+4 linhas; o pnpm registra o peer como `dependencies` do importer, `auto-install-peers`).
  `types.ts`, `notify.ts`, `index.ts`; `notify.test.ts` (9: caminho/corpo por extenso, `true` só com
  `sent === true`, `{ error }`/síncrona/rejeitada ⇒ `false`) e `purity.test.ts` (7: lê
  especificadores sem comentário, aceita supabase-js **só** em `import type`, sensor de
  `import { createClient }` acusado e o inverso, âncora ≥ 7 arquivos — já na forma final da T11),
  vistos vermelhos antes do código. `tsc` de `packages/core`: **os mesmos 11, linha a linha** (`diff`
  vazio), zero em `order-actions/**`. Mutantes M28 (`sent !== false`), M40 (`createClient` de valor em
  `types.ts`): **mortos por asserção**. Full gate medido no fecho da fase (abaixo).

### T08 — `08-escrita-do-status`
- **What**: `order-actions/status.ts` → `writeOrderStatus({ client, notify }, { id, to, from,
  expectedFrom?, note?, avisar? = true })`.
- **Where**: `packages/core/src/order-actions/{status,index}.ts`, `order-actions/__tests__/status.test.ts`
- **Depends on**: T07
- **Done when**: com dublê que registra a cadeia: `update({ status: to }).eq('id', id).select('id')`
  sem `expectedFrom`, e com `.eq('status', expectedFrom)` quando passado (os dois casos, a cadeia
  comparada **por igualdade**, `L-060`); `error` ⇒ `falhou`, sem histórico e sem `notify`; `[]` ⇒
  `nenhuma-linha`, **sem** histórico e **sem** `notify` (A22); uma linha ⇒ `insert` em
  `order_status_history` com `from_status = expectedFrom ?? from ?? null`, `to_status`, `note`, e
  **um** `notify(id, 'order_status_changed')`; `from: undefined` sem `expectedFrom` ⇒
  `from_status: null` (caso próprio: é o pedido fora da lista carregada do painel, comportamento de
  hoje); `avisar: false` ⇒ zero `notify`; `insert` do histórico
  com erro **não** muda o desfecho (paridade, Q8/R6, caso próprio); exceção síncrona e rejeição do
  client ⇒ `falhou`; Quick gate (core).
- **Reqs**: `MAA-08`, `MAA-21` (zero linhas), `MAA-22` (falhou), `MAA-38` (escrita), A3, A4, A22, A24.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `status.ts` + `status.test.ts` (15) sobre o dublê registrador
  `__tests__/dubleDoClient.ts` (cadeia inteira por igualdade e um `log` global da ordem). As duas
  cadeias por igualdade; `[]` e `data` nulo ⇒ `nenhuma-linha` sem histórico e sem aviso; `{ error }`,
  síncrona e rejeitada ⇒ `falhou`; `from: undefined` ⇒ `from_status: null`; `expectedFrom` vence
  `from`; `avisar: false`; histórico com `{ error }` **e** rejeitado não mudam o desfecho.
  **Divergência registrada (conservadora)**: (1) o histórico **rejeitado** também é engolido — o painel
  hoje propagaria a rejeição depois de o status já ter mudado; o design diz "resultado ignorado".
  (2) o aviso fica **fora** do `try`: `useAdminOrders.test.ts` ("e-mail que REJEITA…") prende que uma
  notificadora que quebra o contrato **propaga** — engolir mudaria uma asserção do painel. Mutantes
  M22 (sem a guarda), M23 (zero linhas como sucesso), M24 (`from` vencendo `expectedFrom`): **mortos
  por asserção**.

### T09 — `09-escrita-do-rastreio`
- **What**: `order-actions/tracking.ts` → `writeTrackingCode(deps, { id, code, carrier?, statusIn?,
  avisar? = true })`.
- **Where**: `packages/core/src/order-actions/{tracking,index}.ts`,
  `order-actions/__tests__/tracking.test.ts`
- **Depends on**: T08
- **Done when**: o objeto do `update` **sem** a chave `shipping_carrier` quando `carrier` é
  `undefined` (`not.toHaveProperty`, A9) e com ela quando passada **exatamente como recebida** —
  inclusive a **string vazia `''`**, que é o que o painel manda com o campo vazio
  (`AdminOrderPage.tsx:109` chama `addTrackingCode(order.id, tracking.trim(), carrier.trim())`, e
  `useAdminOrders.ts:166` grava o valor como recebido): o caso pina `shipping_carrier: ''` (nunca
  convertido em `null`); `null` só chega ao `update` se o chamador o passar (caso próprio);
  **o dono não normaliza nem valida o código** (A8 vale só no app): um código em minúsculas e com
  espaço interno (`' an 123 br '`) chega ao `update` **byte a byte** como passado, e um código de 3
  caracteres é gravado sem recusa — sem isso, um normalizador posto "por segurança" no dono mudaria o
  que o painel grava com a suíte verde; `statusIn` ⇒ `.in('status', statusIn)`
  e ausente ⇒ nenhum `.in` (cadeia por igualdade); `.select('id')` sempre; zero linhas ⇒
  `nenhuma-linha` sem aviso; sem histórico em nenhum caso; `avisar` decide o aviso; as três formas de
  falha; Quick gate.
- **Reqs**: `MAA-13` (passo 1), `MAA-14` (escrita), `MAA-21`, A9, A25.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `tracking.ts` + `tracking.test.ts` (15): `carrier` ausente ⇒
  `not.toHaveProperty('shipping_carrier')`, `''` vai `''`, `null` só se passado; `' an 123 br '` e
  `'NA1'` chegam byte a byte (o dono não normaliza nem valida); `.in` só com `statusIn`, `.select('id')`
  sempre (cadeias por igualdade); sem histórico; zero linhas, as três falhas e `avisar`. Mutantes M25
  (transportadora sempre), M26 (normalizador "por segurança"): **mortos por asserção**.

### T10 — `10-escrita-do-material`
- **What**: `order-actions/material.ts` → `writeMaterialStatus(deps, { id, to, avisar? = true })`.
- **Where**: `packages/core/src/order-actions/{material,index}.ts`,
  `order-actions/__tests__/material.test.ts`
- **Depends on**: T09
- **Done when**: `rpc('set_material_status', { p_order_id, p_status })` **uma** vez; `{ ok: true,
  status }` ⇒ **um** `notify(id, 'material_status_changed')` e `{ tipo: 'ok', status, emailSent }`;
  `reason: 'not_admin'` ⇒ `sem-papel` e zero `notify`; `invalid_transition` e `order_not_found` ⇒
  `material-recusado` com `reason` e `status` devolvidos e zero `notify`; `ok: false` sem `reason` ⇒
  `reason: null` (o painel traduz); `{ error }`, exceção e rejeição ⇒ `falhou`; `avisar: false` ⇒ zero
  `notify`; Quick gate.
- **Reqs**: `MAA-02`, `MAA-03`, `MAA-04` (dono), `MAA-05` (o `ok` idempotente), A1, A3.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `material.ts` + `material.test.ts` (14): RPC uma vez e zero
  cadeias de tabela; `ok` ⇒ um `material_status_changed` e o status devolvido; o idempotente com
  `emailSent: false`; `not_admin` ⇒ `sem-papel`; `invalid_transition`/`order_not_found` ⇒
  `material-recusado` com motivo e status; `ok: false` sem `reason` e `data` nulo ⇒ `reason: null`;
  as três falhas; `avisar: false`; e a notificadora que lança **propaga** (paridade com `MAT-09` do
  painel, ver T08). Mutantes M27 (sem o ramo `not_admin`), M41 (`ok === false` aceitando `data` nulo
  como sucesso): **mortos por asserção**.

### T11 — `11-acao-do-app-composta`
- **What**: `order-actions/appAction.ts` → `runAppAction(deps, row, pedido)` (§5.2), com
  `PedidoDaAcao` e `AppActionOutcome`.
- **Where**: `packages/core/src/order-actions/{appAction,index}.ts`,
  `order-actions/__tests__/appAction.test.ts`
- **Depends on**: T10
- **Reuses**: `appPrimaryAction`, `trackingSheet`, `normalizeTrackingCode` (T04–T05, T02)
- **Done when**, um caso por ramo e **um caso por passo que falha provando que o seguinte não roda**
  (`L-050`):
  - **recebi**: só `writeMaterialStatus('material_recebido')`; desfechos repassados;
  - **separar com material**: `em_producao` antes; qualquer desfecho não-`ok` do material (recusado,
    sem-papel, falhou) ⇒ **zero** `update` de status (`MAA-09`); status com
    `expectedFrom: 'paid'`; status `falhou` ou `[]` **depois** do material ⇒ `parcial` `etapa:
    'material'` com a causa (`MAA-40`); `materialMudou` verdadeiro;
  - **separar sem material**: só o status; `materialMudou` falso; e a **retentativa** de `MAA-40`
    (linha com material `em_producao` e status `paid`) grava só o status, zero RPC;
  - **rastreio de `separating`**: ordem `update tracking_code` (sem `shipping_carrier`, `avisar:
    false`, `.in('status', ['separating','shipped'])`) → `update status` (`.eq('status','separating')`)
    → histórico → **um** aviso no fim (contado: um só `notify` no caso inteiro); zero linhas no passo
    1 ⇒ `nenhuma-linha` e **nada** depois; falha/zero linhas no passo 2 ⇒ `parcial` `etapa:
    'rastreio'`; **o pulo**: código normalizado igual ao `tracking_code` **e** modo `enviar` ⇒ zero
    `update` de `tracking_code`, um de status (`MAA-15` a); em `alterar` e `salvar` o mesmo código
    **grava** (Q9);
  - **rastreio de `shipped`/`delivered`**: só o código, com a guarda do status, sem histórico, um
    aviso; nunca `update` de status;
  - **retirado**: `writeOrderStatus(expectedFrom 'separating', to 'delivered')`;
  - código que `trackingCodeRefusal` recusa ⇒ nenhuma chamada (defesa no dono da **ação do app**:
    a normalização e a recusa moram em `runAppAction`, **nunca** em `writeTrackingCode`, T09);
  - âncora do `purity.test.ts` do módulo sobe para ≥ 7; Full gate (fecho do módulo).
- **Reqs**: `MAA-02`, `MAA-07`, `MAA-08`, `MAA-09`, `MAA-13`, `MAA-14`, `MAA-15`, `MAA-38`, `MAA-40`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `appAction.ts` (`runAppAction`, `LinhaDaAcao = AppActionInput &
  { id }`) + `appAction.test.ts` (34), ordem provada pelo `log` do dublê: recebi (só a RPC; os três
  desfechos repassados, o recusado com `to`); separar com material (RPC → aviso do material → status
  com `.eq('status','paid')` → histórico → aviso do status; material recusado/sem papel/erro ⇒ zero
  cadeias; status `falhou`/`[]` depois ⇒ `parcial 'material'` com a causa, sem histórico); separar sem
  material e a retentativa de `MAA-40` (zero RPC); rastreio de `separating` (código normalizado, sem
  transportadora, `.in` da folha → status com guarda → histórico → **um** aviso); passo 1 com `[]`/erro
  ⇒ nada depois; passo 2 ⇒ `parcial 'rastreio'` sem aviso; o pulo só em `enviar`; `alterar` com o
  mesmo código grava; `shipped`/`delivered` só o código; retirado; código recusado, folha `null` e ação
  sem plano ⇒ **zero** idas à rede. `purity` com âncora ≥ 7. **Decisões registradas (conservadoras,
  o design não fixa)**: (1) `materialMudou` é verdadeiro **só** em "Iniciar separação" com o material
  (é o que `ConfirmationInput.materialMudou` documenta); em "Recebi" é falso — o idempotente o app
  decide por `materialJaEstava`; (2) o `emailSent` de separar com material é o do aviso **do material**
  (`in_production`), nunca o do status (`separating` não produz e-mail, `MAA-08`); (3) pedido sem plano
  (rastreio sem folha, código curto, primária `nenhum`/`folha`) ⇒ `falhou` com `Error` e **nenhuma**
  ida à rede — nunca `nenhuma-linha`, que afirmaria "o pedido mudou" sem perguntar ao banco; (4)
  `parcial` não dispara aviso (o par status + código não fechou). Mutantes M29 (pulo em qualquer modo),
  M30 (status depois de material recusado), M31 (aviso no passo 1), M32 (causa sempre `falhou`):
  **mortos por asserção**.

### T12 — `12-painel-delega-ao-dono`
- **What**: `useAdminOrders.ts`: `updateStatus`, `addTrackingCode` e `setMaterialStatus` delegam a
  `writeOrderStatus`/`writeTrackingCode`/`writeMaterialStatus` com `{ client: supabase, notify:
  notifyOrder }`, mantendo releituras e a forma de retorno (§3.3); `cancelOrder` intocado;
  `notifyOrder.ts` vira invólucro sobre `triggerOrderNotification` com o `supabase` de
  `@estrelinha/supabase` (R5), `resendNotification` intocado; o dublê de `useAdminOrders.test.ts` ganha
  `.select`.
- **Where**: `apps/backoffice/src/entities/order/api/{useAdminOrders,notifyOrder}.ts`,
  `useAdminOrders.test.ts` (só o dublê), `useAdminOrders.delega.test.ts` (novo)
- **Depends on**: T11
- **Done when**: `useAdminOrders.delega.test.ts` (o dono dublado por
  `vi.mock('@estrelinha/core/order-actions')`) com **uma linha da tabela de tradução de §3.3 por
  caso** — inclusive `nenhuma-linha` ⇒ `Error('Nenhum pedido foi alterado.')` (A24),
  `material-recusado` com `reason: null` ⇒ `'invalid_transition'`, `sem-papel` ⇒ `'not_admin'`,
  `falhou` ⇒ `'rpc_failed'` —, conferindo o `client` e o `notify` passados por identidade, que o
  painel **não** passa `expectedFrom` nem `statusIn` (G3), e que `addTrackingCode` passa `carrier`
  (com o campo vazio, `''` — nunca `null`); `updateStatus` passa como `from` **exatamente**
  `orders.find(o => o.id === id)?.status` (o cache da lista) e, com o pedido **fora** da lista
  carregada, `from: undefined` (caso próprio — o dono grava `from_status: null`, como hoje);
  `addTrackingCode` com um código em minúsculas e espaço interno chega ao dono **byte a byte** como a
  tela o passou (o painel não normaliza nem valida, A8); e
  as releituras de cada caminho (`fetchOrders`/`fetchStatusCounts` como hoje); a suíte do painel
  verde com **nenhuma asserção tocada**: `git diff` de `useAdminOrders.test.ts` só no dublê, e
  `notifyOrder.test.ts`, `orderList.test.ts`, `regrasDoPedidoNoCore.test.ts` com SHA-256 iguais aos da
  T01; a mudança benigna da exceção síncrona (§3.3) pinada num caso; Full gate.
- **Reqs**: `MAA-27`, A2, A8, A24 (`n — confirmar`, TQ8), G1, G3.
- **Tests**: unit (delegação) + a suíte existente · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `useAdminOrders.delega.test.ts` (17, visto vermelho 17/17 antes
  do código): `client` e `notify` por identidade (`toBe`), sem `expectedFrom`/`statusIn`, `from` do
  cache e `undefined` fora da lista, `carrier` `''`, código byte a byte, cada linha da tabela de §3.3
  (inclusive `nenhuma-linha` ⇒ `Error('Nenhum pedido foi alterado.')`, `reason: null` ⇒
  `invalid_transition`, `sem-papel` ⇒ `not_admin`, `falhou` ⇒ `rpc_failed`), as releituras contadas
  pelas leituras do dublê (status e material relêem lista **e** contagens; rastreio só a lista; falhas
  nada), e a mudança benigna da exceção síncrona pinada com o dono **real** (`vi.importActual`).
  `useAdminOrders.ts` delega (`falhaDaEscrita` traduz `falhou`/`nenhuma-linha`); `cancelOrder`
  intocado; `notifyOrder.ts` vira invólucro sobre `triggerOrderNotification(supabase, …)`,
  `resendNotification` intocado. `git diff` de `useAdminOrders.test.ts` **só no dublê** (o `.select`);
  SHA-256 de `notifyOrder.test.ts` (`924b1b64…`), `orderList.test.ts` (`0290000d…`) e
  `regrasDoPedidoNoCore.test.ts` (`78a32a2e…`) **iguais aos da T01**; suíte do painel verde sem
  asserção tocada. **Divergência**: o design (§3.3) escreve `from: currentOrder?.status ?? null`, a task
  pede `from: undefined` fora da lista — seguida a task (o dono grava `null` nos dois casos).
  Mutantes M33 (`nenhuma-linha` como sucesso), M34 (`?? 'rpc_failed'`), M35 (`expectedFrom` passado),
  M36 (rastreio relendo contagens), M37 (`?? null` no `from`): **mortos por asserção**. O lint pegou
  cinco `any` no teste novo — tipados; o painel ficou em 23/5.

### T13 — `13-guarda-do-dono-unico-da-escrita`
- **What**: `apps/store/src/shared/lib/__tests__/pedidoGravadoSoPeloDono.test.ts` (§8.1), pela AST do
  TypeScript, no molde de `marcacaoSoPorAcao`.
- **Where**: `apps/store/src/shared/lib/__tests__/pedidoGravadoSoPeloDono.test.ts`
- **Depends on**: T12
- **Done when**: varre `apps/*/src` e `packages/*/src` (diretórios escritos **literalmente**),
  produção, fora de `packages/core/src/order-actions/**`; **oito réguas** (`update`/`insert`/`upsert`/
  `delete` × `orders`/`order_status_history`), cada uma com caso próprio; tabela que não resolve para
  literal é acusada; allowlist **literal de uma entrada** — o corpo de `cancelOrder` em
  `useAdminOrders.ts`, por declaração (um `update` novo no mesmo arquivo é acusado: sensor), com o
  motivo escrito; **metade positiva**: `useAdminOrders.ts` chama as três escritas do dono e
  `notifyOrder.ts` chama `triggerOrderNotification` (a do app, `gravarAcao.ts` → `runAppAction`, entra
  na T16 — a régua já nasce exigindo-a **condicionada à existência do arquivo**, e a T16 a torna
  incondicional); âncora dupla (arquivos lidos ≥ N contados do disco **e** ≥ 3 escritas achadas
  dentro do dono); sensores: CRLF, LF, glob de dois asteriscos em comentário, a cadeia quebrada em
  linhas, tabela em variável, alias de import do client; inversos: `select` de `orders`, `update` de
  outra tabela entre os dois, e o comentário que **descreve** a forma proibida; o cabeçalho declara o
  fora de escopo (`supabase/functions/**`, `tools/catalog-import/**`) com o motivo, **descrevendo** a
  forma proibida sem escrevê-la; `marcacaoSoPorAcao.test.ts` verde **sem tocar** (nenhuma RPC nova,
  `MAA-30`); Full gate + Build gate (fecho da fase).
- **Reqs**: `MAA-39`, `MAA-30`, `MAA-27` (metade positiva), `AD-059`.
- **Tests**: guarda · **Gate**: build
- **Status**: ✅ **Feita** (2026-10-24). `pedidoGravadoSoPeloDono.test.ts` (33) pela AST: as oito
  réguas (comando × tabela), cada uma com a ausência no repositório **e** o caso sintético acusado;
  tabela dinâmica e builder que escapa (`fuga`) acusados — **mais estrito que o §8.1**, no molde de
  `marcacaoSoPorAcao`, e nada no repositório cai nele; allowlist literal de uma entrada (`cancelOrder`,
  por declaração **e** por escrita: `update orders` + `insert order_status_history`); metade positiva
  (painel chama as três escritas; `notifyOrder.ts` chama `triggerOrderNotification`; `gravarAcao.ts` →
  `runAppAction` condicional à existência do arquivo, a T16 a torna incondicional). Âncoras: o escopo
  literal **igual** aos `apps/*/src` + `packages/*/src` do disco; arquivos lidos = os contados por
  `readdirSync({ recursive })` (≥ 500 de produção); **exatamente** as três escritas do dono achadas; a
  allowlist ainda grava. Sensores: LF, CRLF, glob de dois asteriscos em comentário, cadeia quebrada,
  `const` com a tabela, parâmetro (dinâmica), alias de import do client, alias do builder, fuga, um
  `update` novo no mesmo arquivo fora de `cancelOrder` (sobre a fonte real), um `delete` dentro de
  `cancelOrder`, e `cancelOrder` em outro arquivo; inversos: `select`, `update` de outra tabela entre
  duas leituras, o comentário que descreve a forma, `Array.from`/`storage.from`. Cabeçalho declara o
  fora de escopo (functions e importador) descrevendo, sem escrever, a forma proibida.
  `marcacaoSoPorAcao.test.ts` verde **sem tocar** (`set_material_status` continua chamado, agora de
  `packages/core`). Mutantes M38 (o painel voltando a gravar à mão em `updateStatus`), M39
  (`notifyOrder` sem o dono): **mortos por asserção**.
- **Gate da Fase 2 (Build, 2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000`
  sem o `--`)**: core **4206/166** (exit 0; entrada 4112/160, **+94/+6**: notify 9, purity 7, status 15,
  tracking 15, material 14, appAction 34), mobile-adm **811/61** (exit 0, igual), store **5885/320**
  (exit 0; **+33/+1**, o guarda), backoffice **3696/212** (exit 0; **+17/+1**, a delegação). `tsc`: 0 em
  mobile-adm (app e node), store (app e server) e backoffice; `packages/core` **11**, os herdados linha a
  linha. Lint: mobile-adm 0/0, backoffice 23/5, store 2/2 — sem regressão. `pnpm --filter
  @estrelinha/mobile-adm build` e `… backoffice build` exit 0. `packages/core/src/payment/**` sem
  alteração. **Sensor do autor (Fase 2)**: 20 mutantes (M22–M41) nos arquivos reais, alvo que não
  existe lança, SHA-256 conferido na restauração: **20 mortos por asserção, 0 por compilação, 0
  sobreviventes** (autor = verificador nesta passada).

### Fase 3 — a porta, o estado e os hooks do app

### T14 — `14-arnes-de-escrita`
- **What**: `test/fakeSupabase.ts` ganha `update`/`insert`/`upsert`/`delete` e `rpc` **registrados**
  (valores, cada `eq`/`in`/`select`) com resposta **por chamada** (fila por tabela/RPC), e
  `functions.invoke` registrado; `test/clientReal.ts` ganha resposta **por método** (`PATCH`/`POST`)
  em `tabelas` — **nas duas cópias** (app e loja), com `clientRealPareado` verde.
- **Where**: `apps/mobile-adm/src/test/{fakeSupabase,clientReal}.ts`,
  `apps/store/src/test/clientReal.ts` (a cópia), `apps/mobile-adm/src/test/__tests__/*`
- **Depends on**: T13
- **Done when**: testes do próprio arnês provam que ele **enxerga** o filtro (um `eq` trocado aparece
  no registro — memória "dublê que não enxerga"), que a fila por chamada devolve respostas em ordem e
  **lança** quando esgota (para "zero chamadas" não ser verdade por silêncio), e que o `clientReal`
  responde PATCH e GET diferentes na mesma tabela; as suítes existentes do app e da loja seguem verdes
  sem asserção tocada; `clientRealPareado` verde; Full gate.
- **Reqs**: base de `MAA-20`..`MAA-23`, `MAA-29` (prova), `L-055`.
- **Tests**: unit (arnês) · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `fakeSupabase.ts`: `update`/`insert`/`upsert`/`delete` numa
  tabela de dado registrados em `escritasDe(tabela)` com os VALORES e a cadeia depois do comando; filas
  por chamada (`filaDeEscrita`, `filaRpc`, `filaDeInvocacao`) que **lançam** quando esgotam (ou nunca
  existiram) e ficam em `esgotamentos()`; `functions.invoke` registrado (`invocacoesDe`); `log()` com a
  ordem global das idas ao banco. A tabela sem leitura nem fila continua lançando na hora (como na
  `74`); a RPC sem fila continua `{ data: null }`. `clientReal.ts` (as DUAS cópias, idênticas fora do
  cabeçalho): entrada `{ porMetodo: { GET, PATCH, POST, DELETE } }` em `tabelas`, e `chamadas`/
  `chamadasDe(metodo, caminho)` com a busca e o corpo. `test/__tests__/escritaNoArnes.test.ts` (15): o
  filtro trocado (`in` × `eq`) aparece no registro, a fila em ordem, o esgotamento lança e é registrado,
  leitura e escrita da mesma tabela de fontes diferentes, a fila que segura, e o PATCH × GET do client
  real (corpo e filtros do PATCH conferidos; 500 é erro; a entrada simples vale como na `74`).
  `clientRealPareado` verde. Full gate: core 4206/166, mobile-adm **826/62** (+15/+1), store 5885/320,
  backoffice 3696/212, os quatro exit 0 — nenhuma asserção existente tocada.

### T15 — `15-conferir-papel`
- **What**: `entities/order/api/lerComPapel.ts` ganha `conferirPapel()` (chama a mesma RPC
  `atelie_clock` da leitura; o literal continua **só** ali, E1 da `74`), exportada pelo slice.
- **Where**: `apps/mobile-adm/src/entities/order/api/lerComPapel.ts`, `index.ts`,
  `entities/order/api/__tests__/lerComPapel.test.ts` (+)
- **Depends on**: T14
- **Done when**: `42501` ⇒ lança `{ code: ACCESS_DENIED_CODE }`; resposta boa ⇒ resolve; falha de
  rede / 5xx ⇒ lança erro **que `isAccessDenied` não reconhece** (rede nunca é recusa); o literal
  `atelie_clock` aparece em um arquivo só (régua existente de `leituraSoComPapel` verde, ajustada só
  se a âncora contar exportações — nunca afrouxada); Quick gate (app).
- **Reqs**: `MAA-21`, `MAA-23` (base), A3.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `conferirPapel()` em `lerComPapel.ts`, exportada pelo slice;
  o literal `atelie_clock` continua em **uma** chamada só (`perguntarAoRelogio`, lida pela leitura e
  pela conferência) e a régua 3 de `leituraSoComPapel` verde sem mudança. 200 sem `lido_em` também lança
  (não confirma) — a mesma régua da leitura. +7 em `lerComPapel.test.ts` (11 → 18): 42501 ⇒ lança e
  `isAccessDenied` reconhece; boa ⇒ resolve com UMA chamada sem argumento; rede `{ error }`, 5xx
  (`XX000`), rejeição e 200 sem instante ⇒ lança erro que `isAccessDenied` NÃO reconhece; exportada
  pelo slice (`toBe`). Os 6 reprovaram antes do código (o do slice ganhou a âncora `typeof === 'function'`
  depois de passar sobre o `undefined` — a asserção vazia). Quick gate verde.

### T16 — `16-porta-de-escrita-do-app`
- **What**: `features/order-actions/api/gravarAcao.ts` (§3.4) e o guarda
  `entities/order/api/__tests__/escritaSoPelaPorta.test.ts` (§8.2).
- **Where**: `apps/mobile-adm/src/features/order-actions/{api/gravarAcao.ts,index.ts}`,
  `features/order-actions/api/__tests__/gravarAcao.test.ts`,
  `entities/order/api/__tests__/escritaSoPelaPorta.test.ts`; `pedidoGravadoSoPeloDono.test.ts` (a metade
  positiva do app vira incondicional)
- **Depends on**: T15
- **Done when**: `gravarAcao.test.ts` (com `runAppAction` e `conferirPapel` dublados por módulo):
  `ok`/`falhou`/`material-recusado`/`parcial` com causa `falhou` repassados; `sem-papel` ⇒ **lança**
  `{ code: '42501' }`; `nenhuma-linha` ⇒ `conferirPapel` chamada **uma** vez ⇒ `42501` lança, boa ⇒
  `{ tipo: 'mudou' }`, rede ⇒ `falhou`; `parcial` com causa `nenhuma-linha` ⇒ a mesma conferência e
  devolve o `parcial`; o `deps.client` é o client do app e `deps.notify` chama
  `triggerOrderNotification` com ele; `escritaSoPelaPorta`: nenhuma `.update(`/`.insert(`/`.upsert(`/
  `.delete(`/`.functions.invoke(` em `apps/mobile-adm/src` produção, nenhuma `.rpc(` fora de
  `lerComPapel.ts`, o client importado por **4** arquivos (a âncora de `leituraSoComPapel` 3 → 4 com a
  razão escrita, ou o guarda novo lê a mesma lista — nunca afrouxar), `supabase` em `gravarAcao.ts`
  só como valor passado (nunca receptor de `.`), metade positiva (`runAppAction(` e `conferirPapel(`
  chamados), sensores CRLF/LF/glob e o inverso (o `.from(` de leitura do hook não é acusado);
  `regraDePedidoSoNoCore` verde (âncora de arquivos recontada); Full gate.
- **Reqs**: `MAA-04` (lança), `MAA-21`, `MAA-22`, `MAA-29`, `AD-059`.
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `features/order-actions/api/gravarAcao.ts` + `index.ts`
  (slice novo). `gravarAcao.test.ts` (16): `ok`/`falhou`/`material-recusado`/`parcial` por falha
  repassados SEM conferir; `sem-papel` ⇒ lança `{ code: '42501' }`; `nenhuma-linha` ⇒ UMA conferência:
  recusa lança, boa ⇒ `{ tipo: 'mudou' }`, rede/5xx ⇒ `falhou`; `parcial` com causa `nenhuma-linha` ⇒
  a mesma conferência (recusa lança, boa devolve o parcial); `deps.client` É o client do app e
  `deps.notify` chama `triggerOrderNotification` com ele. **Divergência registrada (precisão, §3.4
  não diz)**: a conferência SEM REDE de um `parcial` devolve o próprio `parcial` e não `falhou` — a
  primeira escrita já valeu e "Não consegui salvar" seria falso (`SPEC_DEVIATION` no arquivo; opção
  conservadora: não afirmar o que não aconteceu). `escritaSoPelaPorta.test.ts` (15, AST): régua 1 sem
  achados no app (`update`/`insert`/`upsert` em qualquer receptor, `delete` só com cadeia por `from(`
  ou `supabase` — o `delete` de `Set`/`Map` do app é declarado fora, com o motivo no cabeçalho —,
  `functions.invoke`, `rpc(` fora de `lerComPapel.ts`); régua 2: os 4 importadores por igualdade e
  `supabase` na porta só como valor (âncora: 2 referências); régua 3: `runAppAction(` e `conferirPapel(`
  chamados. Sensores: os três comandos dentro de `lerComPapel`, `delete` em cadeia quebrada com LF e
  CRLF, function e RPC, client apelidado, comentário com o glob de dois asteriscos (em comentário de
  LINHA: num de bloco a sequência fecha o comentário também no TypeScript) e de bloco com CRLF,
  inversos (`select` do hook, `delete` de `Map`), receptor por ponto e por colchete. `leituraSoComPapel`:
  a allowlist de 3 → **4** com a razão escrita (a porta), ainda por igualdade.
  `pedidoGravadoSoPeloDono` (loja): a metade positiva do app ficou **incondicional** (o arquivo tem de
  existir). `regraDePedidoSoNoCore` verde (âncora recontada na T20). Full gate: core 4206/166,
  mobile-adm **864/64**, store 5885/320, backoffice 3696/212, exit 0.

### T17 — `17-trava-aviso-e-erro-em-modulo`
- **What**: `features/order-actions/model/{travas,avisos,erros}.ts` com `useSyncExternalStore`
  (molde de `access-check/model/tentativa.ts`) e `esquecerAcoes()`, chamado por
  `LimparCacheNaTrocaDeConta` (`app/App.tsx`) ao lado de `esquecerTermos`.
- **Where**: `apps/mobile-adm/src/features/order-actions/model/{travas,avisos,erros}.ts` + testes;
  `apps/mobile-adm/src/app/App.tsx`, `app/__tests__/trocaDeContaLimpaCache.test.tsx` (+)
- **Depends on**: T16
- **Done when**: `travar(id)` devolve `true` e a segunda chamada **no mesmo tique** `false`; outro id
  não é afetado; `soltar` libera; `mostrarAviso` substitui o anterior; `definirErro(id, e)` visível por
  `useErroDoPedido(id)` em dois consumidores montados juntos (o cartão e o detalhe); `ErroDaAcao` com
  `retentativa`; `esquecerAcoes` zera os três e a troca de conta pelo `<App />` real os zera
  (re-entrada com a mesma conta não herda trava nem erro, `L-057`); Quick gate.
- **Reqs**: `MAA-20` (base), `MAA-35` (estado), `MAA-36` (trava compartilhada), A20.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `model/travas.ts` (`travar`/`soltar`/`useTravado`),
  `model/avisos.ts` (`mostrarAviso`/`limparAviso(chave?)`/`useAviso`; o tipo chama-se `AvisoMostrado`
  para não colidir com o componente `AvisoDaAcao` da T21, e cada aviso leva uma `chave` nova — o host
  reinicia o prazo mesmo com a mesma frase), `model/erros.ts` (`definirErro`/`lerErro`/
  `useErroDoPedido`, com `ErroDaAcao { frase, retentativa }`), `model/esquecerAcoes.ts`, todos com
  `useSyncExternalStore`. `App.tsx`: `LimparCacheNaTrocaDeConta` chama `esquecerAcoes()` ao lado de
  `esquecerTermos`. `estadosEmModulo.test.tsx` (9): trava no mesmo tique, outro id livre, `soltar`,
  dois consumidores; aviso substitui com chave nova e o `limparAviso` de um aviso velho não apaga o
  novo; erro visto pelo cartão E pelo detalhe montados juntos e só no pedido dele; `esquecerAcoes` zera
  os três e quem observa vê. `trocaDeContaLimpaCache.test.tsx` +3 (5 → 8) pelo `<App />` real: A → B
  não herda trava, erro nem confirmação; sair e reentrar com a MESMA conta não herda (`L-057`); a volta
  da aba com o mesmo usuário NÃO esquece (a ação em voo continua dona). Quick gate verde.

### T18 — `18-hook-da-acao`
- **What**: `features/order-actions/model/useAcaoDoPedido.ts` (§3.5).
- **Where**: `apps/mobile-adm/src/features/order-actions/model/useAcaoDoPedido.ts`,
  `model/__tests__/useAcaoDoPedido.test.tsx`
- **Depends on**: T17
- **Done when**: dois `executar()` no **mesmo tique**, sem `await` entre eles ⇒ **uma** chamada à porta
  (`MAA-20`), e o mesmo com dois hooks do mesmo id montados (cartão + detalhe); `soltar` no `finally`
  também quando a porta **lança** a recusa — e um terceiro `executar` depois sai (re-entrada,
  `L-057`); em **todo** desfecho que chega à rede (ok, mudou, falhou, recusado, parcial, recusa
  lançada) as três chaves (`chaveDoPedido(id)`, `[LISTA_DE_PEDIDOS_KEY]` com dois recortes semeados,
  `STORE_OVERVIEW_KEY`) ficam `isInvalidated` **e** `chaveDoPedido(<outro>)` não (`MAA-41`, `MAA-37`);
  sucesso ⇒ `mostrarAviso(actionConfirmation(...))` e o erro do pedido limpo; `mudou` ⇒
  `ORDER_CHANGED`; `falhou` ⇒ `ACTION_FAILED`; `material-recusado` ⇒
  `materialTransitionRefusal(status, to)` (texto por extenso); `parcial` ⇒ `PARTIAL_MATERIAL`/
  `PARTIAL_TRACKING` com a `retentativa` de §3.5 (para o rastreio: `{ tipo: 'rastreio', codigo:
  <normalizado>, origem }`); recusa ⇒ `erroBruto` preenchido e nenhum aviso; **troca de conta no meio**
  ⇒ nenhum aviso nem erro desenhado; nenhum aviso em falha (exclusividade); Quick gate.
- **Reqs**: `MAA-02`, `MAA-03`, `MAA-15` (a), `MAA-20`, `MAA-21`, `MAA-22`, `MAA-36`, `MAA-37`,
  `MAA-40`, `MAA-41`, A20, A21.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `model/useAcaoDoPedido.ts` → `{ executar, travado, erro,
  erroBruto }`. `useAcaoDoPedido.test.tsx` (27, a porta dublada por módulo): dois `executar` no mesmo
  tique ⇒ uma chamada, e o mesmo com o cartão e o detalhe (o vizinho de outro id sai); a recusa lançada
  solta a trava e o terceiro sai; em TODO desfecho (ok, mudou, falhou, material-recusado, parcial,
  recusa lançada) o pedido, DOIS recortes da lista e o resumo ficam `isInvalidated` e o pedido vizinho
  não; o toque travado não relê; sucesso ⇒ a confirmação de `actionConfirmation` por extenso (Recebi
  com e sem e-mail, separação com material, rastreio de `separating`) e o erro limpo; `mudou` ⇒
  "Este pedido mudou enquanto você olhava."; `falhou` e exceção que não é recusa ⇒ "Não consegui
  salvar. Tente de novo."; `material-recusado` ⇒ o texto de `materialTransitionRefusal` por extenso;
  `order_not_found` ⇒ nenhuma frase (a releitura leva ao "Não encontrei", `MAA-04`); `parcial`
  material ⇒ `PARTIAL_MATERIAL` + `{ tipo: 'primaria' }`; `parcial` rastreio ⇒ `PARTIAL_TRACKING` +
  `{ tipo: 'rastreio', codigo: 'AB12345678BR' (normalizado), origem }`; recusa ⇒ `erroBruto` e nada
  desenhado; nenhuma confirmação em falha; troca de conta no meio (sucesso, falha e recusa chegando
  depois) ⇒ nada desenhado e a trava da conta nova não é solta. **Divergência registrada (forma)**: a
  troca de conta é detectada pela GERAÇÃO das ações (`geracaoDasAcoes`, que `esquecerAcoes` sobe), não
  por `user.id` do início × fim (§3.5) — vale também com o componente desmontado (a saída desmonta as
  páginas sob o `RequireAdmin`) e não solta a trava que a conta nova pôs (`SPEC_DEVIATION` no arquivo).
  Quick gate verde.

### T19 — `19-teclado-virtual`
- **What**: `shared/lib/useTecladoVirtual.ts` (§3.9).
- **Where**: `apps/mobile-adm/src/shared/lib/useTecladoVirtual.ts`,
  `shared/lib/__tests__/useTecladoVirtual.test.ts`
- **Depends on**: T18
- **Done when**: sem `visualViewport` ⇒ 0; com `visualViewport` dublado reduzido ⇒
  `innerHeight − (height + offsetTop)`; piso 0; reage a `resize` **e** `scroll` do `visualViewport`;
  no desmonte os ouvintes saem **pelo mesmo handler** que entrou (identidade, lição da `47`);
  `index.html` com o viewport **intocado**; Quick gate.
- **Reqs**: `MAA-32` (teclado), R1, Q4.
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `shared/lib/useTecladoVirtual.ts`. `useTecladoVirtual.test.ts`
  (7): sem `visualViewport` ⇒ 0; reduzido ⇒ 336 (844 − 508); `offsetTop` entra (296); piso 0; reage a
  `resize` E `scroll`; no desmonte cada ouvinte sai pelo MESMO handler que entrou; `index.html` com o
  viewport idêntico e sem `interactive-widget`. Quick gate verde.

### T20 — `20-folha-no-historico`
- **What**: `features/order-actions/model/useFolhaNoHistorico.ts` (§3.8): abrir empurra pelo roteador
  a mesma `pathname`/`search` com o marcador no `state` (preservando `doApp`); aberta sse o marcador
  bate **e** foi aberta nesta montagem; fechar ⇒ `navigate(-1)`; F5 com o marcador ⇒ `replace` sem
  ele; estado novo do pedido que muda o modo ou anula a folha ⇒ fecha e `ORDER_CHANGED`.
- **Where**: `apps/mobile-adm/src/features/order-actions/model/useFolhaNoHistorico.ts`,
  `model/__tests__/useFolhaNoHistorico.test.tsx`
- **Depends on**: T19
- **Done when**: com o roteador real em memória e o histórico montado **pelo próprio teste**
  (`L-052`, `L-053`): abrir aumenta `history.length` em 1 sem mudar `pathname`/`search` e mantém
  `doApp`; o voltar fecha a folha e a entrada anterior é a do próprio teste; o mutante `push →
  replace` morre por asserção; fechar por função consome a entrada; montar com o marcador e sem a ref
  ⇒ `replace` (`history.length` igual) e a folha fechada; o pedido mudando de `separating` para
  `cancelled` com a folha aberta ⇒ folha fechada e `ORDER_CHANGED` em `erros.ts` (`MAA-26`);
  nenhuma chamada a `pedidosHref` ou escrita na query; Quick gate; Build gate (fecho da fase).
- **Reqs**: `MAA-26`, `MAA-32` (voltar e F5), A23.
- **Tests**: unit · **Gate**: build
- **Status**: ✅ **Feita** (2026-10-24). `model/useFolhaNoHistorico.ts` → `{ folha, aberta, abrir,
  fechar }`. `useFolhaNoHistorico.test.tsx` (12, `BrowserRouter` real sobre o histórico do jsdom, com
  uma sentinela única por caso montada pelo teste): abrir ⇒ `history.length` +1, mesmo `pathname`/
  `search`, `doApp` mantido; o voltar fecha e devolve à entrada do teste, e o voltar seguinte vai à
  sentinela (a folha ocupou UMA entrada); `fechar()` consome a entrada sem empurrar outra, e com a folha
  fechada não mexe no histórico; outro usuário da MESMA folha no mesmo roteador não a vê aberta; o
  avançar depois do voltar não reabre; F5 com o marcador ⇒ `replace` sem ele (`history.length` igual,
  `doApp` mantido, sem voltar morto), e o marcador de OUTRO pedido não é tocado; `separating` →
  `cancelled` e `salvar` → `alterar` com a folha aberta ⇒ fecha (a entrada sai) e `ORDER_CHANGED`; o
  mesmo modo relido mantém aberta; o hook não cita `pedidosHref`/`useSearchParams`. **Divergência
  registrada (forma)**: a chave é `<id>:<origem>:<modo>` (§3.8 diz `<id>:<modo>`) — o rodapé e
  "Informar" da Entrega podem oferecer o mesmo modo no mesmo pedido (`SPEC_DEVIATION` no arquivo). Achado
  de método: os efeitos rodam no FIM do `act`; o `navigate(-1)` que eles pedem só acontece num `act`
  seguinte (o teste tinha a espera dentro do mesmo `act` e medida antes do voltar).
  `regraDePedidoSoNoCore`: âncora recontada (83 → **94** arquivos de produção; piso 80 → 90, com
  `gravarAcao`, `useAcaoDoPedido` e `useFolhaNoHistorico` nomeados).
- **Gate da Fase 3 (Build, 2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000`
  sem o `--`)**: core **4206/166** (exit 0, igual), mobile-adm **922/68** (exit 0; entrada 811/61,
  **+111/+7**: escritaNoArnes 15, lerComPapel +7, gravarAcao 16, escritaSoPelaPorta 15,
  estadosEmModulo 9, trocaDeConta +3, useAcaoDoPedido 27, useTecladoVirtual 7, useFolhaNoHistorico 12),
  store **5885/320** (exit 0, igual — a metade positiva virou incondicional sem mudar a contagem),
  backoffice **3696/212** (exit 0, igual). `tsc`: 0 em mobile-adm (app e node), store (app e server) e
  backoffice; `packages/core` **11**, os herdados (carousel 5, pickHomeBanners 1, pickHomeCollections 1,
  sitemap/urls 2, supabase/client 2). Lint: mobile-adm 0/0, backoffice 23/5, store 2/2 — sem regressão.
  `pnpm --filter @estrelinha/mobile-adm build` e `… backoffice build` exit 0. `packages/core/src/payment/**`
  sem alteração. **Sensor do autor (Fase 3)**: 33 mutantes (M42–M74) nos arquivos reais (arnês, porta,
  `conferirPapel`, travas, avisos, `App.tsx`, hook, teclado, folha e o guarda da porta), alvo que não
  existe lança, SHA-256 conferido na restauração: na primeira passada **32 mortos por asserção, 1
  sobrevivente** (M71: `aberta` sem a referência da montagem — o caso "só quem abriu" montava os dois
  usuários em roteadores separados, então o segundo nunca via o marcador); conserto: o caso passou a
  montar os dois no MESMO roteador, mais o caso do avançar depois do voltar — M71 reinjetado **morto por
  asserção** (2 casos). Final: **33 mortos por asserção, 0 por compilação, 0 sobreviventes** (autor =
  verificador nesta passada).

### Fase 4 — a tela

### T21 — `21-aviso-da-acao-no-layout`
- **What**: `features/order-actions/ui/AvisoDaAcao.tsx` com o host único no
  `app/layout/MobileLayout.tsx` (dentro do `RequireAdmin`) e **uma** constante/variável CSS por altura
  (barra de abas, rodapé), lida pela barra, pelo rodapé e pelo aviso.
- **Where**: `apps/mobile-adm/src/features/order-actions/ui/AvisoDaAcao.tsx` + teste;
  `app/layout/MobileLayout.tsx`, `widgets/tab-bar` (passa a ler a constante)
- **Depends on**: T20
- **Done when**: `role="status"`; não rouba o foco (o `document.activeElement` antes e depois é o
  mesmo); some sozinho em **5 s** com relógio falso, e uma nova confirmação substitui e **reinicia** o
  prazo (o aviso novo ainda visível a 4,9 s dele); texto que quebra (sem `truncate`, token exato);
  `bottom` composto da constante da barra + a do rodapé quando há rodapé + `safe-area` (classe/estilo
  por token exato; a medida real é da T31); `motion-reduce:` que **desliga** movimento na mesma linha
  de cada `transition-*`/`animate-*`; a recusa desmonta o host (nenhum aviso sobre ela); a barra de
  abas continua com a mesma altura (teste existente verde sem asserção tocada); Full gate.
- **Reqs**: `MAA-31` (posição), `MAA-33` (quebra), `MAA-34`, `MAA-35`, Q6, Q7 (`n — confirmar`, TQ9).
- **Tests**: componente · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `features/order-actions/ui/AvisoDaAcao.tsx` (host único no
  `MobileLayout`, dentro do `RequireAdmin`), `features/order-actions/model/rodape.ts` (há rodapé montado?
  em módulo; a altura MEDIDA vai à variável CSS `--altura-do-rodape` da raiz) e o dono das alturas do pé
  da tela, `shared/ui/alturas.ts` (`ALTURA_DA_BARRA`, `CLASSE_DA_BARRA`, `RESERVA_DA_BARRA`,
  `RODAPE_ACIMA_DA_BARRA`, `RESERVA_DO_RODAPE`, `AVISO_ACIMA_DA_BARRA`, `AVISO_ACIMA_DO_RODAPE` — classes
  LITERAIS, porque o Tailwind só gera o que lê por extenso; conferidas no CSS do build). `TabBar` e
  `MobileLayout` passaram a ler a constante (`TAB_BAR_HEIGHT = CLASSE_DA_BARRA`, `RESERVA_DA_BARRA`);
  `TabBar.test.tsx` verde **sem asserção tocada**. `AvisoDaAcao.test.tsx` (8): `role="status"` +
  `aria-live="polite"`/`aria-atomic`; o foco não sai do botão; some aos 5 s (presente aos 4,9 s); a nova
  substitui e REINICIA o prazo, também com a mesma frase; sem `truncate`/`whitespace-nowrap` e com
  `[overflow-wrap:anywhere]`; nenhuma classe de movimento; posição por token exato sem e com rodapé (e
  volta quando o rodapé sai). `alturas.test.ts` (7): `h-16` = `4rem`; as quatro classes somam a barra e o
  inset; reserva e aviso leem a MESMA variável com o MESMO piso; barra e layout sem `4rem` à mão. A recusa
  desmontando o host: pelo `<App />` real em `acoesDoPedido.test.tsx` (`not_admin` ⇒ nenhuma confirmação
  em 60 leituras de 50 ms).
  **Divergência (precisão, registrada no arquivo)**: a região `status` só existe COM aviso — o app já tem
  outra (`PullToRefresh`, "Atualizando…") e três suítes da `73`/`74` a pedem por `getByRole('status')`;
  uma segunda região vazia e permanente as quebraria. A região entra já com o texto; o anúncio em leitor
  real fica com a T31/QA. **Ordem**: o componente foi escrito junto do teste (não vermelho primeiro); a
  discriminação foi provada pelos mutantes M75-01..03, M75-29, M75-30 (todos mortos por asserção).

### T22 — `22-folha-do-rastreio`
- **What**: `features/order-actions/ui/FolhaDoRastreio.tsx` (`Sheet side="bottom"`, `hideClose`),
  ligada a `useFolhaNoHistorico`, `useTecladoVirtual` e `useAcaoDoPedido`.
- **Where**: `apps/mobile-adm/src/features/order-actions/ui/FolhaDoRastreio.tsx` + teste
- **Depends on**: T21
- **Done when**: título, frase e valor inicial de `trackingSheet` (os cinco casos pela UI, texto por
  extenso); campo "Código de rastreio" com placeholder "Ex.: AN123456789BR", `autoCapitalize=
  "characters"`, `inputMode="text"`, `autoComplete="off"`, normalizando ao digitar; código curto ⇒ a
  frase de `trackingCodeRefusal` no campo (`aria-invalid`, `aria-describedby`) e **zero** chamadas no
  dublê (`MAA-12`); "Agora não" e "Salvar" com `min-h-12` (token exato); foco no campo ao abrir;
  "Salvar" com "Salvando…"/`aria-disabled` enquanto travado; a folha fecha **só** depois do sucesso
  (com falha ela continua aberta, com o erro); `bottom` = o deslocamento do teclado; classes
  `motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none` (R2,
  token exato — `motion-reduce:animate-none` puro **não** basta); Quick gate.
- **Reqs**: `MAA-10`, `MAA-11` (frases), `MAA-12`, `MAA-13` (fecha após sucesso), `MAA-20`,
  `MAA-32`, `MAA-34`, A23.
- **Tests**: componente · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `features/order-actions/ui/FolhaDoRastreio.tsx`
  (`Sheet side="bottom"`, `hideClose`, `onOpenAutoFocus` no campo, `bottom` = `useTecladoVirtual()`,
  `motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none`).
  `FolhaDoRastreio.test.tsx` (19, **vermelho primeiro** — reprovou por "Failed to resolve import" antes do
  componente): os cinco casos de `trackingSheet` pela UI com título, frase por extenso e valor inicial; o
  campo (placeholder, `autocapitalize="characters"`, `inputmode="text"`, `autocomplete="off"`); foco no
  campo; normaliza ao digitar; código curto ⇒ a frase no campo com `aria-invalid`/`aria-describedby` e
  ZERO chamadas à porta; salvar manda `{ tipo: 'rastreio', codigo: 'AN123456789BR', origem: 'acao' }`,
  "Salvando…" com `aria-disabled`, segundo toque não sai, fecha SÓ depois do sucesso; falha e "mudou"
  ⇒ folha aberta com o `role="alert"`; "Agora não" fecha sem porta; `min-h-12` por token exato; sem o X;
  os dois pares de estado; `bottom` 0 e 336 px com o `visualViewport` reduzido.
  `useAcaoDoPedido`: `executar` passou a devolver `Promise<boolean>` (`true` só no sucesso desenhado) e a
  aceitar `{ aoConcluir }`, chamado no sucesso ANTES de a releitura sair — a folha fecha ali, senão o
  pedido relido em `shipped` seria lido por `useFolhaNoHistorico` como "mudou com a folha aberta"
  (`MAA-26`). +5 casos em `useAcaoDoPedido.test.tsx` (27 → 32); nos casos antigos só mudou a anotação de
  tipo das variáveis (`Promise<void>` → `Promise<boolean>`), nenhuma asserção.
  **Divergências (precisão, registradas no arquivo)**: (1) a PARCIAL do rastreio também fecha a folha — o
  código já gravou, e o "Tentar de novo" de `MAA-15` (a) é do rodapé; (2) o `SheetOverlay` de
  `packages/ui` faz `fade` e não recebe classe (o `SheetContent` o monta por dentro): o fundo escurece
  com animação mesmo com menos movimento. É opacidade, não deslocamento; a T31 mede `getAnimations()` e,
  se o fundo contar, vira `Bxx` (a saída é `packages/ui` aceitar a classe do overlay).

### T23 — `23-rodape-no-detalhe`
- **What**: `features/order-actions/ui/RodapeDaAcao.tsx` montado em `pages/PedidoPage.tsx` (com a
  reserva de altura no fim do conteúdo) e a página passando `erroBruto` a `useRecusaDePapel`; o
  `<App />` real em `pages/__tests__/acoesDoPedido.test.tsx` (novo).
- **Where**: `apps/mobile-adm/src/features/order-actions/ui/RodapeDaAcao.tsx`,
  `pages/PedidoPage.tsx`, `pages/__tests__/acoesDoPedido.test.tsx`
- **Depends on**: T22
- **Done when**, pelo `<App />` real sobre o `fakeSupabase` registrador:
  - rodapé com o rótulo de `appPrimaryAction` para `aguardando_material`, `paid`, `separating`,
    `shipped` sem código e retirada em `separating`; **sem** rodapé em cancelado (com material
    aguardando), entregue, `pending`, `shipped` com código (`MAA-01`, `MAA-06`, `MAA-16`);
  - "Recebi o material": **uma** RPC, a confirmação de A11 com e sem `emailSent`, o idempotente sem
    e-mail (`MAA-02`, `MAA-05`); `invalid_transition` ⇒ o motivo legível (`MAA-03`);
    `order_not_found` ⇒ "Não encontrei este pedido." pela releitura; `not_admin` ⇒ a recusa da `72`
    e **nenhuma** confirmação (`MAA-04`);
  - "Iniciar separação" com e sem material, a falha do material sem status (`MAA-09`) e a parcial com
    "Tentar de novo" gravando **só** o status (`MAA-40`);
  - "Marcar como enviado" abre a folha; salvar faz rastreio → status → um aviso; a parcial do
    rastreio com "Tentar de novo" ⇒ a folha **não** aparece no DOM, zero `update` de `tracking_code`,
    um de status (`MAA-15` a);
  - "Marcar como retirado" ⇒ `separating → delivered` (`MAA-38`);
  - zero linhas + `atelie_clock` bom ⇒ "Este pedido mudou enquanto você olhava."; `42501` ⇒ recusa
    (`MAA-21`); 500 ⇒ "Não consegui salvar. Tente de novo." e nunca a recusa (`MAA-22`); aviso que
    falha ⇒ gravou e confirmação sem e-mail (`MAA-24`);
  - **exclusividade** em cada estado (`L-063`): "Salvando…" sem erro e sem confirmação; erro
    (`role="alert"`) sem "Salvando…" e sem confirmação; confirmação sem erro; o erro **fica** até a
    próxima ação (`MAA-35`);
  - dois toques seguidos ⇒ uma escrita (`MAA-20`); sem conexão ⇒ a tela "Sem conexão" e **zero**
    escrita no dublê (`MAA-25`); `emitir()` do Realtime trocando o estado ⇒ o rodapé muda de rótulo
    (`MAA-26`);
  - o rodapé `fixed`, largura inteira, `min-h-12` (token exato), e a reserva de altura presente
    (`MAA-31`, prova de forma; a medida é da T31);
  - Full gate.
- **Reqs**: `MAA-01`..`MAA-09`, `MAA-13`, `MAA-15`, `MAA-16`, `MAA-20`..`MAA-26`, `MAA-31`, `MAA-35`,
  `MAA-38`, `MAA-40`, `MAA-41` (pela árvore).
- **Tests**: componente pela árvore real · **Gate**: full
- **Status**: ✅ **Feita, inteira** (2026-10-24 — não precisou dividir em T23a/T23b).
  `features/order-actions/ui/RodapeDaAcao.tsx` (rótulo e plano de `appPrimaryAction`; `folha` ⇒ abre a
  folha, o resto ⇒ a porta; "Salvando…"/`aria-disabled`; erro `role="alert"` acima do botão, com "Tentar
  de novo" quando há retentativa, escondido enquanto a ação está no ar; sem ação mas com erro, o rodapé
  fica com a frase; fixo acima da barra; reserva `RESERVA_DO_RODAPE` no fluxo; mede-se por
  `ResizeObserver` quando existe). `PedidoPage`: UMA `useAcaoDoPedido(id)`, passada ao rodapé e a
  "Informar/Alterar", e a recusa da porta na MESMA vigia (`useRecusaDePapel([pedido.error,
  recusaDaAcao])`) por `features/order-actions/model/useRecusaDaAcao.ts` (novo: a recusa vale enquanto
  a leitura da página é a de quando ela chegou — guardada em estado, uma recusa desmentida pela
  reconferência prenderia a página na falha). `pages/__tests__/acoesDoPedido.test.tsx` pelo `<App />`
  real sobre o `fakeSupabase` registrador — a parte da T23: rótulos (6) e ausência de rodapé e de reserva
  (5) por estado; retirada sem folha; a forma (fixo, `inset-x-0`, `min-h-12`, reserva depois do
  Histórico, a variável publicada); Recebi (UMA RPC com os argumentos, um aviso `material_status_changed`,
  confirmação com e sem e-mail, `invalid_transition` por extenso, `order_not_found` ⇒ "Não encontrei",
  `not_admin` ⇒ recusa da `72` sem confirmação em 60 instantes, e `not_admin` com o papel ainda admin ⇒
  UMA reconferência e o pedido de volta); Separar (sem material: a cadeia `eq id`/`eq status paid`/
  `select id`, o histórico, um aviso, "em separação" sem e-mail; com material: a ordem RPC → aviso →
  `update` → histórico → aviso, "em produção" com e-mail; material recusado ⇒ zero `update`; a parcial ⇒
  a frase e "Tentar de novo" gravando SÓ o status); Enviar (a folha; rastreio sem `shipping_carrier` com
  `in status [separating, shipped]`, depois o status, histórico, UM aviso, a folha fechada sem "mudou";
  zero linhas no rastreio ⇒ nada mais gravado e "mudou"; a parcial ⇒ a folha some, "Tentar de novo" sem
  reabri-la grava só o status); Retirado; zero linhas com papel de pé ⇒ "mudou" + conferência; com
  `42501` ⇒ recusa; 500 ⇒ "Não consegui salvar…", nunca a recusa; aviso que falha ⇒ confirmação sem
  e-mail; exclusividade (no ar / erro / confirmação) e o erro que fica 30 s até a próxima ação, e a
  próxima ação no ar escondendo o erro; dois toques ⇒ uma escrita; sem conexão ⇒ "Sem conexão" e zero
  escritas; o Realtime trocando o rótulo; a folha que deixou de valer fechando com "mudou".
  **Divergência (forma)**: os blocos do detalhe (`BlocoEntrega`, `BlocoMaterial`) e a lista
  (`ListaDePedidos`) recebem a ação como NÓ (`editar`, `lembrete`, `acaoDaLinha`), composto pela PÁGINA —
  em vez de os widgets importarem `features/order-actions` (§3.6). Motivo: as suítes da `74` montam esses
  widgets sem `QueryClient` e com/sem roteador, e "sem asserção tocada" valia para elas; a página é quem
  já tem a instância da ação. Opção conservadora: nenhum teste antigo mudou.
  **Ordem**: componente antes do teste nesta task; discriminação pelos mutantes M75-10..15, M75-27.

### T24 — `24-informar-alterar-na-entrega`
- **What**: `features/order-actions/ui/EditarRastreio.tsx` na linha do rastreio de
  `widgets/order-detail/ui/BlocoEntrega.tsx`, abrindo a mesma folha com `origem: 'entrega'`.
- **Where**: `apps/mobile-adm/src/features/order-actions/ui/EditarRastreio.tsx`,
  `widgets/order-detail/ui/BlocoEntrega.tsx`, `acoesDoPedido.test.tsx` (+)
- **Depends on**: T23
- **Done when**: "Informar"/"Alterar" só em `shipped`/`delivered` não retirada, nunca em retirada
  (`MAA-16`) nem nos outros status; alvo `min-h-11` (token exato); os **quatro** casos de `MAA-11`
  pela árvore com a frase por extenso; `delivered` sem código ("Informar") com `sent === true` no
  dublê ⇒ grava só o código com a guarda `['delivered']`, dispara `order_status_changed` e confirma
  **sem** e-mail (`MAA-14`); `shipped` com código ⇒ sem histórico, sem status, confirmação sem e-mail;
  código igual ao salvo em "Alterar" grava e confirma sem e-mail (edge case); Quick gate.
- **Reqs**: `MAA-11`, `MAA-14`, `MAA-16`, `MAA-31` (alvo).
- **Tests**: componente pela árvore real · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `features/order-actions/ui/EditarRastreio.tsx` (`trackingEdit` de
  `core`; nome acessível "Informar o rastreio"/"Alterar o rastreio", começando pelo rótulo visível;
  `min-h-11`; a MESMA folha com `origem: 'entrega'`), composto pela página no slot `editar` de
  `BlocoEntrega` (ao lado da linha do rastreio). Em `acoesDoPedido.test.tsx`: os quatro casos de
  `MAA-11` pela árvore, com o rótulo, `min-h-11` e a frase por extenso; seis estados sem o botão (pago,
  separação, pendente, cancelado, retirada enviada e entregue); `delivered` sem código com
  `sent === true` ⇒ só o código com `in status [delivered]`, zero histórico, o disparo
  `order_status_changed` e a confirmação SEM e-mail (`MAA-14`); `shipped` com código ⇒ sem histórico nem
  status, sem e-mail; código igual ao salvo grava e confirma; `shipped` sem código pela Entrega cita o
  e-mail quando ele saiu. Mutantes M75-16 e M75-22 mortos por asserção.

### T25 — `25-lembrete-no-whatsapp`
- **What**: `features/order-actions/ui/LembreteDoEnvio.tsx` em `widgets/order-detail/ui/BlocoMaterial.tsx`,
  com a cor do WhatsApp numa constante da marca do terceiro em `shared/config` (precedente da `65`).
- **Where**: `apps/mobile-adm/src/features/order-actions/ui/LembreteDoEnvio.tsx`,
  `widgets/order-detail/ui/BlocoMaterial.tsx`, `shared/config/*`, `acoesDoPedido.test.tsx` (+)
- **Depends on**: T24
- **Done when**: aparece só quando `canChargeMaterial` (os quatro pares falsos pela árvore: sem
  número, número inválido, `material_enviado`, cancelado); é `<a>` com `href` **igual** a
  `chargeMaterialUrl(row, row.customer_phone, new Date(lido_em))` — com o `lido_em` do dublê
  diferente do relógio do aparelho, provando que a idade vem da leitura (`MAA-18`, `AD-058`) —,
  `target="_blank"`, `rel="noopener noreferrer"`; tocar **não** registra escrita nem RPC no dublê;
  `min-h-11`, largura inteira; o texto decodificado do `href` sem material nomeado e igual ao que o
  painel monta para a mesma linha (chamando a reexportação do painel no teste, `MAA-19`); Quick gate.
- **Reqs**: `MAA-17`, `MAA-18`, `MAA-19`, A17, A19.
- **Tests**: componente pela árvore real · **Gate**: quick
- **Status**: ✅ **Feita** (2026-10-24). `features/order-actions/ui/LembreteDoEnvio.tsx`
  (`canChargeMaterial` + `chargeMaterialUrl(pedido, pedido.customer_phone, new Date(lidoEm))`, `<a>` em
  nova aba com `rel="noopener noreferrer"`, `min-h-11`, largura inteira), no slot `lembrete` de
  `BlocoMaterial`. A cor: `shared/config/whatsapp.ts` (`#075E54` com texto branco) +
  `shared/config/__tests__/whatsapp.test.ts` (2), que CALCULA a razão (≥ 4,5:1) e prova que o verde
  claro da marca (`#25D366`) reprovaria. **Divergência (precisão)**: o verde escuro da marca, e não o
  claro — texto branco sobre o claro fica em ~2:1. Em `acoesDoPedido.test.tsx` (8): o `href` IGUAL ao da
  reexportação do PAINEL (`apps/backoffice/.../chargeMaterial.ts`) com o `lido_em` da leitura, e
  DIFERENTE do montado com o relógio do aparelho (posto 40 dias depois); `wa.me/5551999990000`;
  `target`/`rel`; o texto decodificado igual ao do painel, sem nomear material nem urgência; tocar não
  registra escrita, invocação nem RPC de escrita; os quatro pares falsos (sem número, inválido, a
  caminho, cancelado) sem o link. Mutantes M75-17, M75-18, M75-23 mortos por asserção.

### T26 — `26-acao-no-cartao-da-lista`
- **What**: `features/order-actions/ui/BotaoDaAcao.tsx` como **irmão** do `<Link>` no `<li>` de
  `widgets/order-list/ui/ListaDePedidos.tsx`, em fluxo normal; `entities/order/ui/LinhaDoPedido.tsx`
  decide o tom por `appPrimaryAction(row).action` (sem importar `features`); `PedidosPage.tsx` passa o
  `erroBruto` à vigia da recusa (R11).
- **Where**: `apps/mobile-adm/src/features/order-actions/ui/BotaoDaAcao.tsx`,
  `widgets/order-list/ui/ListaDePedidos.tsx`, `entities/order/ui/LinhaDoPedido.tsx`,
  `pages/PedidosPage.tsx`, `acoesDoPedido.test.tsx` (+), testes existentes de `LinhaDoPedido`
- **Depends on**: T25
- **Done when**: o botão com o **mesmo** rótulo do rodapé (inclusive "Marcar como retirado" e o
  recorte de cancelado/entregue); não está dentro do `<a>` (nenhum `button` descendente de `a`);
  tocar no botão **não** navega e tocar fora dele abre o detalhe; o rastreio abre a **mesma** folha;
  com o detalhe e a lista montados, a trava é compartilhada (uma escrita); depois de gravar, o pedido
  que saiu do recorte **sai** da lista e a posição de rolagem é a gravada (`MAA-37`, prova de estado:
  a chave invalidada e a lista relida); a recusa vinda do cartão leva à recusa da `72` (R11); o tom de
  `marcar-retirado` é o primário; a frase do cartão (`rowSummary.blocker`) **inalterada** (os testes
  existentes de `LinhaDoPedido` sem asserção tocada); `min-h-11`; Full gate.
- **Reqs**: `MAA-36`, `MAA-37`, `MAA-16` (cartão), `MAA-20` (compartilhada), A13, A14b, Q5.
- **Tests**: componente pela árvore real · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `features/order-actions/ui/BotaoDaAcao.tsx` (irmão do `<Link>`
  no `<li>`, em fluxo normal; o mesmo rótulo e plano do rodapé; a mesma trava em módulo; o erro no cartão;
  `aoRecusa` sobe a recusa à página), composto por `PedidosPage` no slot `acaoDaLinha` de
  `ListaDePedidos`; a página passa a recusa à MESMA vigia (`useRecusaDaAcao` sobre `lista.dataUpdatedAt`).
  `LinhaDoPedido`: o tom do ponto vem de `appPrimaryAction(linha).action` (`PONTO_DA_ACAO` tipado por
  `AppActionId`); a frase continua de `rowSummary` — `LinhaDoPedido.test.tsx` verde sem asserção tocada.
  Em `acoesDoPedido.test.tsx` (15): os cinco rótulos iguais aos do rodapé com `min-h-11`, fora do `<a>`
  (nenhum `a button`) e no mesmo `<li>` do link; três estados sem botão; o tom de `marcar-retirado` é o
  primário; tocar no botão grava sem navegar e o link abre o detalhe; o rastreio abre a MESMA folha sem
  sair de `/pedidos?visao=tudo`; depois de gravar a lista é relida e o pedido que saiu do recorte sai, sem
  `scrollTo(0, 0)`; a trava posta por outro consumidor deixa o cartão em "Salvando…" sem gravar; a falha
  no cartão; a recusa do cartão ⇒ recusa da `72`, e com o papel ainda admin ⇒ UMA reconferência.
  `useRecusaDaAcao.test.ts` (3). Mutantes M75-14, M75-15, M75-19, M75-21, M75-24 mortos por asserção.
  **Limite declarado**: a posição de rolagem depois da releitura é provada só pela ausência do salto ao
  topo; a posição real é da T31.

### T27 — `27-guardas-de-ui`
- **What**: `shared/lib/__tests__/fraseDaAcaoSoNoCore.test.ts` (§8.4, novo);
  `movimentoDosPedidos.test.ts` ampliado aos arquivos de UI novos e aos tocados (escopo literal, âncora
  **recontada com a própria régua**, e a régua de token exato para `motion-reduce:data-[state=…]`);
  `regraDePedidoSoNoCore` com a âncora recontada.
- **Where**: `apps/mobile-adm/src/shared/lib/__tests__/{fraseDaAcaoSoNoCore,movimentoDosPedidos,regraDePedidoSoNoCore}.test.ts`
- **Depends on**: T26
- **Done when**: `fraseDaAcaoSoNoCore` sem allowlist acusa as cinco formas (`Não consegui salvar`,
  `por e-mail`, `aviso de postagem`, `mudou enquanto`, `Rastreio salvo`) em qualquer literal de
  produção do app (string, JSX, template); âncora positiva (as cinco existem em
  `packages/core/src/orders/appAction.ts`, lido do disco) e âncora de arquivos lidos recontada;
  inversos: `ACCESS_UNCHECKED` por extenso e o rótulo "E-mail" **não** são acusados; sensores CRLF/LF;
  dentro de comentário (`//`, `/* */`, glob de dois asteriscos) **não** é acusado; `mutar()` lança sem
  alvo; o cabeçalho **descreve** a forma proibida sem escrevê-la; `movimentoDosPedidos` com os seis
  arquivos novos e a nova âncora de tokens/pares medida, e o sensor de que `motion-reduce:animate-none`
  sozinho, ao lado de `data-[state=open]:animate-in`, **reprova**; Full gate + Build gate (fecho da
  fase).
- **Reqs**: `MAA-29` (`MAP-49` vale), `MAA-34`, A11/`AD-008` (guarda).
- **Tests**: guarda · **Gate**: build
- **Status**: ✅ **Feita** (2026-10-24). `shared/lib/__tests__/fraseDaAcaoSoNoCore.test.ts` (7, pela AST:
  string, cada pedaço de template e texto de JSX; comentário fora por construção): âncora de arquivos
  (≥ 100, os seis componentes nomeados, > 500 literais lidos); âncora POSITIVA (as cinco formas existem em
  `core/orders/appAction.ts`, lido do disco); nenhuma ocorrência no app, sem allowlist; sensores LF/CRLF
  em string, template, JSX texto e atributo; comentário `//`, `/* */` e glob de dois asteriscos não
  acusados; inversos (`ACCESS_UNCHECKED` por extenso e "E-mail"); a frase escrita à mão no `RodapeDaAcao`
  real seria acusada; `mutar()` lança sem alvo. O cabeçalho descreve as formas sem escrevê-las.
  `movimentoDosPedidos.test.ts`: escopo 21 → **28** (os seis da `75` e o `MobileLayout`); a régua passou
  a ver a variante de estado (`data-[state=open]:`) e só a cobre com o par do MESMO estado; nova régua
  exigindo os dois pares por token exato em todo arquivo que monta `SheetContent`; âncora recontada com a
  própria régua: **6 tokens, 4 pares** (eram 4/2); sensor: `motion-reduce:animate-none` puro ao lado de
  `data-[state=open]:animate-in` reprova, o par de outro estado também, o do mesmo estado passa (7 → 9
  casos). `regraDePedidoSoNoCore`: âncora 94 → **104** arquivos (piso 90 → 100, os seis componentes
  nomeados), verde.
- **Gate da Fase 4 (Build, 2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000`
  sem o `--`)**: core **4206/166** (exit 0, igual), mobile-adm **1048/75** (exit 0; entrada da fase
  922/68, **+126/+7**: `AvisoDaAcao` 8, `alturas` 7, `FolhaDoRastreio` 19, `useAcaoDoPedido` +5,
  `acoesDoPedido` 73, `whatsapp` 2, `useRecusaDaAcao` 3, `fraseDaAcaoSoNoCore` 7, `movimentoDosPedidos`
  +2 — nenhuma asserção existente tocada), store **5885/320** (exit 0, igual), backoffice **3696/212**
  (exit 0, igual). `tsc`: 0 em mobile-adm (app e node), store (app e server) e backoffice; `packages/core`
  **11**, os herdados. Lint: mobile-adm 0/0, backoffice 23/5, store 2/2 — sem regressão.
  `pnpm --filter @estrelinha/mobile-adm build` e `… backoffice build` exit 0 (as classes arbitrárias de
  `alturas.ts` e os pares `motion-reduce:data-[state=…]` conferidos no CSS do `dist`).
  `git diff --name-only feature/mobile-adm -- packages/core/src/payment` vazio.
  **Sensor do autor (Fase 4)**: 30 mutantes (M75-01..M75-30) nos arquivos reais (aviso, folha, rodapé,
  cartão, "Informar/Alterar", lembrete, linha, hook, lista, blocos, `useRecusaDaAcao`, `rodape.ts`,
  `MobileLayout`, e os dois guardas), alvo que não existe lança, SHA-256 conferido na restauração: na
  primeira passada **26 mortos por asserção, 4 sobreviventes** — M75-11 (o erro visível com a ação no ar:
  o caso de exclusividade partia sem erro anterior), M75-13 e M75-14 (a recusa da porta fora da vigia: a
  releitura recusada cobria por acidente; o caso que distingue é `not_admin` com o papel AINDA admin) e
  M75-24 (`useRecusaDaAcao` sem a régua da leitura: a remontagem pela vigia apaga o estado). Consertos:
  um caso de exclusividade com erro anterior, dois casos de `not_admin` com papel admin (detalhe e
  cartão) e `useRecusaDaAcao.test.ts`; os quatro reinjetados **mortos por asserção**. Final: **30 mortos
  por asserção, 0 por compilação, 0 sobreviventes** (autor = verificador nesta passada).

### Fase 5 — o fecho

### T28 — `28-acoes-com-client-real`
- **What**: `app/__tests__/acoesComClientReal.test.tsx`: o `<App />` real sobre o supabase-js **real**
  (`clientReal.ts`, `fetch` falso), em `/pedidos/<id>` e pelo cartão de `/pedidos`.
- **Where**: `apps/mobile-adm/src/app/__tests__/acoesComClientReal.test.tsx`
- **Depends on**: T27
- **Done when**: **par** (PATCH devolvendo a linha, RPC `ok`) ⇒ a confirmação aparece (a régua tem
  alvo); PATCH de `orders` devolvendo `[]` com 200 e `atelie_clock` 403 `42501` ⇒ a recusa da `72` e
  **nenhuma** confirmação em nenhum instante lido (o `body` a cada 50 ms do relógio falso), com o
  PATCH de fato enviado; `set_material_status` com `{ ok: false, reason: 'not_admin' }` ⇒ recusa;
  PATCH em 500 ⇒ "Não consegui salvar. Tente de novo.", rota mantida, nunca a recusa; o corpo do PATCH
  sem `shipping_carrier` e a query com `status=in.(separating,shipped)`; sensor no `gravarAcao.ts` real
  (SHA-256 conferido): `nenhuma-linha` tratada como `ok`, rede tratada como recusa, conferência
  apagada — os três mortos por asserção; Full gate.
- **Reqs**: `MAA-21`, `MAA-22`, `MAA-23`, `MAA-04`, Success Criterion 2 (com o probe da T29).
- **Tests**: integração (client real) · **Gate**: full
- **Status**: ✅ **Feita** (2026-10-24). `app/__tests__/acoesComClientReal.test.tsx` (**10**): o
  `<App />` real sobre o supabase-js REAL, pelo rodapé do detalhe **e** pelo cartão da lista
  (`describe.each`): o par (PATCH `[{ id }]` ⇒ "Separação iniciada.", o PATCH com
  `{ status: 'separating' }` e `id=eq.…`/`status=eq.paid`/`select=id` na query, uma linha de histórico);
  PATCH 200 `[]` + `atelie_clock` 403 `42501` ⇒ `/login` com a recusa da `72`, a conferência feita
  (`atelie_clock` chamado de novo), **nenhuma** confirmação e nenhum "mudou" em instante nenhum, nem
  histórico nem `/functions/v1/`; PATCH 500 ⇒ "Não consegui salvar. Tente de novo." no `role="alert"`
  do lugar certo, a rota mantida, nunca a recusa. "Recebi o material": o par (`ok` ⇒ "Material
  registrado.", o corpo da RPC `{ p_order_id, p_status: 'material_recebido' }`, nenhum PATCH) e
  `{ ok: false, reason: 'not_admin' }` ⇒ a recusa, nenhuma confirmação, nenhum aviso. A conferência
  SEM REDE depois do zero linhas ⇒ nem recusa, nem reconferência do papel (`user_roles` igual), nem
  confirmação. "Marcar como enviado": o 1º PATCH `{ tracking_code: 'AN123456789BR' }` sem
  `shipping_carrier`, `status=in.(separating,shipped)` e `select=id`; o 2º `{ status: 'shipped' }` com
  `status=eq.separating`. **"Em nenhum instante"** é lido de duas formas: o `body` a cada 50 ms do
  relógio falso **e** um `MutationObserver` que guarda o texto de todo nó que ENTROU no DOM — a primeira
  passada só com a leitura por passo deixava o mutante "zero linhas = sucesso" passar pelo DETALHE (a
  releitura recusada desmonta a tela no mesmo passo em que a confirmação apareceria). Sem mudança no
  arnês (`clientReal.ts` igual, `clientRealPareado` verde).
  **Sensor no `gravarAcao.ts` real** (harness que lança sem alvo, SHA-256 conferido na restauração):
  M1 `nenhuma-linha` ⇒ `ok` — **morto** (3 casos: a recusa pelo detalhe e pelo cartão, e a rede); M2 a
  rede da conferência ⇒ recusa — **morto** (`user_roles` 2 ≠ 1); M3 a conferência apagada — **morto**
  (a recusa pelo cartão e a rede). **3/3 por asserção, 0 por compilação.** mobile-adm 1048/75 → 1058/76
  (exit 0), `tsc` 0.

### T29 — `29-probe-de-paridade`
- **What**: `probes/01-paridade.ts` (+ `01-fixturas.sql`, `01-limpa.sql`, `01-paridade.saida.txt`):
  supabase-js real contra o banco local, com uma conta admin e uma conta **sem papel com pedidos
  próprios**.
- **Where**: `.specs/features/75-mobile-adm-acoes-do-pedido/probes/`
- **Depends on**: T28
- **Done when**: para cada ação (recebi; separar com e sem material; enviar com código; salvar e
  alterar rastreio de `shipped`; informar de `delivered`; retirado), o mesmo pedido semeado **duas
  vezes** (`P75-…`), um tratado por `runAppAction` com as deps do app e o outro pelo **equivalente** do
  painel (`writeOrderStatus`/`writeTrackingCode`/`writeMaterialStatus` como o hook os chama; "separar
  com material" = `em_producao` + `separating`), termina com as **mesmas** colunas de `orders` (salvo
  `shipping_carrier`, A9, e os ids/timestamps), as mesmas linhas de `order_status_history` (sem id e
  tempo) e os mesmos eventos em `order_notifications`; "Alterar" não gera segundo `order_shipped`; a
  conta sem papel não muda **nenhum** pedido (o dela e o da loja) e recebe `42501` de `atelie_clock`;
  `send-notification` conferido vivo antes (R7), com reinício só nas condições de **TQ3**;
  **a paridade do rastreio é medida com o código da fixtura já normalizado** (o app normaliza e o
  painel não, A8) — declarado no cabeçalho do probe —, e um **par** a mais em que o app recebe
  `' an 123 456 789 br '` e o painel `'AN123456789BR'` termina com o mesmo `tracking_code`, e um
  terceiro em que o painel recebe `' an 123 '` cru e grava diferente, registrado como a **diferença
  esperada** (não como falha); fixturas apagadas, `orders` com a mesma contagem antes
  e depois; a saída gravada com `ok —` por linha; um mutante no dono (o `.select('id')` apagado, ou o
  `expectedFrom` ignorado) faz o probe reprovar (rodado e registrado).
- **Reqs**: `MAA-02`, `MAA-08`, `MAA-13`, `MAA-14`, `MAA-23`, `MAA-38`, Success Criteria 1 e 2,
  `AD-012`, `L-059`.
- **Tests**: probe · **Gate**: —
- **Status**: ✅ **Feita** (2026-10-24). `probes/01-paridade.{sh,ts}`, `01-fixturas.sql` (11 casos × 2
  lados + o pedido da conta sem papel), `01-limpa.sql`, `01-paridade.saida.txt` (**71 `ok —`, `TUDO
  OK`**, `banco restaurado: 54/9 (antes: 54/9)`) e `01-paridade.mutantes.txt`. Casos: recebi; separar
  sem material; separar com material (painel = `em_producao` + `separating`); enviar com código;
  salvar rastreio de `shipped`; salvar e **alterar** de `shipped` (um `order_shipped` só, nos dois
  lados); informar de `delivered`; retirado; o PAR da normalização (app cru × painel normalizado ⇒
  `AN123456789BR` nos dois); a **diferença esperada** (o painel grava `' an 123 '` cru, o app recusa
  sem rede e o pedido fica intacto); `shipping_carrier` nulo no app (A9); a guarda de status (a linha
  velha ⇒ `nenhuma-linha`, nada gravado); e a conta **sem papel com pedido próprio**: o dela e o da
  loja ⇒ `nenhuma-linha`, a RPC do material ⇒ `sem-papel`, os dois pedidos intactos (colunas,
  histórico, eventos), `atelie_clock` ⇒ `42501`. Eventos comparados: `material_received`,
  `order_shipped` (os outros estão desligados no banco local, iguais nos dois lados).
  **A `send-notification` local não estava de pé** (sem container de edge runtime, `baseline.md`): ela
  foi servida por `supabase functions serve --env-file` (chave do Resend **inválida de propósito** — o
  evento é reivindicado e o envio falha com 401, nenhum e-mail sai) a partir do worktree, sem
  `stop`/`start` (TQ3 trata de reiniciar, e não houve reinício), e derrubada no fim da T31 (o gateway
  voltou ao 503 da abertura). Conferida viva antes (R7: `401` sem auth, linha `ok —` do probe).
  **Mutantes no dono** (`status.ts`, SHA-256 conferido): MP1 `.select('id')` apagado ⇒ **10 falhas**
  (02, 03, 04, 08, 09 nos dois lados); MP2 `expectedFrom` ignorado ⇒ **2 falhas** (a guarda). Os dois
  mortos por asserção do probe.

### T30 — `30-gates-e-documentacao`
- **What**: Build gate completo, um workspace por vez; atualizar as baselines do `CLAUDE.md` raiz (com
  o delta por workspace contra `baseline.md`), a linha da `75` em *Workflow de specs* (e a próxima
  livre), os guardas novos na tabela *Os guardas* (`pedidoGravadoSoPeloDono`, `escritaSoPelaPorta`,
  `fraseDaAcaoSoNoCore`, `lembreteNoCore`, a pureza de `order-actions`), o "defeito 01" ganha a linha
  da `75`; `apps/mobile-adm/CLAUDE.md` (ações, porta, trava, folha, aviso), `apps/backoffice/CLAUDE.md`
  (a delegação e o `cancelOrder` no allowlist), `packages/core/CLAUDE.md` (`order-actions`,
  `appAction`, `charge`); a Traceability da `spec.md`; o handoff no `STATE.md` — com as assunções
  `n — confirmar` (A8, A11, A17, A23, A24, Q7, Android real) e, se o Supabase local foi reiniciado a
  partir do worktree (TQ3), a nota de que o próximo `supabase start` deve sair do checkout principal.
- **Where**: `CLAUDE.md`, `apps/{mobile-adm,backoffice}/CLAUDE.md`, `packages/core/CLAUDE.md`,
  `spec.md`, `.specs/STATE.md`
- **Depends on**: T29
- **Done when**: os seis workspaces medidos (exit 0, fora de pipe), tipos 0 nos apps e 11 em core,
  lint sem regressão, `pnpm --filter @estrelinha/mobile-adm build` e `pnpm --filter
  @estrelinha/backoffice build` verdes; `git diff --name-only feature/mobile-adm -- packages/core/src/payment`
  vazio, `rowSummary.ts`/`nextStep.ts` sem diff, nenhuma migration nova; os SHA-256 da T01 dos testes
  do painel conferidos (só `useAdminOrders.test.ts` mudou, e só no dublê); nenhuma queda de contagem
  sem o número reaparecendo do outro lado; documentação com números **medidos**.
- **Reqs**: todos (gate) · `MAA-27`, `MAA-30`.
- **Tests**: none (gate) · **Gate**: build
- **Status**: ✅ **Feita** (2026-10-24, gate final DEPOIS dos consertos B01/B02, um workspace por vez,
  exit fora de pipe, `--testTimeout=20000` sem o `--`): core **4206/166** · mobile-adm **1060/76** ·
  store **5885/320** · backoffice **3696/212** · functions **957/21** · catalog-import **512/23** =
  **16316/818** — **+497/+26** contra a entrada (15819/792): core +190/+8, mobile-adm +249/+15, store
  +33/+1, backoffice +25/+2, functions e catalog-import iguais. **Nenhuma queda.** `tsc` 0 em
  mobile-adm (app e node), store (app e server), backoffice e catalog-import; `packages/core` **11**, os
  herdados. Lint mobile-adm 0/0, backoffice 23/5, store 2/2 — igual à entrada. `pnpm --filter
  @estrelinha/mobile-adm build` e `… backoffice build` exit 0. `git diff --name-only feature/mobile-adm
  -- packages/core/src/payment` vazio; `rowSummary.ts`/`nextStep.ts` sem diff; nenhuma migration nova.
  SHA-256 da T01: `notifyOrder.test.ts`, `orderList.test.ts` e `regrasDoPedidoNoCore.test.ts` iguais;
  `useAdminOrders.test.ts` mudou **só no dublê** (o `update` ganhou `.select`, +3/−1 linhas). Logs em
  `<scratchpad>/g30b/`. Documentação: `CLAUDE.md` raiz (Workflow, baselines, guardas, defeito 01),
  `apps/mobile-adm/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, a
  Traceability da `spec.md` e o handoff do `STATE.md`. O Supabase local **não** foi reiniciado.

### T31 — `31-prova-em-navegador`
- **What**: `prova-navegador.md` + `prova/`: build servido (`vite preview` numa porta livre), Chromium,
  banco local com fixturas `P75-…` (apagadas no fim), em **390×844** (alvo), 360×800, 412×915 e 1440,
  fonte do sistema a 100, 130 e 200 %, os nove itens de §13 do design.
- **Where**: `.specs/features/75-mobile-adm-acoes-do-pedido/{prova-navegador.md,prova/}`
- **Depends on**: T30
- **Done when**, medidos e não supostos: o rodapé fixo sem cobrir o Histórico com a página no fim;
  `scrollWidth == innerWidth` em toda tela tocada; todo alvo novo ≥ 44 px por `getBoundingClientRect`
  e o cartão abrindo o detalhe fora do botão; a folha com `visualViewport` reduzido pelo CDP e o campo
  visível acima do "teclado"; `history.back()` fechando a folha sem mudar `pathname`/`search`, o
  seguinte voltando à lista no mesmo recorte e posição (lista rolada e buscada antes, R8), e F5 com a
  folha aberta; `prefers-reduced-motion` com `getAnimations()` vazio na folha e no aviso (R2); a 130 e
  200 % sem sobreposição e o aviso acima do rodapé e da barra nas três larguras, com e sem rodapé; o
  percurso Início → "Aguardando material" → pedido → "Recebi o material" → confirmação → o número da
  Início caindo, e separar → enviar com código → "Alterar" sem segundo `order_shipped` (consulta ao
  banco); `role="status"` sem tirar o foco e sumindo; o lembrete com o texto byte a byte o do painel
  aberto ao lado; zero hit para fora (`*.supabase.co` bloqueado, intercepção por caminho); o bundle
  servido conferido contra o `dist/`; todo defeito achado ⇒ task `Bxx` com teste antes do conserto, e
  reteste. O Android real (teclado e voltar) fica registrado como **pendente do usuário** (TQ10,
  `n — confirmar`), também no `STATE.md` e no handoff.
- **Reqs**: `MAA-31`, `MAA-32`, `MAA-33`, `MAA-34`, `MAA-35`, `MAA-37` (real), `MAA-18`/`MAA-19`
  (real), Success Criterion 5.
- **Tests**: navegador · **Gate**: —
- **Status**: ✅ **Feita** (2026-10-24) — `prova-navegador.md` e `prova/` (4 capturas, as fixturas
  `P75-N1`..`N6`, o `limpa.sql` e `lembrete-do-painel.ts`). Os nove itens de §13 medidos em 360, 390,
  412 e 1440, fonte 100/130/200 %; banco restaurado (54 · 82 · 22 · 11, sequência 183/true). **Dois
  defeitos achados, B01 e B02**, abaixo, os dois com teste antes do conserto e reteste no navegador.
  **SPEC_DEVIATION de método**: o teclado foi emulado por um `visualViewport` falso instalado antes da
  carga, não pelo CDP. Pendente do usuário: o Android real (TQ10).

---

## Requirement → Task

| Requisitos | Tasks |
| --- | --- |
| `MAA-01` | T04, T23 |
| `MAA-02` | T06, T10, T11, T18, T23, T29 |
| `MAA-03` | T10, T18, T23 |
| `MAA-04` | T10, T16, T23, T28 |
| `MAA-05` | T06, T10, T23 |
| `MAA-06` | T04, T23 |
| `MAA-07` | T11, T23 |
| `MAA-08` | T08, T11, T23, T29 |
| `MAA-09` | T11, T23 |
| `MAA-10` | T05, T22, T23 |
| `MAA-11` | T05, T22, T24 |
| `MAA-12` | T02, T22 |
| `MAA-13` | T09, T11, T22, T23, T29 |
| `MAA-14` | T05, T06, T09, T11, T24, T29 |
| `MAA-15` | T05, T11, T18, T23 |
| `MAA-16` | T04, T05, T23, T24, T26 |
| `MAA-17` | T05, T25 |
| `MAA-18` | T03, T25, T31 |
| `MAA-19` | T03, T25, T31 |
| `MAA-20` | T17, T18, T22, T23, T26 |
| `MAA-21` | T08, T09, T15, T16, T18, T23, T28 |
| `MAA-22` | T08, T16, T18, T23, T28 |
| `MAA-23` | T15, T28, T29 |
| `MAA-24` | T06, T07, T23 |
| `MAA-25` | T23 |
| `MAA-26` | T20, T23 |
| `MAA-27` | T01, T07, T12, T13, T30 |
| `MAA-28` | T03 |
| `MAA-29` | T16, T27 |
| `MAA-30` | T13, T30 |
| `MAA-31` | T21, T23, T24, T31 |
| `MAA-32` | T19, T20, T22, T31 |
| `MAA-33` | T21, T31 |
| `MAA-34` | T21, T22, T27, T31 |
| `MAA-35` | T17, T21, T23, T31 |
| `MAA-36` | T17, T18, T26 |
| `MAA-37` | T18, T26, T31 |
| `MAA-38` | T04, T06, T08, T11, T23, T29 |
| `MAA-39` | T13 |
| `MAA-40` | T11, T18, T23 |
| `MAA-41` | T18, T23 |

**Coverage:** 41/41 mapeados.

---

## Pre-approval checks

### Granularity

| Task | Escopo | Status |
| --- | --- | --- |
| T02, T04, T19 | uma função / um hook | ✅ |
| T03 | um arquivo de `core` + reexport de uma linha + seu guarda `toBe` — mover sem o reexport quebra o painel | ⚠️ OK (coeso) |
| T05, T06 | duas–quatro funções puras da mesma pergunta no mesmo arquivo (`appAction.ts`) | ⚠️ OK (coeso) |
| T07 | scaffold do módulo (package.json, exports, tipos, notificador, pureza) — o notificador é a única função que os tipos já exigem | ⚠️ OK (coeso) |
| T08, T09, T10, T11 | uma função de escrita cada | ✅ |
| T12 | delegação de três funções do mesmo hook + invólucro de uma linha — delegar uma só deixaria o hook com dois donos | ⚠️ OK (coeso) |
| T13, T27 | guardas de fonte | ✅ / ⚠️ OK (T27: três guardas do mesmo escopo, dois só recontam âncora) |
| T14 | o arnês nas suas duas peças (`fakeSupabase` e `clientReal` pareado) | ⚠️ OK |
| T15, T16, T18, T20 | uma função / um hook (T16 com o guarda que o protege) | ✅ |
| T17 | três estados em módulo do mesmo molde, limpos juntos | ⚠️ OK (coeso) |
| T21–T26 | um componente cada (+ o ponto de montagem) | ✅ |
| T28, T29, T30, T31 | uma prova / um gate | ✅ |

### Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | início | ✅ |
| T02..T06 | a anterior | cadeia da Fase 1 | ✅ |
| T07 | T06 | Fase 1 → Fase 2 | ✅ |
| T08..T13 | a anterior | cadeia da Fase 2 | ✅ |
| T14 | T13 | Fase 2 → Fase 3 | ✅ |
| T15..T20 | a anterior | cadeia da Fase 3 | ✅ |
| T21 | T20 | Fase 3 → Fase 4 | ✅ |
| T22..T27 | a anterior | cadeia da Fase 4 | ✅ |
| T28 | T27 | Fase 4 → Fase 5 | ✅ |
| T29..T31 | a anterior | cadeia da Fase 5 | ✅ |

Nenhuma dependência aponta para fase posterior. (T13 exige a metade positiva do app **condicionada**
ao arquivo existir e a T16 a torna incondicional — dependência para trás, não para frente.)

### Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | medição | none | none | ✅ |
| T02, T04, T05, T06 | regra pura de `core` | unit | unit | ✅ |
| T03 | regra pura + reexport do painel | unit + guarda `toBe` | unit + guarda | ✅ |
| T07 | dono da escrita (notificador) + config | unit + build | unit + guarda + `tsc` | ✅ |
| T08–T11 | dono da escrita | unit com dublê registrador | unit | ✅ |
| T12 | delegação do painel | unit + suíte sem asserção tocada | unit + suíte | ✅ |
| T13 | guarda | guarda | guarda | ✅ |
| T14 | arnês | unit | unit | ✅ |
| T15, T16, T17, T18, T19, T20 | porta, estado, hooks | unit | unit (T16 + guarda) | ✅ |
| T21, T22 | UI | componente | componente | ✅ |
| T23–T26 | UI pela árvore | componente pela árvore real | componente pela árvore real | ✅ |
| T27 | guardas | guarda | guarda | ✅ |
| T28 | contrato com o client real | integração | integração | ✅ |
| T29 | semântica contra o banco | probe | probe | ✅ |
| T30 | gate/doc | none | none | ✅ |
| T31 | layout | navegador | navegador | ✅ |

---

## Tools

- **Skills**: `tlc-spec-driven` (Execute + Verificador), `supabase` (T29), `playwright-cli` (T31),
  `qa-report` + `qa-execution` (depois do Verificador).
- **MCP**: `playwright` (T31 e QA). Nenhum MCP de produção (o `supabase` MCP **não** é usado: o banco
  é só o local).

---

## Conserto da prova em navegador (T31)

### B01 — `b01-f5-com-a-folha-deixava-voltar-morto`
- **Defeito** (medido no Chromium, build servido): com a folha aberta, F5, e o primeiro
  `history.back()` ficava em `/pedidos/<id>` — o "voltar morto" que A23 proíbe. Duas causas: (1) o
  `replace` sem o marcador deixa [lista, pedido, pedido], porque abrir a folha EMPURRA por cima da
  entrada do pedido sem marcador; (2) depois de trocar o `replace` pelo voltar, o detalhe monta DOIS
  usuários da folha do mesmo pedido (o rodapé `acao` e a Entrega `entrega`), e os dois voltavam —
  medido: o F5 levava à lista. O teste da T20 passava porque montava o histórico como
  [sentinela, pedido COM marcador], uma forma que o app nunca produz.
- **Teste antes do conserto**: `useFolhaNoHistorico.test.tsx` — o caso do F5 reescrito sobre o
  histórico REAL [sentinela, pedido, pedido COM marcador] (as asserções de antes, iguais; reprovou:
  "expected '/pedidos/…' to be '/sentinela-7'"), e um caso novo com os DOIS usuários montados, régua
  `history.go` chamado UMA vez (`[[-1]]`; reprovou com `[[-1],[-1]]` — no jsdom as duas voltas caem na
  mesma entrada, no Chromium se somam).
- **Conserto**: `useFolhaNoHistorico.ts` — no F5, `navigate(-1)` (a entrada do marcador sai) em vez do
  `replace`, e só o usuário cuja ORIGEM é a do marcador (`<id>:<origem>:`). `SPEC_DEVIATION` no
  arquivo: A23/§3.8 pedem `replace` **e** "sem voltar morto"; as duas não cabem juntas, vale o desfecho.
  `semMarcador` saiu (sem uso).
- **Sensor**: MB1 (a volta apagada) e MB2 (o `replace` de volta) reinjetados, SHA-256 conferido —
  mortos por asserção.
- **Reteste** no build servido (`index-BrKq-eNc.js`): F5 com a folha ⇒ sem folha, mesma URL; o
  primeiro voltar ⇒ `/pedidos?visao=tudo`; o voltar sem F5 continua fechando a folha e o seguinte
  voltando à lista.
- **Status**: ✅ fixed e retestado. **n — confirmar** (o mecanismo diverge da letra de A23).

### B02 — `b02-fundo-da-folha-animava-com-menos-movimento`
- **Defeito** (medido): com `prefers-reduced-motion: reduce`, `document.getAnimations()` listava UMA
  animação ao abrir e ao fechar a folha — o `fade` do FUNDO (`SheetOverlay`), que o `SheetContent` de
  `packages/ui` monta por dentro sem receber classe. O design (§13, item 5) mede por `getAnimations()`
  vazio; a T22 tinha registrado que, se o fundo contasse, seria `Bxx`.
- **Teste antes do conserto**: `FolhaDoRastreio.test.tsx` — o fundo (`bg-black/80`, `data-state=open`,
  sem `role="dialog"`) com os dois pares `motion-reduce:data-[state=open|closed]:animate-none` por
  token exato (reprovou).
- **Conserto**: `packages/ui/src/sheet.tsx` ganhou `overlayClassName?` (opcional e aditivo — sem ele
  o fundo é o de sempre; store e backoffice verdes sem tocar em nada), e a `FolhaDoRastreio` passa os
  dois pares. `movimentoDosPedidos`: âncora recontada com a própria régua (6/4 → **8/6**; os pares da
  folha passam a ser dois de cada estado).
- **Reteste** no build servido (`index-NrbxY9IQ.js`): `reduce` ⇒ **0** animações ao abrir e ao fechar a
  folha, e 0 na confirmação; sem preferência, as duas de sempre.
- **Status**: ✅ fixed e retestado.

Depois dos dois: mobile-adm **1058/76 → 1060/76** (+2: o caso dos dois usuários e o do fundo), `tsc` 0,
e o gate final da T30 rodado de novo inteiro.

## Conserto da rodada 1 do Verificador (FAIL por cobertura)

O relatório (`validation.md`) achou duas lacunas e nenhum defeito de produto. Cada uma ganhou o teste que
reprova com o mutante do Verificador, o mutante foi reinjetado no arquivo real (alvo único conferido;
SHA-256 do arquivo conferido na restauração) e morreu **por asserção**, nunca por compilação.

### V01 — `v01-folha-nao-fecha-com-a-gravacao-no-ar` (`MAA-13`, N05 + N25)

- **Lacuna**: "fecha só depois do sucesso" não tinha régua contra o fundo, o Escape e "Agora não" com a
  gravação no ar. Tirar o `!acao.travado` do `onOpenChange` ou do `onClick` de "Agora não" deixava a
  suíte inteira verde.
- **Teste** (`features/order-actions/ui/__tests__/FolhaDoRastreio.test.tsx`, +5): com a porta pendente,
  um caso por gesto — Escape, toque no fundo, "Agora não" — cobrando a folha aberta, "Salvando…" e
  `aria-disabled`; e, no mesmo caso, a folha fechando depois de a porta resolver com sucesso. Um caso por
  gesto porque os dois caminhos de código são distintos (o `onOpenChange` e o `onClick`): o mutante de um
  não pode ser morto pelo caso do outro. Mais os inversos (`it.each`): sem gravação no ar, o Escape e o
  fundo FECHAM — sem eles, os três casos seriam verdadeiros com o gesto inerte no jsdom.
- **Conserto**: nenhum no produto — o código estava certo, faltava a prova.
- **Mutantes**: N05 (`if (!abrir) fechar()` no `onOpenChange`) ⇒ **2 casos reprovam** (Escape, fundo);
  N25 (`fechar()` sem a trava em "Agora não") ⇒ **1 caso reprova** ("Agora não"). Os dois por
  `toBeInTheDocument()`; SHA-256 ok nas duas restaurações.
- **Status**: ✅ fixed.

### V02 — `v02-guarda-de-status-acusa-a-comparacao` (`MAA-29` / `MAP-49`, M45)

- **Lacuna**: o design (§3.1 e §8.3) e o cabeçalho de `packages/core/src/orders/appAction.ts` afirmavam
  que `regraDePedidoSoNoCore` acusa "qualquer condição sobre `status`" no app; o guarda só via mapas,
  `case` e predicados de recorte, e `&& pedido.status !== 'cancelled'` no `RodapeDaAcao` passava.
- **Conserto pela causa**: o guarda ganhou a régua 3, `COMPARACAO_DE_ESTADO` — uma coluna de estado
  (`status`, `payment_status`, `material_status`, `payment_method`) comparada por `===`/`!==`/`==`/`!=`
  a um literal do vocabulário DAQUELA coluna (importado de `core`: `ORDER_STATUS_LABELS`,
  `ORDER_PAYMENT_STATUS_LABELS`, `MATERIAL_STATUSES`, `PAYMENT_METHOD_LABELS`), nos dois sentidos, com
  fronteira `[\w$]` (`customer_status` não casa). Cada coluna só com o próprio vocabulário: é o que deixa
  o `PromiseSettledResult.status === 'rejected'` de `lerComPapel.ts` passar (`rejected` é status de
  pagamento, nunca de pedido). As duas afirmações foram reescritas para o alcance real, com o que fica
  de fora declarado (`includes`/`in`, literal guardado em variável).
- **Teste** (`shared/lib/__tests__/regraDePedidoSoNoCore.test.ts`, 25 → 40, +15): 8 sensores
  (a forma exata do M45, `===`, `?.`/`==`, literal à esquerda, `payment_status`, `material_status`,
  `payment_method`, o nome solto depois de desestruturar), 6 inversos (`'rejected'`/`'fulfilled'` do
  `PromiseSettledResult`, `customer_status`, comparação com variável, com número, com `tipo`), a âncora
  do vocabulário por coluna (não vazio; `rejected` FORA do de `status`) e uma âncora que lê as linhas
  REAIS de `lerComPapel.ts` com `.status === 'rejected'` e prova que a régua as deixa passar. Antes do
  conserto, o sensor do M45 reprovava (a régua não existia).
- **Mutante**: M45 (`const temBotao = primaria.action !== 'nenhuma' && pedido.status !== 'cancelled'` no
  `RodapeDaAcao.tsx`) ⇒ o caso "nenhum arquivo de produção do app declara … comparação de estado"
  reprova com `AssertionError` (o achado nomeia `RodapeDaAcao.tsx`); SHA-256 ok na restauração.
- **Status**: ✅ fixed.

**Medido depois dos dois** (2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000`
sem o `--`): mobile-adm **1060/76 → 1080/76** (+20: +5 da folha, +15 do guarda), core **4206/166**,
store **5885/320**, backoffice **3696/212** — os três iguais (`appAction.ts` mudou só no comentário).
`tsc` do mobile-adm 0; eslint do mobile-adm 0/0. Arquivos tocados: os dois testes,
`packages/core/src/orders/appAction.ts` (comentário), `design.md` (§3.1, §8.3) e este `tasks.md`.

## Conserto do QA

Cada bug do ciclo de QA (`docs/qa/bugs/`) vira uma task aqui, com teste que reprova antes, conserto pela causa,
o defeito reinjetado no arquivo real (alvo único; SHA-256 conferido na restauração) e a morte por asserção.

### C01 — `c01-tentar-de-novo-diz-falha-sem-tentar` (`MAA-40`, `MAA-21`, `MAA-22`; `BUG-20261024-tentar-de-novo-diz-falha-sem-tentar`)

- **Defeito**: "Iniciar separação" com o material na bancada; o status afeta ZERO linhas porque outra escrita
  levou o pedido adiante (outra aba a `separating`, ou o painel a `cancelled`). A frase parcial e o "Tentar
  de novo" aparecem (letra de `MAA-40`); tocar "Tentar de novo" NÃO ia à rede e dizia "Não consegui salvar.
  Tente de novo." — falha de rede inventada, num laço sem saída.
- **Causa**: a retentativa guardada era `{ tipo: 'primaria' }`, sem dizer o que reenvia. Sobre a linha
  relida, `appPrimaryAction` dava `folha` (ou `nenhum`), e `runAppAction` devolvia `semRede` ⇒ `falhou` ⇒
  `ACTION_FAILED`. O edge case da spec ("a retentativa só grava o status se a ação ainda for `separar`")
  não estava em regra nenhuma. **Pior, achado pelo mutante M1**: com um pedido de RETIRADA relido em
  `separating`, a mesma retentativa caía no plano `status` e gravaria `delivered`.
- **Teste que reprovou antes** (`pages/__tests__/acoesDoPedido.test.tsx`, +2, `it.each` sobre o `<App />`
  real, o dono e a porta de verdade): a parcial por zero linhas com a linha relida em `separating` e em
  `cancelled`; o "Tentar de novo" ⇒ zero RPC, zero escrita em `orders`/`order_status_history`, zero
  invocação, "Este pedido mudou enquanto você olhava." sem "Tentar de novo". Antes do conserto: os dois
  reprovaram com `Received: Não consegui salvar. Tente de novo.`
- **Conserto pela causa (em `core`, o dono)**: `PedidoDaAcao` primária ganhou `espera?: AppActionId` — a
  ação que a retentativa reenvia — e `AppActionOutcome` ganhou `{ tipo: 'mudou' }`. `runAppAction`: com
  `espera` e a linha relida oferecendo outra ação ⇒ `mudou`, sem ir à rede (a linha relida É a resposta do
  banco; o toque normal, sem `espera`, continua `falhou` como antes). O hook guarda a retentativa de
  `PARTIAL_MATERIAL` como `{ tipo: 'primaria', espera: 'separar' }`; `erroDe` já desenhava `mudou` como
  `ORDER_CHANGED` sem retentativa; a porta repassa `mudou` como veio (comentário atualizado).
- **Testes de unidade**: `core/order-actions/__tests__/appAction.test.ts` +4 (`espera` com a linha ainda
  `separar` grava só o status; `mudou` sem rede para `separating`, `cancelled` e `separating` de retirada);
  `useAcaoDoPedido.test.tsx`: a régua do `parcial` do material passou a exigir `espera: 'separar'`
  (apertada, não afrouxada).
- **Mutantes** (alvo único, SHA-256 ok nas três restaurações, todos mortos por `AssertionError`):
  M1 a guarda desligada (`&& false`) ⇒ 3 casos de core + 2 da página; M2 a retentativa sem `espera` no hook
  ⇒ 2 da página + 1 do hook; M3 `mudou` trocado por `semRede` ⇒ 3 de core + 2 da página.
- **Fica para decisão (não implementado)**: a frase parcial da PRIMEIRA resposta continua sendo a de
  `MAA-40` também quando a causa é zero linhas — a letra da AC a pede ("ou afeta zero linhas sem recusa de
  papel"). Trocá-la por `ORDER_CHANGED` quando a linha relida já está em `separating` é decisão de spec
  (nota (b) do bug). Hoje: a frase parcial com "Tentar de novo", e o toque leva a "o pedido mudou" — uma
  saída de um passo, sem rede inventada.
- **Medido** (2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`):
  mobile-adm **1082/76**, core **4210/166**, store **5885/320**, backoffice **3696/212** — todos verdes.
  `tsc`: mobile-adm 0, backoffice 0, store 0, core 11 (herdados). eslint dos arquivos tocados do app: limpo.
- **Status**: ✅ fixed.

### C02 — `c02-folha-afirma-aviso-que-falhou` (A10, `MAA-11`, A11, `AD-008`; `BUG-20261024-folha-afirma-aviso-que-falhou`)

- **Defeito**: com o `order_shipped` em `failed` (o histórico, na mesma tela, diz "Falha ao enviar o aviso:
  Pedido postado (E-mail)"), "Alterar" da Entrega em `shipped` abria a folha dizendo "A cliente já recebeu o
  aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail." — as duas metades
  falsas: ela não recebeu, e cada "Alterar" REENVIA o aviso falho (`attempts` 1 → 3 com dois "Alterar").
- **Causa**: `trackingSheet` escolhia a frase 2 só pelo par (status, código), a letra de A10. A regra não
  tinha como saber se o aviso saiu, embora o detalhe já lesse `order_notifications` para o histórico.
- **Testes que reprovaram antes** (4): `core/orders/__tests__/appAction.test.ts` (a frase NEUTRA com o aviso
  falho e sem contexto; `shippedNoticeSent` inexistente), `FolhaDoRastreio.test.tsx` (a folha de "shipped com
  código" sem saber do aviso, e com ele falho) e `pages/__tests__/acoesDoPedido.test.tsx` (pelo `<App />`
  real: `order_notifications` com o `order_shipped` em `failed` ⇒ "O código aparece no pedido dela." e nada
  de "já recebeu"; o par em `sent` ⇒ a frase 2). Antes do conserto: reprovaram pedindo a frase neutra e
  recebendo a frase 2.
- **Conserto pela causa (em `core`, o dono)**: `shippedNoticeSent(rows)` (o `order_shipped` em `sent`) e
  `trackingSheet(row, origem, contexto?)` com `TrackingSheetContext.avisoDePostagemSaiu`: a frase 2 só com
  `true`; falho, pendente, ausente ou desconhecido ⇒ a frase neutra de `delivered` (não promete nem nega).
  O detalhe (`usePedido`) calcula `avisoDePostagemSaiu` das MESMAS linhas do histórico (`false` se a leitura
  falhou); `PedidoPage` → `EditarRastreio` → `useFolhaNoHistorico(row, origem, aviso)`. O `modo` e a chave
  da folha não mudam (`MAA-26` intacto). A confirmação continua sem citar e-mail no "Alterar" (o padrão de
  cada ausência é não prometer). SPEC_DEVIATION em A10, declarado em `appAction.ts`.
- **Testes novos**: core +9 (neutra com falho e sem contexto; as outras quatro folhas iguais com e sem o
  aviso; `shippedNoticeSent` em sent, quatro estados não-enviados, outro evento e vazio); mobile-adm +7
  (folha +2, página +2, `usePedido` +3 — e a régua de forma do resultado ganhou o campo).
- **Mutantes** (alvo único, SHA-256 conferido em cada restauração, todos mortos por asserção, nenhum por
  compilação): M1 o defeito reinjetado (frase 2 só por status/código) ⇒ core 2 + app 4; M2
  `shippedNoticeSent` ignorando o status ⇒ core 4 + app 1; M3 o detalhe afirmando sempre ⇒ app 2 (página e
  folha) + 2 (`usePedido`); M4 a página sem passar o aviso ⇒ app 1; M5 o hook sem repassar ⇒ app 2.
- **Medido** (2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`):
  mobile-adm **1089/76**, core **4219/166**, store **5885/320**, backoffice **3696/212** — todos verdes.
  `tsc`: mobile-adm 0, store 0, backoffice 0, core 11 (herdados). eslint dos arquivos tocados do app: limpo.
- **Status**: ✅ fixed (aguarda reteste em navegador).

### C03 — `c03-folha-fecha-e-foco-cai-no-body` (`MAA-32`, `MAA-35`, charter CH-acoes-com-leitor-de-tela; `BUG-20261024-folha-fecha-e-foco-cai-no-body`)

- **Defeito**: a folha do rastreio abre com o foco no campo, mas ao fechar — "Agora não", Escape, o voltar
  do navegador ou depois de "Salvar" com sucesso — `document.activeElement` ficava no `<body>`. Com leitor
  de tela, o próximo gesto recomeçava do topo da página, longe do rodapé de onde a folha saiu.
- **Causa**: `FolhaDoRastreio` é um `<Sheet>` controlado, sem `SheetTrigger` (quem abre é
  `controle.abrir()`, do rodapé, do cartão ou de "Informar/Alterar"). No fechar, o `DialogContent` do
  Radix tenta focar o gatilho que ele conhece e marca o evento como tratado; sem gatilho registrado, nada
  é focado e o foco cai no `<body>`. Não havia `onCloseAutoFocus`.
- **Teste que reprovou antes** (`FolhaDoRastreio.test.tsx`, +5, o hook e a ação reais, a porta dublada):
  o controle de origem focado antes de abrir (como o teclado e o TalkBack focam); um caso por caminho de
  fechar — "Agora não", Escape e `history.back()` — e um depois de "Salvar" com sucesso, todos exigindo o
  foco no controle que abriu; e o caso em que o controle SAI da tela com a folha aberta (o rodapé some
  quando o envio é salvo) exigindo o foco no título da página (`main h1`, `tabindex="-1"`). Antes do
  conserto: os 5 reprovaram com `expected <body …>`.
- **Conserto pela causa**: `onOpenAutoFocus` (o Radix o chama antes de mover o foco) guarda
  `document.activeElement` como quem abriu; `onCloseAutoFocus` cancela o padrão e devolve o foco a ele,
  por qualquer caminho de fechar. Se ele já não está no DOM, o ponto estável é o `h1` do `<main>` (recebe
  `tabindex="-1"` se não tiver: focável por script, fora da ordem do Tab). `focus({ preventScroll: true })`:
  devolver o foco não rola a página. Só `FolhaDoRastreio.tsx` mudou — `packages/ui` intocado.
- **Mutantes** (alvo único, SHA-256 conferido nas quatro restaurações, todos mortos por `AssertionError`,
  nenhum por compilação): M1 o defeito reinjetado (sem devolver o foco) ⇒ 5; M2 sem o ponto estável ⇒ 1;
  M3 sem guardar quem abriu ⇒ 4; M4 sem conferir `isConnected` ⇒ 1.
- **Medido** (2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`):
  mobile-adm **1094/76** (+5), store **5885/320**, backoffice **3696/212** — todos verdes. `tsc` do
  mobile-adm 0; eslint dos dois arquivos tocados: limpo.
- **Fica para o reteste em navegador**: o mesmo percurso do bug em 390×844 (P75-N2 e P75-N3), e com o
  TalkBack/teclado confirmar que a posição de leitura fica no rodapé.
- **Status**: ✅ fixed (aguarda reteste em navegador).

### C04 — `c04-botao-do-cartao-sem-o-pedido-no-nome` (`MAA-36`, Q5, charter CH-acoes-com-leitor-de-tela; `BUG-20261024-botao-do-cartao-sem-o-pedido-no-nome`)

- **Defeito**: na lista, o botão da ação de cada cartão tinha como nome acessível só o rótulo ("Recebi o
  material", "Iniciar separação"…). No recorte "Aguardando material" (24 pedidos) são ~20 botões
  idênticos: quem navega por botões no TalkBack não sabe em qual pedido vai gravar.
- **Causa**: o botão é IRMÃO do `<Link>` da linha no `<li>` (Q5, interativo não se aninha), e o nome do
  pedido ("Pedido #0244, Marina Duarte", `MAP-19`) estava só no `aria-label` do link — nada nomeava o
  botão além do texto visível. O nome do pedido era uma função privada de `LinhaDoPedido.tsx`.
- **Teste que reprovou antes** (`pages/__tests__/acoesDoPedido.test.tsx`, +2, pelo `<App />` real em
  `/pedidos`): dois cartões com a mesma ação ⇒ cada botão tem o nome `Recebi o material, Pedido #0244,
  Marina Duarte` / `…#0245, Lúcia Prado`, e o texto visível continua só o rótulo; com a trava do pedido,
  o nome acompanha o texto visível (`Salvando…, Pedido #0244, Marina Duarte`). Antes do conserto: os 2
  reprovaram em `toHaveAccessibleName`.
- **Conserto pela causa**: `nomeDaLinha` saiu de `LinhaDoPedido.tsx` para
  `entities/order/model/nomeDaLinha.ts` (um dono, exportado pelo barrel; o link continua o lendo), e
  `BotaoDaAcao` ganhou `aria-label` = o texto visível PRIMEIRO (rótulo dentro do nome, WCAG 2.5.3) +
  `nomeDaLinha(linha)`. O rodapé do detalhe não muda: lá o `h1` já diz o pedido.
- **Mutantes** (alvo único, SHA-256 conferido nas três restaurações, todos mortos por asserção, nenhum
  por compilação): M1 o defeito reinjetado (sem `aria-label`) ⇒ 2; M2 o nome com o rótulo da ação em vez
  do texto visível (diverge na trava) ⇒ 1; M3 o pedido antes do rótulo ⇒ 2.
- **Medido** (2026-10-24, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--`):
  mobile-adm **1096/76** (+2), store **5885/320**, backoffice **3696/212** — todos verdes. `tsc` do
  mobile-adm 0; eslint dos cinco arquivos tocados: limpo.
- **Fica para o reteste em navegador**: a árvore de acessibilidade de `/pedidos?bloco=aguardando` em
  390×844 — cada botão com o pedido no nome.
- **Status**: ✅ fixed (aguarda reteste em navegador).
