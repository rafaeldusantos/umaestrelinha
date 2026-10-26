# 79 — mobile-adm: aviso de pedido no celular — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto e do orquestrador, acima da Skill** (`CLAUDE.md` raiz, `BL-012`):
> **nenhum** commit por task. Os commits saem juntos na etapa COMMIT do orquestrador, que pede a
> aprovação do usuário. Sub-agentes não fazem commit, nem `git stash`/`checkout`/`reset`/`merge`.
>
> **Branch** (`AD-056`): a feature roda na branch `feat/79-mobile-adm-aviso-de-pedido`, criada de
> `feature/mobile-adm` na T01 (`git switch -c`, que não é commit). Finalizada e testada, ela é
> mergeada em `feature/mobile-adm`, nunca na `master`.
>
> **Pasta**: o orquestrador chama a feature `81-79-mobile-adm-aviso-de-pedido`; é um link simbólico para
> `.specs/features/79-mobile-adm-aviso-de-pedido`. Os arquivos moram uma vez só.
>
> **Banco e functions**: só o local (faixa 54440–54449). **Uma migration** (T06), aplicada **só no
> local** com `supabase migration up`. **Nunca** `supabase db reset`, `supabase stop --all`, `db push`,
> `secrets set` ou `functions deploy`. As chaves VAPID de dev vão no `.env` da raiz (gitignored), geradas
> na T02; **nenhuma chave entra no repositório**. Fixturas de probe identificadas (`P79-…`) e **apagadas**
> no fim, conferindo as contagens de `orders`, `order_notifications` e `push_subscriptions` antes e
> depois. Portas 8082–8084 são de outras sessões: a prova usa `vite preview` numa porta livre.
>
> **Mutantes**: editar no lugar e restaurar conferindo **SHA-256**; o arnês **lança** quando a string
> alvo não existe; separar morte por asserção de morte por compilação.
>
> **O Design manda** (`design.md`, aprovado na r3). Onde a spec e o design divergem em forma, vale o
> design (as emendas da §4.6 já estão na spec). Uma task só está feita quando os `MAN-xx` que ela cita
> têm a asserção que o "Done when" pede.
>
> **`strictNullChecks` é `false`**: veredito com motivo é `string | null`. **Todo especificador
> relativo em `packages/core` e no grafo das functions leva `.ts`**, `import type` incluso — e
> **nenhum comentário escreve um import proibido por extenso** (o bundler do `supabase start` o lê).

---

**Spec**: `spec.md` (42 requisitos, `MAN-01`..`MAN-42`) · **Design**: `design.md` (`AD-062`, proposta)
**Status**: Draft

---

## Decisões do portão de Tasks

| Id | Decisão | Confirmação |
| --- | --- | --- |
| **TQ1** | **29 tasks em 6 fases, empacotadas em 5 lotes sequenciais** (Execution Plan). Verificador e QA depois do Lote 5 | fechada |
| **TQ2** | **O risco da biblioteca vem primeiro** (T02): antes de qualquer código que dependa dela, um probe prova que o edge runtime local resolve `jsr:@negrel/webpush@0.5.0`, que as chaves exportadas reimportam, que o pedido sai com `Content-Encoding: aes128gcm` e `Authorization: vapid`, que o corpo **decifra** de volta para o texto (decifração RFC 8291 escrita no próprio probe com WebCrypto) e que um `410` vira `isGone()`. Se qualquer passo falhar, o executor **para** e devolve a escolha da biblioteca ao Design | fechada |
| **TQ3** | **Ordem: `core` → banco → motor e porta → o app por baixo → a tela e o SW → fecho.** O motor antes do app porque a porta é o contrato que o app consome | fechada |
| **TQ4** | **O adaptador da biblioteca é dividido em dois arquivos** para caber no vitest: `_shared/pushOutcome.ts` (puro: status → `PushOutcome`, a corrida com o prazo) com teste, e `_shared/webPush.ts` (o único que importa `jsr:`), fino, provado pelo probe da T02 e pela prova da T28. Detalhe de forma, dentro do design (§4.2, R3) | fechada |
| **TQ5** | **A prova do aviso chegando** é feita no **Chrome de desktop real** (o `claude-in-chrome`, com inscrição de verdade no FCM, que é `fcm.googleapis.com`, da lista), com a `send-notification` servida local e o gatilho `payment_approved` disparado num pedido de fixtura. O Chromium headless do Playwright **não** inscreve no FCM | fechada |
| **TQ6** | A prova em **Android real** (a tela de bloqueio, o toque, o host do serviço de push do aparelho, R2 do Design) fica **pendente do usuário**, declarada na `prova-navegador.md`, no `STATE.md` e no handoff, como a TQ10 da `76` | **n — confirmar** |
| **TQ7** | As assunções `n — confirmar` da spec (A5–A17) seguem com a escolha escrita; nenhuma vira código diferente sem o usuário | — |

---

## Test Coverage Matrix

> Gerada do código, do `CLAUDE.md` raiz (*Baselines*, *Os guardas*, *Mobile é o caso principal*, *O
> defeito 01*), de `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, dos
> `vitest.config.ts` dos workspaces e do `tasks.md` da `76` (molde). Lições aplicadas como cautela
> (nenhuma *confirmed*): `L-033`, `L-039`, `L-043`, `L-047`, `L-050`, `L-055`, `L-057`, `L-063`,
> `L-064`, `L-065`, `L-066`, `L-067`; memórias "dublê que não enxerga", "teste não monta a árvore que
> prova", "mutante que morre por compilação".

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Regra pura de `core` (`notifications/push.ts`, `orderStateFailure`, canal e histórico) | unit | todo ramo; 1:1 com as ACs; os textos de `MAN-08` **escritos por extenso** no teste (nunca lidos da constante); a lista de hosts com sensor de cada recusa; `denoReach` com `.ts` | `packages/core/src/notifications/__tests__`, `packages/core/src/orders/__tests__` | `pnpm --filter @estrelinha/core test --testTimeout=20000` |
| Motor (`deliverPush`, `forEvent`, `fireTrigger`) | unit com dublê do client que **registra** tabela, filtro, RPC e argumentos | cada passo 1–10 de §4.2 com caso próprio; `dispatch.test.ts` existente **sem asserção tocada**; fiação provada por **comportamento** pelo handler real | `supabase/functions/send-notification/__tests__`, `supabase/functions/mercado-pago/__tests__` | `pnpm --filter @estrelinha/functions test` |
| Porta `atelie-avisos` | unit (handler com deps injetadas) | toda ação × sucesso, validação, dono errado, 401, 403, `has_role` que erra, 429, 503, `db_error`; corpo nunca ecoa o endpoint | `supabase/functions/atelie-avisos/__tests__` | idem |
| Migration | guarda de fonte (uma régua por comando) + **probe SQL** | forma pela régua; atomicidade, cascata e permissões só pelo probe | `apps/store/src/shared/lib/__tests__`; `.specs/features/79-mobile-adm-aviso-de-pedido/probes/` | suíte da loja; o script do probe |
| Porta, hooks e modelo do app | unit (`renderHook` + dublês de `functions.invoke`, `PushManager`, `Notification`, `serviceWorker`) | tradução de erro com os cinco casos de §4.5; máquina de estados com cada transição; re-entrada (`L-057`) | `apps/mobile-adm/src/features/push-notifications/**/__tests__` | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` |
| UI do app | componente pela árvore **real** (`montarApp` / `<App />`) | caminho feliz + cada edge case + estados **exclusivos** (`L-063`) + nome acessível + alvo 44 por token exato + `motion-reduce:`; foco ao fechar (`L-066`) | `apps/mobile-adm/src/pages/__tests__`, `widgets/account-menu/__tests__` | idem |
| Service worker (`sw-avisos.js`) | unit em `vm` com `self`/`clients`/`registration` falsos | `push` mostra com título, corpo, tag e url; `notificationclick` nos três casos (controlada, `navigate` rejeita, nenhuma janela) e com url externa | `apps/mobile-adm/src/app/__tests__` | idem |
| Contrato com o client real | integração (`clientReal.ts`) | `functions.invoke` 403 + `atelie_clock` 403 `42501` ⇒ recusa; 403 + relógio de pé ⇒ falha; rede ⇒ falha sem conferir | `apps/mobile-adm/src/app/__tests__/avisosComClientReal.test.tsx` | idem |
| Guardas de fonte | guarda (AST onde a régua é de uso) | âncora dupla; sensores CRLF/LF/glob; o inverso | os workspaces dos guardas | o workspace do guarda |
| Semântica contra o banco e a porta servida | probe (supabase-js real, `functions serve` local) | Success Criteria 2 | `probes/` | o script do probe |
| A chegada do aviso, o toque, layout 360/390/412/1440, fonte 100/130/200 % | navegador real (Chrome) | **não alcançável por jsdom** | `prova-navegador.md` | `claude-in-chrome` + Playwright no build servido |
| `package.json`/`exports`/tipos/build | build | `tsc` com os 11 herdados de `core`, zero novos; builds do mobile-adm e do backoffice | — | `npx tsc --noEmit -p …`; `pnpm --filter … build` |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task de um workspace só, sem arquivo novo fora dele | `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (**sem o `--`**), exit code fora de pipe |
| Full | toda task que cria ou move arquivo em `apps/**`, `packages/**` ou `supabase/**` (os guardas da loja varrem os três: `chaveDeServidorForaDoNavegador`, `marcacaoSoPorAcao`, `brandScan`, `numeroDoPedidoComDonoUnico`, `notificationSingleOwner`, `pedidoGravadoSoPeloDono`…) | core + functions + mobile-adm + **store** + backoffice + catalog-import, **um por vez**, mesmo comando, exit code fora de pipe |
| Build | fim de fase e a T27 | Full + `npx tsc --noEmit -p` em `apps/{mobile-adm,store,backoffice}/tsconfig.app.json`, `apps/mobile-adm/tsconfig.node.json`, `apps/store/tsconfig.server.json`, `tools/catalog-import/tsconfig.json` e `packages/core/tsconfig.json` (11 herdados) + `npx eslint .` em mobile-adm, backoffice e store (sem regressão contra a T01) + `pnpm --filter @estrelinha/mobile-adm build` + `pnpm --filter @estrelinha/backoffice build` |

Baseline: a que a **T01** medir (o `CLAUDE.md` raiz diz 17214/866; ele envelheceu nas features
anteriores e não é usado sem remedição).

---

## Execution Plan

```
Fase 1 (entrada, risco e core):          T01 → T02 → T03 → T04 → T05
Fase 2 (banco):                          T06 → T07 → T08
Fase 3 (motor e porta):                  T09 → T10 → T11 → T12 → T13 → T14
Fase 4 (o app por baixo da tela):        T15 → T16 → T17 → T18 → T19 → T20
Fase 5 (a tela e o service worker):      T21 → T22 → T23 → T24
Fase 6 (fecho e prova):                  T25 → T26 → T27 → T28 → T29
                                         → Verificador independente → QA (qa-report + qa-execution)
                                         → bugs ⇒ tasks Bxx (teste antes do conserto) → reteste → Verificador de novo
```

| Lote | Fases | Tasks | Fronteira |
| --- | --- | --- | --- |
| **1 — entrada, risco, `core` e banco** | 1 + 2 | T01–T08 | a biblioteca provada antes de tudo; regras puras; a migration só local |
| **2 — motor e porta** | 3 | T09–T14 | o servidor inteiro; nenhuma tela |
| **3 — o app por baixo** | 4 | T15–T20 | auth, porta do app, arnês, hooks; nenhum componente visível |
| **4 — a tela e o SW** | 5 | T21–T24 | página, menu, service worker, guardas de UI |
| **5 — fecho e prova** | 6 | T25–T29 | client real, probe, gates, navegador, documentação |

O QA anda toda tela tocada em 360, 390 e 412 de largura, com a fonte do sistema a 100, 130 e 200 %.

---

## Tasks

### Fase 1 — entrada, o risco da biblioteca e as regras puras

### T01 — `01-baseline-e-branch`
- **What**: criar a branch `feat/79-mobile-adm-aviso-de-pedido` de `feature/mobile-adm`; medir as seis
  suítes com a árvore parada, `tsc` dos sete projetos e lint dos três apps; contar `orders`,
  `order_notifications` e `user_roles` admin no banco local; gravar o SHA-256 dos arquivos que a `79`
  altera (`dispatch.ts`, `precondition.ts`, `history.ts`, `settings.ts`, `mercado-pago/handlers.ts`,
  `RequireAdmin.tsx`, `LoginPage.tsx` do app, `AccountMenu.tsx`, `gravarAcao.ts`, `pwa.config.ts`,
  `vercel.json` do app).
- **Where**: `.specs/features/79-mobile-adm-aviso-de-pedido/baseline.md`
- **Depends on**: —
- **Done when**: `baseline.md` com os números e exit codes (um workspace por vez, fora de pipe), tipos
  (11 herdados em `core`), lint, as contagens do banco e os hashes; divergência contra o `CLAUDE.md`
  raiz declarada.
- **Reqs**: — (gate de "sem regressão").
- **Tests**: none · **Gate**: —
- **Status**: ✅ Feita (2026-10-25) — branch criada; 17214 testes em 866 arquivos (seis suítes exit 0, igual ao `CLAUDE.md`), tipos 0×6 + 11 herdados em `core`, lint 0/0 · 23/5 · 2/2, banco 78 pedidos / 11 avisos / 3 admins, 11 hashes em `baseline.md`

### T02 — `02-probe-da-biblioteca-de-push`
- **What**: probe Deno que (1) gera chaves com `generateVapidKeys({ extractable: true })` +
  `exportVapidKeys` e as **reimporta** com `importVapidKeys`; (2) cria uma inscrição sintética (par
  ECDH P-256 e `auth` de 16 bytes gerados no probe); (3) chama `pushTextMessage` contra um servidor
  HTTP local que captura o pedido; (4) confere `Content-Encoding: aes128gcm`, `Authorization: vapid
  t=…, k=…`, `TTL` e **decifra** o corpo (RFC 8291, WebCrypto, no próprio probe) de volta ao JSON
  enviado; (5) o servidor responde 410 e o erro é `PushMessageError` com `isGone() === true`, e 429 com
  `isGone() === false`; (6) o mesmo import resolvido dentro de uma function servida por
  `supabase functions serve` (uma function de sonda temporária, **apagada** no fim). Grava as chaves
  de dev geradas no `.env` da raiz (gitignored), nunca no repositório.
- **Where**: `.specs/features/79-mobile-adm-aviso-de-pedido/probes/01-biblioteca.ts` e `probe-01.md`
- **Depends on**: T01
- **Done when**: os seis passos com saída real em `probe-01.md`; a function de sonda apagada (`ls
  supabase/functions` igual ao da T01). **Qualquer passo vermelho para a feature** (TQ2).
- **Reqs**: R1 do Design (risco), base de `MAN-01`, `MAN-04`, `MAN-07`.
- **Tests**: probe · **Gate**: —
- **Status**: ✅ Feita (2026-10-25) — os seis passos verdes (11 asserções ok, exit 0): chaves reimportadas, `aes128gcm`, VAPID ES256 conferido, corpo decifrado igual nos dois runtimes (Deno 2.7.5 e edge runtime 1.77.4), 410 `isGone` e 429/404 não; achado: a lib só chama 410 de gone (o 404 é do adaptador); sonda apagada; chaves de dev no `.env`

### T03 — `03-core-push`
- **What**: `packages/core/src/notifications/push.ts` (§4.1): `PUSH_EVENTS`, `isPushEvent`,
  `pushMessage`, `PUSH_TEST_MESSAGE`, `pushEndpointRefusal`, `pushKeysRefusal`, `pushEventsRefusal`,
  `PUSH_SUBSCRIPTION_LIMIT`, `PUSH_TEST_COOLDOWN_MS`; reexportado pelo barrel.
- **Where**: `packages/core/src/notifications/push.ts`, `index.ts`, `__tests__/push.test.ts`,
  `__tests__/denoReach.test.ts` (estendido) ou o guarda equivalente do módulo
- **Depends on**: T01
- **Reuses**: `formatOrderNumber` (`core/orders/format.ts`), `formatPrice` (`core/formatters/price.ts`),
  `notificationCopyRefusal`
- **Done when**: os quatro textos de `MAN-08` comparados com a frase **inteira** escrita no teste
  (`L-009`), com `#0244` e `R$ 189,00` (centavos); sem `!` e sem emoji pela régua de
  `notificationCopyRefusal`; `PUSH_EVENTS` igual, em ordem, aos quatro `owner_*` de
  `NOTIFICATION_EVENTS`; `pushEndpointRefusal` com um caso por recusa (`http:`, host fora, URL inválida,
  `//`) e um por host aceito; `pushKeysRefusal` com 64/65/66 bytes, prefixo ≠ `0x04`, `auth` 15/16/17;
  `pushEventsRefusal` com repetido, desconhecido, vazio (aceito), não-array; o grafo de `push.ts` com
  `.ts` em todo relativo e sem import de pacote. Quick gate verde.
- **Reqs**: `MAN-08`, `MAN-25`, `MAN-28` (constante), `MAN-31`, `MAN-33` (constante)
- **Tests**: unit · **Gate**: full (arquivo novo em `packages/**`)
- **Status**: ✅ Feita (2026-10-25) — `core/notifications/push.ts` + barril; `push.test.ts` com 47 casos (textos de MAN-08 por extenso com NBSP, hosts, chaves, eventos, grafo Deno com 2 sensores); full gate 6/6 exit 0 (core 4365→4412/175→176, demais idênticos); 6 mutantes, 6 mortos por asserção

### T04 — `04-core-precondicao-de-estado`
- **What**: extrair `orderStateFailure(event, order)` de `preconditionFailure` (§4.1); `preconditionFailure`
  passa a ser `orderStateFailure ?? contato`.
- **Where**: `packages/core/src/notifications/precondition.ts`, `__tests__/precondition.test.ts`
- **Depends on**: T03
- **Done when**: `precondition.test.ts` **sem asserção tocada** (diff do arquivo só com casos novos);
  casos novos: para cada um dos quatro `owner_*`, `orderStateFailure` devolve `null` com o estado
  certo **e** o e-mail da dona vazio, e o slug de estado com o estado errado; `preconditionFailure`
  continua devolvendo `no_owner_contact` com o estado certo e o e-mail vazio. Mutante "o contato dentro
  de `orderStateFailure`" morto por asserção.
- **Reqs**: `MAN-06` (base)
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ Feita (2026-10-25) — `orderStateFailure` extraída, `preconditionFailure` = estado ?? contato; `precondition.test.ts` só com +51 linhas (zero removidas), 33 casos novos; quick gate core 4445/176 exit 0; mutante "contato dentro de `orderStateFailure`" morto por asserção (8+ casos novos reprovam)

### T05 — `05-canal-push-e-historico`
- **What**: `NOTIFICATION_CHANNELS` com `'push'`; `buildHistory`: `rotuloDoCanal('push') = 'Celular'`,
  linha `failed` de push com título `O aviso no celular não chegou.` e **sem** `emailType`/`emailChannel`,
  linha `sent` com `push:X/Y` (X < Y) com detalhe `Entregue a X de Y aparelhos`;
  `HistoryNotificationRow.provider_message_id?`. A porta `send` da `send-notification` recusa
  `channel: 'push'` com 400.
- **Where**: `packages/core/src/notifications/settings.ts`, `packages/core/src/orders/history.ts` e
  testes; `supabase/functions/send-notification/handlers.ts` e teste;
  `apps/backoffice/src/**/OrderHistory*.test.tsx` (caso novo); `apps/mobile-adm/src/entities/order/model/linha.ts`
  (o `select` de `order_notifications`, linhas 29–30, passa a pedir `provider_message_id`) e o teste da
  página do pedido do app
- **Depends on**: T03
- **Done when**: casos de `history`: push enviado (título com `(Celular)`), push parcial (detalhe
  exato), push enviado a todos (sem detalhe de contagem), push falho (título exato, detalhe = `error`,
  `emailType` indefinido), e-mail falho intocado (`A cliente NÃO foi avisada` continua); no **app**, pela
  página real do pedido, uma linha de push parcial mostra `Entregue a 2 de 3 aparelhos` e uma falha
  mostra `O aviso no celular não chegou.` (mutante "sem `provider_message_id` no `select`" morto); no **painel**,
  pela `OrderHistory` real, a linha de push falha **sem** botão "Reenviar" e a de e-mail falha **com**
  (o par, `L-064`); `send` com `channel: 'push'` ⇒ 400 e zero chamadas ao motor; todas as suítes
  antigas de `history` e do painel sem asserção tocada. Full gate.
- **Reqs**: `MAN-09` (histórico), `MAN-34`, `MAN-38`
- **Tests**: unit + componente · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — canal `push` em `NOTIFICATION_CHANNELS`; `buildHistory` com `Celular`, `Entregue a X de Y aparelhos` e a falha própria sem `emailType`; `send` com `channel: push` ⇒ 400 antes de qualquer leitura; o app pede `provider_message_id`. Full gate 6/6 exit 0 (core 4451/176, functions 958/21, mobile-adm 1766/111, store 5908/322, backoffice 3709/214, catalog 512/23); 5 mutantes, 5 mortos por asserção. Desvios declarados: o par do painel mora em `AdminOrderPage.test.tsx` (a página real monta a `OrderHistory` real; não existia `OrderHistory*.test.tsx`), e a única asserção antiga alterada é a lista de colunas de `order_notifications` em `usePedido.test.tsx` — a coluna nova é o requisito

### Fase 2 — o banco

### T06 — `06-migration-avisos-no-celular`
- **What**: `supabase/migrations/20261026120000_79-avisos-no-celular.sql` (§4.4): a tabela, o índice,
  RLS sem policy, `revoke`/`grant`, `claim_push_test` (trava → confere → grava), e o `check` de canal
  recriado. Aplicada no local com `supabase migration up`.
- **Where**: a migration
- **Depends on**: T03
- **Done when**: `supabase migration up` sem erro; `supabase migration list` mostra a nova aplicada no
  local; nenhuma outra migration tocada (`git diff --name-only supabase/migrations`). Prefixo
  `20261026120000` conferido como único entre as migrations do disco.
- **Reqs**: `MAN-23`, `MAN-27`, `MAN-28` (base), `MAN-29`, `MAN-33`, `MAN-42`
- **Tests**: none (provada pela T07 e pela T08) · **Gate**: —
- **Status**: ✅ Feita (2026-10-25) — `20261026120000_79-avisos-no-celular.sql` (prefixo único no disco), aplicada só no local com `supabase migration up --local` (68 de 68); conferido no banco: RLS ligada, 0 policies, `anon`/`authenticated` sem privilégio, `check` de canal com `push`; nenhuma outra migration tocada

### T07 — `07-guardas-da-migration`
- **What**: `pushSubscriptionsSchema.test.ts` novo (uma régua por comando, `mutar()` que lança, o
  `default` e o `check` de `events` iguais a `PUSH_EVENTS` **importado**); `orderNotificationsSchema`
  lendo o `check` de canal **vigente** e provando que o da `42` não é mais o vigente;
  `marcacaoSoPorAcao` com `claim_push_test` na lista literal.
- **Where**: `apps/store/src/shared/lib/__tests__/`
- **Depends on**: T06
- **Done when**: cada régua com sensor por mutação (policy acrescentada, `grant` a `authenticated`,
  `on delete cascade` sumindo, `unique` sumindo, um evento a mais no `check`, a trava sumindo de
  `claim_push_test`, a ordem confere/grava invertida, `search_path` sumindo, escrita de dado); âncora
  (arquivo, tabela, função, constraint). Full gate (a suíte da loja inteira).
- **Reqs**: `MAN-23`, `MAN-27`, `MAN-29`, `MAN-33`, `MAN-42`
- **Tests**: guarda · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `pushSubscriptionsSchema.test.ts` novo (uma régua por comando, `default` e `check` de `events` contra `PUSH_EVENTS` importado, `mutar()` que lança, ordem trava → confere → grava) e `orderNotificationsSchema` lendo o `check` de canal VIGENTE (o da 79) com os dois sensores; full gate 6/6 exit 0 (store 5908/322 → 5952/323, demais iguais à T05); 9 mutantes no arquivo real da migration, 9 mortos por asserção. **SPEC_DEVIATION**: `claim_push_test` NÃO entrou em `marcacaoSoPorAcao` aqui — a régua de RPC é por igualdade com o que a produção chama, e sem chamador ela reprovou (medido); passou para a T13, anotado lá

### T08 — `08-probe-sql-das-inscricoes`
- **What**: probe contra o banco local: `anon` e `authenticated` (admin incluído, pelo PostgREST)
  recusados em `select`/`insert`/`update`/`delete`; `service_role` lê e grava; `unique(endpoint)`;
  `check` de `events`; cascata ao apagar um usuário de fixtura; `claim_push_test` com duas chamadas
  **concorrentes** (duas conexões) ⇒ exatamente uma `true`; dentro de 30 s ⇒ `false`; endpoint de outra
  conta ⇒ `false`; `order_notifications` aceita `channel = 'push'` e recusa `'sms'`.
- **Where**: `probes/02-banco.sql` (ou `.ts`) e `probe-02.md`
- **Depends on**: T07
- **Done when**: cada comportamento com a saída real; fixturas `P79-…` apagadas e contagens iguais às da
  T01.
- **Reqs**: `MAN-23`, `MAN-27`, `MAN-29`, `MAN-33`
- **Tests**: probe · **Gate**: —
- **Status**: ✅ Feita (2026-10-25) — `probes/02-banco.ts` + `probe-02.md`: 20/20 passos verdes em duas execuções (exit 0) — `anon` 401 e `authenticated` (dona e admin) 403 `42501` nas quatro operações e na RPC, `service_role` lê e grava, `unique` 23505, `check` 23514, corrida de `claim_push_test` com a trava segurada (B esperou ~1020 ms e deu `false`) e sem pausa (uma `true`), 30 s por conta, outra conta `false`, canal `push` aceito e `sms` recusado, cascata 2→0; fixturas P79- apagadas, contagens 78/11/0/9 iguais às da T01; o `deno.lock` que os probes gravaram foi devolvido ao `HEAD` e os probes passaram a `--no-lock`

### Fase 3 — o motor e a porta

### T09 — `09-motor-deliver-push`
- **What**: `supabase/functions/send-notification/push.ts`: `PushSender`, `PushOutcome`,
  `deliverPush` com os passos 1–10 de §4.2; o dublê do client ganha o que precisar (`select` com
  `contains`, `delete`, `update`, `rpc('has_role')`) **registrando** tabela, filtro e argumentos.
- **Where**: `send-notification/push.ts`, `__tests__/push.test.ts`, `_shared/testing/**` se o dublê
  precisar
- **Depends on**: T05, T06
- **Done when**: um caso por passo: sem `push` ⇒ `no_provider`; o filtro pede `events` contendo o
  evento (asserção sobre o filtro registrado, "dublê que não enxerga"); dono sem papel ⇒ apagado e não
  enviado; `has_role` que erra ⇒ nem enviado nem apagado; endpoint fora da lista ⇒ apagado; zero
  elegíveis ⇒ `no_device` e **nenhum** `claim`; `claim` nulo ⇒ `already_sent` e zero envios;
  orçamento curto ⇒ `budget_exhausted` com `finish`; 2 de 3 entregues ⇒ `finish` com `p_error = null`
  e `push:2/3`; 0 de 2 ⇒ `p_error` com o resumo; `gone` ⇒ linha apagada e as outras enviadas; `sent` ⇒
  `last_used_at` gravado; linha `push` em `failed` ⇒ o `claim` a devolve de novo e a retentativa envia
  (`MAN-05`, o par de `already_sent`); cada aparelho recebe **exatamente uma** chamada ao `sender` por
  envio, inclusive depois de `failed` (`MAN-07`, sem retentativa interna); o log com **só hosts** (a string do endpoint inteiro ausente de toda linha de
  log); a mensagem enviada é `pushMessage(event, order)` (título e corpo exatos). Mutantes: `p_error`
  com a contagem no parcial, `claim` antes do filtro de elegíveis, `delete` no erro de `has_role` —
  mortos por asserção.
- **Reqs**: `MAN-01`, `MAN-02`, `MAN-04`, `MAN-05`, `MAN-07`, `MAN-09`, `MAN-18`, `MAN-19`, `MAN-20`,
  `MAN-25`, `MAN-26`, `MAN-37`
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `send-notification/push.ts` (`PushSender`, `PushOutcome`, `deliverPush` com os passos 1–10) e `budget.ts` (`MIN_SEND_MS`/`ERROR_MAX_CHARS` saíram de `dispatch.ts` para os dois ramos lerem o mesmo; `SkipReason` ganhou `no_device`); o dublê ganhou, sem mudar desfecho antigo, `reads` (tabela, `select`, `eq`, `contains`, `in`, `order`, `limit`), `.in()` registrado em `update`/`delete`, `rpcByFn` por função dos argumentos e `listErrorByTable`; `push.test.ts` com 25 casos (a fixtura OBEDECE o `contains` lido; a retentativa com a semântica de `claim`/`finish` da `42`). Full gate 6/6 exit 0 (functions 958/21 → 983/22, demais iguais à T07); 3 mutantes, 3 mortos por asserção

### T10 — `10-motor-for-event-em-duas-metades`
- **What**: `dispatch.ts`: `NotificationDeps.push?`; `forEvent` em `forEmail` (o corpo de hoje, mesma
  ordem) + metade push só em `dispatchTrigger` e `isPushEvent`, com `orderStateFailure` própria e
  `try/catch` em volta de `deliverPush` (§4.2).
- **Where**: `send-notification/dispatch.ts`, `__tests__/dispatch*.test.ts`
- **Depends on**: T04, T09
- **Done when**: `dispatch.test.ts` existente **sem asserção tocada**; casos novos: `owner_order_paid`
  com remetente malformado ⇒ o e-mail sai `invalid_from` **e** o push sai (`MAN-06`); com o e-mail da
  dona vazio ⇒ `no_owner_contact` no e-mail e o push sai; com o e-mail desligado ⇒ `disabled` e o push
  sai; estado errado ⇒ nenhum dos dois; `invalid_from` + estado errado juntos ⇒ o e-mail diz
  `invalid_from` (como hoje); `dispatchEvent` (reenvio) de um `owner_*` ⇒ **zero** chamadas de push;
  evento da cliente ⇒ zero chamadas de push; `deliverPush` que lança ⇒ `unexpected_error` em
  `channel: 'push'` e o resultado do e-mail no relatório; a ordem e-mail → push no relatório.
- **Reqs**: `MAN-01`, `MAN-06`, `MAN-19`, `MAN-38`
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `forEvent` = `forEmail` (o corpo de antes, mesma ordem) + `forPush` (só por `dispatchTrigger` e `isPushEvent`, `orderStateFailure` própria, `try/catch` em volta de `deliverPush`); `NotificationDeps.push?`; `dispatch.test.ts` com zero linhas alteradas; `dispatchPush.test.ts` novo com 12 casos (MAN-06 nos três desfechos do e-mail, estado errado, `invalid_from` + estado, reenvio sem push, evento da cliente sem push, ordem e-mail → push, `pix_created`, exceção ⇒ `unexpected_error` com os e-mails no relatório). Full gate 6/6 exit 0 (functions 983/22 → 995/23, demais iguais); 4 mutantes, 4 mortos por asserção. **SPEC_DEVIATION**: sem `push` nas deps a metade push fica FORA do relatório (só o log diz `no_provider`) — `dispatch.test.ts` e `handlers.test.ts` asseveram a lista exata de eventos do gatilho com deps sem push; `deliverPush` chamado direto segue devolvendo `no_provider` (passo 1)

### T11 — `11-fiacao-do-webhook`
- **What**: `mercado-pago/handlers.ts`: `Deps.push?` e o repasse em `fireTrigger`.
- **Where**: `mercado-pago/handlers.ts`, `mercado-pago/__tests__/handlers.test.ts`
- **Depends on**: T10
- **Done when**: pelo handler **real**: webhook de pagamento aprovado com `PushSender` dublê e uma
  inscrição na fixtura ⇒ o dublê chamado com o aviso de `owner_order_paid`; `create-payment` (PIX) ⇒
  com o de `owner_order_received`; webhook repetido ⇒ uma chamada só (o `claim`); os pares sem `push`
  nas `Deps` ⇒ zero chamadas e o e-mail igual; o `push` que lança ⇒ a resposta do pagamento idêntica à
  sem push (`AD-008`). Mutante "sem o repasse em `fireTrigger`" morto por asserção.
- **Reqs**: `MAN-01`, `MAN-05`, `MAN-19`
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `Deps.push?: NotificationDeps['push']` e o repasse `push: deps.push` em `fireTrigger`; 6 casos novos no fim de `mercado-pago/__tests__/handlers.test.ts` (só linhas acrescentadas, 168/0), pelo handler real: webhook aprovado ⇒ aviso de `owner_order_paid` com título e corpo exatos; webhook entregue duas vezes com a memória de `claim`/`finish` ⇒ um aviso; o par sem `push` ⇒ zero leitura de inscrição e e-mail, status e corpo iguais; `push` que lança ⇒ resposta idêntica no webhook e no `create-payment`; `create-payment` PIX ⇒ `owner_order_received`. Full gate 6/6 exit 0 (functions 995 → 1001/23); mutante "sem o repasse" morto por asserção (4 casos)

### T12 — `12-adaptador-web-push-e-fiacao`
- **What**: `_shared/pushOutcome.ts` (puro: status → `PushOutcome`, corrida com o prazo) e
  `_shared/webPush.ts` (`createWebPushSender`, o único `jsr:`); `send-notification/index.ts` e
  `mercado-pago/index.ts` montando `push`; guarda novo `pushSoNoMotor.test.ts`.
- **Where**: `supabase/functions/_shared/`, os dois `index.ts`, `_shared/__tests__/`
- **Depends on**: T02, T11
- **Done when**: `pushOutcome` com 201/404/410/413/429/500/rede/prazo; o guarda: `jsr:@negrel/webpush`
  só em `webPush.ts` (com a versão `0.5.0` exata), `webPush.ts` importado só pelos dois `index.ts`,
  `createWebPushSender(` chamado nos dois, `push_subscriptions` citado só por `send-notification/push.ts`
  (allowlist de um nesta task; a T13 acrescenta `atelie-avisos/handlers.ts` com a âncora dela, para o
  guarda nunca listar um arquivo que ainda não existe);
  `wiringResolve` verde; boot local de `send-notification` e `mercado-pago` por `functions serve`
  respondendo (401 sem header) — o grafo com `jsr:` resolve.
- **Reqs**: `MAN-04`, `MAN-07`, `MAN-37`; R1, R3, R5 do Design
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `_shared/pushOutcome.ts` (puro: `outcomeFromStatus` decide 404/410 ⇒ `gone` pelo STATUS, `outcomeFromError` pelo `response.status`, `attemptWithin` com `Promise.race` ⇒ `failed: timeout`) com 18 casos (201/404/410/413/429/500/400/302, rede, prazo com relógio falso, erro com `isGone()` falso no 404); `_shared/webPush.ts` (`createWebPushSender` devolve `{ sender, applicationServerKey }` ou `undefined` sem as duas envs ou com chave inválida; uma `ApplicationServer` por worker; TTL de 24 h e urgência alta); os dois `index.ts` montam `push`; `pushSoNoMotor.test.ts` (AST, 4 réguas: lib só no adaptador e na versão `0.5.0` exata, adaptador só nos dois `index.ts`, `createWebPushSender(` chamado nos dois, `push_subscriptions` só em `send-notification/push.ts`; âncoras e sensores de CRLF/LF, caminho relativo, chamada × menção). `wiringResolve` verde. `deno check --no-lock` dos dois `index.ts`: o grafo com `jsr:` resolve; os 5 erros restantes são herdados (`core/pricing` e `send-notification/handlers.ts:132`, presentes no `HEAD`). Boot local por `functions serve --env-file .env`: `send-notification` 401 sem header e nenhum `invalid_vapid_keys` no log; **`mercado-pago` 503 `BOOT_ERROR` herdado** (`Failed resolving types` em `@estrelinha/supabase/types`, o mesmo que o `CLAUDE.md` registra desde a `63`) — o grafo dela não é provado por boot local, só por `deno check`. `functions serve` parado, `deno.lock` intocado. Full gate 6/6 exit 0 (functions 1001/23 → 1031/25); 6 mutantes, 6 mortos por asserção

### T13 — `13-porta-atelie-avisos`
- **What**: `supabase/functions/atelie-avisos/handlers.ts` com as seis ações de §4.3; `index.ts` só
  fiação; `config.toml` com `[functions.atelie-avisos] verify_jwt = false`.
- **Where**: `supabase/functions/atelie-avisos/`, `supabase/config.toml`
- **Depends on**: T12
- **Herdado da T07 (SPEC_DEVIATION, 2026-10-25)**: `claim_push_test` entra na lista literal `RPCS` de `marcacaoSoPorAcao.test.ts` (suíte da loja) **nesta task**, junto com a primeira chamada em produção (`atelie-avisos/handlers.ts`). A régua 4 daquele guarda compara por **igualdade** o conjunto chamado em produção com `RPCS`: acrescentar o nome na T07, sem chamador, reprovou a suíte (medido). O `create function` dela já é cobrado por `pushSubscriptionsSchema.test.ts`.
- **Done when**: por ação: sucesso; corpo inválido (400 com slug); sem header (401); sem papel (403);
  `has_role` que erra (403, sem escrita); `config` sem VAPID (503); `status` de endpoint de outra conta
  (`subscribed: false`); `subscribe` de dono novo (eventos = os quatro), do mesmo dono (eventos
  mantidos), de endpoint de outra conta (passa ao chamador, eventos voltam aos quatro — `MAN-27`), a
  11ª (a mais antiga por `last_used_at` sai — `MAN-28`), endpoint/keys recusados (nada gravado);
  `events` com subconjunto válido, inválido, linha de outra conta (404); `unsubscribe` existente e
  ausente (os dois 200); `test` ⇒ `claim_push_test` chamado com o usuário e o endpoint, `false` ⇒ 429,
  `gone` ⇒ apagado e 410, falha ⇒ 502; `db_error` ⇒ 500; **nenhum corpo de resposta contém o
  endpoint**; `corsHeaders` reexportado (`http.test.ts`, `toBe`); `pushSoNoMotor` com a porta; o
  `test` envia `PUSH_TEST_MESSAGE` e **não** escreve em `order_notifications`.
- **Reqs**: `MAN-11`, `MAN-14`, `MAN-15`, `MAN-23`, `MAN-25`, `MAN-27`, `MAN-28`, `MAN-31`, `MAN-32`,
  `MAN-33`, `MAN-36`
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `atelie-avisos/handlers.ts` (as seis ações; `requireAdmin` antes de qualquer leitura em TODA ação; `status` por endpoint com a conta comparada depois; `subscribe` com upsert por `endpoint`, eventos mantidos só para o mesmo dono e o despejo além de 10 por `last_used_at`; `events` escopado por endpoint E conta, 404 fora dela; `unsubscribe` idempotente; `test` lê a linha da conta (404), chama `claim_push_test` (429 `cooldown`), envia `PUSH_TEST_MESSAGE` com prazo de 8 s, `gone` ⇒ apaga e 410, falha ⇒ 502, sem tocar em `order_notifications`), `index.ts` só fiação (`createWebPushSender` dá o `sender` e a chave pública), `[functions.atelie-avisos] verify_jwt = false`; `handlers.test.ts` com 64 casos e a asserção final de que nenhum corpo ecoa o endpoint; `http.test.ts` +1 (`toBe`); `pushSoNoMotor` com a porta nos dois allowlists (3 `index.ts`, 2 donos da tabela); `claim_push_test` na lista literal `RPCS` de `marcacaoSoPorAcao.test.ts` (o herdado da T07). Boot local: 401 sem header e com a anon key; com o JWT do admin de dev, `config` devolve uma chave de 87 caracteres (65 bytes) e `status`/`unsubscribe` 200 — `push_subscriptions` com 0 linhas depois; `functions serve` parado. Full gate 6/6 exit 0 (functions 1031/25 → 1099/26, store 5952 → 5953); 7 mutantes, 7 mortos por asserção

### T14 — `14-secrets-e-configuracao`
- **What**: `config.toml` `[edge_runtime.secrets]` com `VAPID_KEYS`/`VAPID_SUBJECT`; `.env.example`
  da raiz; `supabase-deploy.yml` com o `::warning::` (fora da lista obrigatória, comentário com o
  motivo); `supabase/CLAUDE.md` com a geração das chaves e a ordem de publicação.
- **Where**: os quatro arquivos
- **Depends on**: T13
- **Done when**: `emailCheckWorkflow`, `wiringResolve` e os guardas que leem os workflows verdes;
  nenhuma chave real em arquivo versionado (`git grep` por `"d":` e `VAPID_KEYS=` com valor); o texto
  da ordem de publicação igual ao de `MAN-42`.
- **Reqs**: `MAN-24`, `MAN-37`, `MAN-42`
- **Tests**: none (config; os guardas existentes como gate) · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `config.toml` `[edge_runtime.secrets]` com `VAPID_KEYS`/`VAPID_SUBJECT` (comentário com o modo de falha); `.env.example` com as duas linhas vazias e o aviso de chave privada; `supabase-deploy.yml` fora da lista obrigatória, com `::warning::` por secret ausente e o motivo no comentário; `supabase/CLAUDE.md` (seção "Secrets") com o comando de uma linha que gera as chaves (`deno eval --no-lock`) e a ordem de publicação de `MAN-42` (migration → secrets → functions → bundle do app, com o `{"count":2}` de `BL-044`). Nenhuma chave em arquivo versionado nem não rastreado (varredura por `"d":` e `VAPID_KEYS=` com valor: só prosa e o template do probe). `functions serve` sobe com o `config.toml` novo. Full gate 6/6 exit 0 (`emailCheckWorkflow` 74/74, `sitemapCheckWorkflow`, `wiringResolve` verdes; números iguais à T13). **Build gate da Fase 3**: `tsc` 0 · 0 · 0 · 0 · 0 · 0 e os 11 herdados em `packages/core`; lint 0/0 · 23/5 · 2/2 (igual à T01); builds do mobile-adm e do backoffice exit 0; `deno.lock` intocado

### Fase 4 — o app por baixo da tela

### T15 — `15-auth-volta-ao-destino`
- **What**: `RequireAdmin` passa `state={{ from }}` no `Navigate`; `destinoDepoisDoLogin` no app e o
  `LoginPage` do app usando-o.
- **Where**: `packages/auth/src/RequireAdmin.tsx`, `apps/mobile-adm/src/pages/LoginPage.tsx`,
  `apps/mobile-adm/src/shared/lib/destinoDepoisDoLogin.ts` e testes
- **Depends on**: T01
- **Done when**: `destinoDepoisDoLogin` com `/pedidos/x` (aceito), `/` , `//host`, `https://x`, `pedidos`,
  vazio, `null`, objeto sem `from` (todos `/` menos o primeiro); pelo `<App />` real: abrir
  `/pedidos/<id>` sem sessão → login → entrar → o pedido (`MAN-21`); o painel e a loja **sem asserção
  tocada** (suítes inteiras); o `AdminLoginPage` continua indo para `/admin` com `state.from` presente.
- **Reqs**: `MAN-21`
- **Tests**: unit + componente · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `RequireAdmin` desvia por um componente interno (`AoLoginComOrigem`) que passa `state={{ from: pathname + search }}` ao `Navigate`; o `useLocation` só roda onde o `Navigate` já exigia Router (carregamento e `unknown` seguem sem Router). `shared/lib/destinoDepoisDoLogin.ts` (10 casos: `/pedidos/x` e com query aceitos; `/`, `//host`, `https://x`, relativo, vazio, não-string, objeto sem `from`, `null`, `undefined` ⇒ `/`); o `LoginPage` do app navega para ele. Pelo `<App />` real (`LoginPage.test.tsx` +3): `/pedidos/p79-origem?de=aviso` sem sessão → login → entrar → o mesmo pedido com a query; `/login` direto → Início; `from` de outro host → Início. Painel: `AdminLoginPage.test.tsx` +1 (com `state.from` presente vai para `/admin`), nenhuma asserção antiga tocada; loja idêntica. Full gate 6/6 exit 0 (mobile-adm 1766/111 → 1779/112, backoffice 3709 → 3710/214, store 5953/323, core 4451/176, functions 1099/26, catalog 512/23). 3 mutantes (navegar para `/`; `from` sem a query; aceitar `//`), 3 mortos por asserção

### T16 — `16-recusa-compartilhada`
- **What**: `recusa()` de `gravarAcao.ts` sobe para `apps/mobile-adm/src/shared/api/recusa.ts`;
  `gravarAcao` a importa.
- **Where**: `shared/api/recusa.ts`, `features/order-actions/api/gravarAcao.ts`, testes
- **Depends on**: T15
- **Done when**: as suítes da `75` sem asserção tocada; um caso prova `isAccessDenied(recusa())`;
  nenhuma segunda declaração (busca no app por `ACCESS_DENIED_CODE }` fora de `recusa.ts`).
- **Reqs**: base de `MAN-23` no app
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ Feita (2026-10-25) — `shared/api/recusa.ts` (a declaração única); `gravarAcao.ts` a importa e perdeu a cópia e o import de `ACCESS_DENIED_CODE`. `recusa.test.ts` (2: `isAccessDenied(recusa())`, código `42501`, `Error`; erro novo por chamada). Busca por `ACCESS_DENIED_CODE }` no app fora dos testes: só `recusa.ts`. Suítes da `75` sem asserção tocada. Quick gate exit 0 (mobile-adm 1779/112 → 1781/113). 1 mutante (o código trocado), morto por asserção em `recusa.test.ts` e em `gravarAcao.test.ts`

### T17 — `17-porta-de-avisos-do-app`
- **What**: `features/push-notifications/api/portaDeAvisos.ts` (§4.5) com a tradução de erro; os
  guardas `escritaSoPelaPorta` e `leituraSoComPapel` com a porta nova (importador do client, e
  `functions.invoke` só nela e só com `'atelie-avisos'`).
- **Where**: o arquivo, `__tests__/portaDeAvisos.test.ts`, os dois guardas
- **Depends on**: T16
- **Done when**: os cinco casos obrigatórios de §4.5 (403 + papel de pé ⇒ falha; 403 + `42501` ⇒
  recusa; 401 + `42501` ⇒ recusa; `FunctionsFetchError` ⇒ falha **sem** chamar `conferirPapel`;
  `conferirPapel` sem rede ⇒ falha) + 2xx, 400/404/429 com o slug, 5xx; o corpo enviado de cada função
  exato (`L-039`); mutante "403 ⇒ recusa direta" morto; nos guardas, sensor de `functions.invoke` em
  outro arquivo e de outro nome de function na porta.
- **Reqs**: `MAN-23`, `MAN-16`; `L-047`
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `features/push-notifications/api/portaDeAvisos.ts` com as seis funções e a tradução de §4.5 (2xx ⇒ dado; `FunctionsFetchError`/relay ⇒ falha sem conferir; 401/403 ⇒ `conferirPapel`: `42501` ⇒ lança `recusa()`, papel de pé ou rede ⇒ falha; outro 4xx com slug ⇒ `{ tipo: 'erro', slug, status }`; 5xx ou 4xx sem slug ⇒ falha). Forma do erro conferida em `@supabase/functions-js@2.110.7` (`name` + `context: Response`). **SPEC_DEVIATION (precisão)**: o `invoke` não tem opção de query e a function lê `?action=`; o nome passado é o literal `'atelie-avisos?action=<ação>'` (molde do painel), e o guarda aceita só essa forma com uma das seis ações. `portaDeAvisos.test.ts` (22: os cinco casos obrigatórios, 2xx com o corpo exato de cada função, 400/404/410/429 com slug, 4xx sem slug, 500/502/503, relay). Guardas: `escritaSoPelaPorta` (+2 casos: o literal aceito só na porta dos avisos, acusado com outra function, ação fora das seis, nome nu, template, variável e fora da porta; e a régua "na porta dos avisos o client só é receptor de `.functions.invoke(`", âncora de 6 invocações) e `leituraSoComPapel` (+1: a porta dos avisos sem `from(`); os dois passaram a nove importadores — a âncora `toHaveLength(8)` virou 9 (atualização de âncora, não afrouxamento). Full gate 6/6 exit 0 (mobile-adm 1781/113 → 1807/114; os demais iguais à T15). 8 mutantes, 8 mortos por asserção: "403 ⇒ recusa direta", rede conferindo o papel, conferência sem rede virando recusa, papel de pé virando recusa, slug trocado, `keys` inteiro no corpo, outra function na porta, `from(` na porta

### T18 — `18-arnes-de-push`
- **What**: dublês de `navigator.serviceWorker.ready`, `PushManager` (`getSubscription`, `subscribe`
  que resolve ou lança, `unsubscribe`), `Notification` (`permission`, `requestPermission`) e da porta,
  em `apps/mobile-adm/src/test/push.ts`; limpos entre casos em `test/setup.ts`.
- **Where**: `apps/mobile-adm/src/test/`
- **Depends on**: T17
- **Done when**: o arnês com teste próprio (cada dublê registra as chamadas e argumentos; reset entre
  casos provado por dois casos em sequência — `L-053`).
- **Reqs**: base de `MAN-10`..`MAN-16`
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ Feita (2026-10-25) — `src/test/push.ts`: `push.instalar({ permissao, respostaDoPedido, inscrito, suporte })` põe `navigator.serviceWorker.ready`, `PushManager` e `Notification` (cada um pode faltar sozinho), com `getSubscription` nulo/existente, `subscribe` que resolve (a mesma inscrição se já houver, como o navegador), lança (`falharSubscribe`) ou espera (`segurarSubscribe`), `toJSON()` com `endpoint` e `keys.p256dh`/`keys.auth`, `unsubscribe()` que apaga a inscrição, e `requestPermission` que passa a valer como `permission`; tudo registrado em `push.chamadas` (com a ordem em `log`). `portaFalsa` (as seis funções, `vi.fn` por fila; fila vazia LANÇA) e `filaDaPorta`/`ok`/`falhou`/`erroDaPorta`. `test/setup.ts` chama `push.reset()` no `beforeEach` (import estático: `push.ts` não importa o client). `push.test.ts` (12, com o reset provado por dois casos em sequência). Quick gate exit 0 (mobile-adm 1807/114 → 1819/115). 5 mutantes no arnês e no setup, 5 mortos por asserção

### T19 — `19-use-push-no-aparelho`
- **What**: `features/push-notifications/model/usePushNoAparelho.ts` (§4.5).
- **Where**: o hook e `__tests__/usePushNoAparelho.test.tsx`
- **Depends on**: T18
- **Done when**: estados iniciais: sem suporte (cada uma das três APIs ausente ⇒ `sem-suporte`),
  `denied` ⇒ `bloqueado`, sem inscrição ⇒ `desligado`, inscrição que o servidor não conhece ⇒
  `desligado` (`MAN-36`), conhecida ⇒ `ligado(events)`; **montar não chama `requestPermission`**
  (`MAN-10`); `ativar`: permissão negada ⇒ `bloqueado` e nada gravado; concedida ⇒ `subscribe` com
  `userVisibleOnly: true` e a chave da porta, `inscrever` com endpoint e keys ⇒ `ligado` com os quatro;
  porta falhando ⇒ `unsubscribe()` chamado e `erro` (`MAN-16`); recusa ⇒ relançada; interruptor ⇒
  otimista, volta na falha, `ocupado` durante a gravação; `parar` ⇒ `desligado`; toque duplo no
  `ativar` no mesmo tique ⇒ um `subscribe` só; desmontar no meio ⇒ sem `setState` órfão.
- **Reqs**: `MAN-10`..`MAN-16`, `MAN-36`, `MAN-41`
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ Feita (2026-10-25) — `features/push-notifications/model/usePushNoAparelho.ts`: `estado` (`verificando` · `sem-suporte` · `bloqueado` · `desligado` · `ativando` · `ligado(events, endpoint)` · `erro(motivo: 'ativar' | 'ler')`), `gravando`, `falhaAoGravar`, `parando`, `falhaAoParar`, `recusa`, e `ativar`/`alternar`/`parar`. Lacunas de precisão da spec, decididas e escritas no hook: o estado inicial `verificando` (a leitura ao abrir é assíncrona); `requestPermission` fechado sem resposta (`default`) ⇒ `desligado`; `lerStatus` falhando ao abrir ⇒ `erro` com `motivo: 'ler'` (a tela da T21 escolhe a frase); a recusa ao abrir, que não tem a quem relançar, fica em `recusa` — nas ações ela é RELANÇADA (a inscrição do navegador desfeita antes). `usePushNoAparelho.test.tsx` (28) + `usePushNoAparelho.desmonte.test.tsx` (3, com o `useState` do React embrulhado para contar o setter depois do `unmount` — o React 18 o silencia — e o sensor do embrulho). Quick gate exit 0 (mobile-adm 1819/115 → 1850/117); eslint dos arquivos novos limpo. 12 mutantes, 12 mortos por asserção

### T20 — `20-parar-avisos-deste-aparelho`
- **What**: `features/push-notifications/model/pararAvisosDesteAparelho.ts`.
- **Where**: o arquivo e teste
- **Depends on**: T19
- **Done when**: sem inscrição ⇒ `'sem-inscricao'` e **zero** chamadas à porta; com inscrição e porta
  ok ⇒ `desinscrever` e `unsubscribe()` ⇒ `'parado'`; porta falhando ⇒ `'falhou'` e o
  `unsubscribe()` do navegador **não** chamado (a linha do servidor continua, então o aparelho não pode
  fingir que parou); sem suporte ⇒ `'sem-inscricao'`.
- **Reqs**: `MAN-15`, `MAN-30`
- **Tests**: unit · **Gate**: quick
- **Status**: ✅ Feita (2026-10-25) — `model/pararAvisosDesteAparelho.ts` (`'sem-inscricao' | 'parado' | 'falhou'`; a porta primeiro, o `unsubscribe()` do navegador só depois do `ok`; a recusa da porta é relançada, como em toda porta do app — a T22 decide o que o "Sair" faz com ela) e `model/navegador.ts` (o dono das perguntas ao navegador: suporte, a inscrição por `getRegistration()` — **não** pelo `ready`, que nunca resolve sem o worker instalado e penduraria o "Sair" —, o `ready` só para inscrever, e o `unsubscribe` que não esconde o desfecho). O `parar` do hook passou a delegar a ele (um dono só para "parar"), e a leitura de abertura do hook passou a usar `getRegistration()` (sem worker ⇒ `desligado`, +1 caso; o log esperado do caso "concedida" ganhou o `getRegistration`). Arnês: `getRegistration` e `semRegistro` (+1 caso). Barril `features/push-notifications/index.ts`. `pararAvisosDesteAparelho.test.ts` (8). **Build gate da Fase 4**: Full 6/6 exit 0 (core 4451/176, functions 1099/26, mobile-adm 1850/117 → 1860/118, store 5953/323, backoffice 3710/214, catalog 512/23); `tsc` 0 · 0 · 0 · 0 · 0 · 0 e os 11 herdados em `packages/core`; lint 0/0 · 23/5 · 2/2 (igual à T01); builds do mobile-adm e do backoffice exit 0. 5 mutantes, 5 mortos por asserção

### Fase 5 — a tela e o service worker

### T21 — `21-avisos-page-e-rota`
- **What**: `pages/AvisosPage.tsx` em `/avisos` dentro do `RequireAdmin`; os guardas `rotasSobGuarda`
  e `abasSaoAsRotas` (`ROTAS_DA_CONTA = ['/avisos']`).
- **Where**: a página, `App.tsx`, `pages/__tests__/avisosPage.test.tsx`, os dois guardas
- **Depends on**: T20
- **Done when**: pelo `<App />` real em `/avisos`: cada estado com o texto **exato** da spec e
  **exclusivo** (`L-063`): `MAN-12`, `MAN-13`, `MAN-16`, os quatro interruptores com nome acessível =
  `NOTIFICATION_EVENT_NAMES` em ordem (`MAN-40`), linha com `min-h-12` por token exato, botões ≥ 44;
  "Enviar um aviso de teste" com `MAN-32` e `MAN-33` (frases exatas, e a de `MAN-33` **não** é a de
  `MAN-32`); "Parar avisos neste celular" volta a `MAN-10`; `aria-busy` no controle tocado; toda classe
  de movimento com par `motion-reduce:` (`MAN-41`); rota sem sessão ⇒ login; os guardas com sensor
  (rota fora do bloco; rota de primeiro nível sem aba fora de `ROTAS_DA_CONTA`).
- **Reqs**: `MAN-10`..`MAN-17`, `MAN-31`..`MAN-33`, `MAN-39`..`MAN-41`
- **Tests**: componente + guarda · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `pages/AvisosPage.tsx` em `/avisos` dentro do bloco do `RequireAdmin` (o `h1` "Avisos neste celular" em todo estado; título "Avisos neste celular · Ateliê"). Estados EXCLUSIVOS: `verificando` (e a recusa à espera da vigia) ⇒ esqueleto `aria-busy`, sem frase nem botão; `sem-suporte` ⇒ MAN-13 sem botão; `bloqueado` ⇒ MAN-12 sem interruptor nem botão; `desligado`/`ativando`/`erro` de ativar ⇒ "Avisar neste celular" (`aria-busy` e desabilitado ativando; MAN-16 no erro); `erro` de ler ⇒ a frase nova com "Tentar de novo", que relê remontando o conteúdo (`key`); `ligado` ⇒ os quatro interruptores (`<label>` com `min-h-12` envolvendo um `<input type="checkbox" role="switch">`, nome = `NOTIFICATION_EVENT_NAMES`, na ordem de `PUSH_EVENTS`; não o `Switch` de `packages/ui`, cujo polegar anima por classe que o app não alcança), "Enviar um aviso de teste" e "Parar avisos neste celular". A recusa de papel (a da leitura de abertura e a relançada por uma ação) vai a `useRecusaDePapel` — o mecanismo da `72`. Frases em `features/push-notifications/model/frases.ts`. O hook ganhou `testar`/`testando`/`falhaDoTeste` (`cooldown` ⇒ MAN-33, todo o resto ⇒ MAN-32; recusa relançada; um por vez; +8 casos em `usePushNoAparelho.test.tsx`). **SPEC_DEVIATION (precisão; frases novas)**: o `erro` com motivo `'ler'` diz "Não consegui conferir os avisos deste celular. Tente de novo." (decisão do orquestrador) e a troca de interruptor que falhou diz "Não consegui gravar esta escolha. Tente de novo."; a falha de "Parar avisos" na tela reusa a frase de MAN-30. Guardas: `abasSaoAsRotas` com `ROTAS_DA_CONTA = ['/avisos']` (+3: âncora, sensor de `/configuracoes` acusada ao lado, e o sensor de que sem a lista `/avisos` seria acusada); `rotasSobGuarda` com as doze rotas e o caso de `/avisos` movida para fora (+1). `avisosPage.test.tsx` (27, pelo `<App />` real). Full gate 6/6 exit 0 (mobile-adm 1860/118 → 1899/119; core 4451/176, functions 1099/26, store 5953/323, backoffice 3710/214, catalog 512/23 iguais). 7 mutantes, 7 mortos por asserção (o M4, "a recusa ignorada pela tela", sobreviveu na primeira rodada — o caso da recusa só olhava o fim — e morreu depois do caso "papel ainda admin: nenhum controle nem frase")

### T22 — `22-menu-da-conta`
- **What**: item "Avisos neste celular" e o `sair` com `pararAvisosDesteAparelho` (§4.5).
- **Where**: `widgets/account-menu/ui/AccountMenu.tsx` e teste
- **Depends on**: T21
- **Done when**: o link leva a `/avisos` e o menu fecha; sair sem inscrição ⇒ `signOut` com zero
  chamadas à porta; sair com inscrição ⇒ porta antes de `signOut` (ordem provada); porta falhando ⇒ a
  frase exata de `MAN-30` com os dois botões, **sem** `signOut`; "Sair mesmo assim" ⇒ `signOut`;
  "Tentar de novo" ⇒ nova tentativa; foco no primeiro botão ao aparecer a pergunta (`L-066`); os
  casos antigos do `AccountMenu` sem asserção tocada.
- **Reqs**: `MAN-17`, `MAN-30`
- **Tests**: componente · **Gate**: quick
- **Status**: ✅ Feita (2026-10-25) — `AccountMenu.tsx`: o link "Avisos neste celular" (`/avisos`, alvo `min-h-12`, fecha o menu) e o `sair` novo: `pararAvisosDesteAparelho()` primeiro (o MESMO dono da tela); `'sem-inscricao'`/`'parado'` ⇒ `signOut()`; `'falhou'` ⇒ a frase de MAN-30 (`role="alert"`) com "Tentar de novo" e "Sair mesmo assim" dentro do painel, sem `signOut`, e o foco no primeiro botão (`L-066`; "Tentar de novo" vem primeiro — o não destrutivo; a spec não fixa ordem); a porta RECUSANDO por papel ⇒ `signOut()` direto, sem a pergunta (decisão do orquestrador; o motor apaga as inscrições da conta no envio, MAN-18). Fechar o painel desfaz a pergunta. `AccountMenu.avisos.test.tsx` (10, pelo `<App />` real: o link e o menu fechando; sem inscrição e sem suporte ⇒ zero chamadas à porta; porta → navegador → `signOut` com a ordem provada por `invocationCallOrder` e pelo log do arnês; falha ⇒ pergunta sem `signOut` e com o foco; "Sair mesmo assim"; "Tentar de novo" que dá certo e que falha de novo; Escape; a recusa). `AccountMenu.test.tsx` (os casos antigos) sem uma linha tocada. Quick gate exit 0 (mobile-adm 1899/119 → 1909/120). 7 mutantes, 7 mortos por asserção (`signOut` antes da porta, falha saindo sem perguntar, recusa perguntando, sem foco, "Sair mesmo assim" tentando de novo, pergunta persistindo, link errado)

### T23 — `23-service-worker-de-avisos`
- **What**: `public/sw-avisos.js`; `pwa.config.ts` com `workbox.importScripts: ['sw-avisos.js']`;
  `vercel.json` do app (fora do rewrite, `no-cache`).
- **Where**: os três, `app/__tests__/swAvisos.test.ts`, `swSemDadosDaLoja.test.ts`,
  `vercelConfig.test.ts`
- **Depends on**: T21
- **Done when**: em `vm`: `push` ⇒ `showNotification` com título, corpo, `tag`, ícone e `data.url`
  exatos; `push` sem dado ⇒ não lança; `notificationclick` ⇒ `close()`, e: janela controlada ⇒
  `focus` + `navigate('/pedidos/x')`; janela cujo `navigate` rejeita ⇒ `openWindow('/pedidos/x')`;
  nenhuma janela ⇒ `openWindow`; `url` externa ou `//` ⇒ `/`; `event.waitUntil` recebe a promessa;
  `swSemDadosDaLoja`: sem `runtimeCaching`, `importScripts` exatamente `['sw-avisos.js']`, o arquivo
  sem `fetch(` e sem `caches`; `vercelConfig`: `sw-avisos.js` fora do rewrite e com `no-cache`; build
  do app com o `sw.js` gerado contendo o `importScripts`.
- **Reqs**: `MAN-03`, `MAN-22`
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `public/sw-avisos.js` (JS puro, sem `fetch` e sem `caches`): `push` ⇒ `event.waitUntil(registration.showNotification(title, { body, tag, icon: '/icons/icon-192.png', data: { url } }))`, sempre (MAN-22); sem dado, JSON que lança ou sem título ⇒ não lança e não mostra; `notificationclick` ⇒ `close()`, `clients.matchAll({ type: 'window', includeUncontrolled: true })`: janela ⇒ `focus()` + `navigate(url)`, e o `navigate` rejeitando ⇒ `openWindow(url)`; nenhuma ⇒ `openWindow(url)`; url só caminho interno (uma `/`, nem `//` nem `/\`), senão `/`. `pwa.config.ts` com `workbox.importScripts: ['sw-avisos.js']`; `vercel.json` com `sw-avisos.js` fora do rewrite e `no-cache`. `swAvisos.test.ts` (19, o arquivo do disco num `node:vm` com `self`/`clients`/`registration` falsos, inclusive a promessa do `waitUntil` resolvendo só depois do `openWindow`); `swSemDadosDaLoja` (+4: `importScripts` exato, âncora, sem `fetch(`/`caches`, sensores com a prosa e `prefetch`); `vercelConfig` (+1 e `sw-avisos.js` nos dois casos do rewrite). Build do app exit 0: `dist/sw.js` com `importScripts("sw-avisos.js")` e `dist/sw-avisos.js` presente. Full gate 6/6 exit 0 (mobile-adm 1909/120 → 1933/121; store 5966/323 nesta rodada inclui os +13 da T24, cujo arquivo foi editado com a suíte da loja no ar — remedida na T24; os demais iguais). 13 mutantes, 13 mortos por asserção (S6 e S7 morreram por compilação/`ReferenceError` na primeira escrita, refeitos como mutação válida e mortos por asserção: o `waitUntil` trocado e o `fetch(`/`caches` num ramo morto)

### T24 — `24-guardas-de-ui-e-de-chave`
- **What**: `chaveDeServidorForaDoNavegador` com a régua de `VAPID_KEYS` e de JWK privada (`"d":`);
  `movimento` e `tomMemorial` do app estendidos às telas novas (escopo literal, molde da `74`/`76`).
- **Where**: `apps/store/src/shared/lib/__tests__/chaveDeServidorForaDoNavegador.test.ts`,
  `apps/mobile-adm/src/shared/lib/__tests__/`
- **Depends on**: T22, T23
- **Done when**: sensores (o nome em código, numa string, num comentário de JSON; CRLF/LF) e o inverso
  (a palavra "chave" na copy, `applicationServerKey` não acusados); âncoras subidas com a contagem
  medida pela própria régua. Full gate.
- **Reqs**: `MAN-24`, `MAN-41`, `MAN-08` (tom)
- **Tests**: guarda · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `chaveDeServidorForaDoNavegador` (loja): `.js` entra na varredura (o `sw-avisos.js` é servido como está), duas réguas novas — `VAPID_KEYS` e o membro privado de JWK (`"d":`/`'d':`) — em produção e em teste (só este arquivo isento), âncora de que o SW e a porta são lidos e de que a porta pede `applicationServerKey`; sensores do nome em código, em string, com CRLF e LF, da JWK num texto JSON, num objeto e com espaço; inversos ("chave" na copy, `applicationServerKey`, a JWK pública, `{ id, ordem: 'desc' }`) e o nome em comentário (CRLF/LF) não acusados (+13, 22 → 35). App: `movimentoDosAvisos.test.ts` (8, molde de `movimentoDeClientes`; escopo literal AvisosPage + AccountMenu + `shared/ui/leitura.tsx`; âncora MEDIDA: 6 tokens / 3 pares — `transition-colors` do trilho, `transition-transform` do polegar e `animate-pulse` do esqueleto, cada um com o par que desliga) e `tomMemorialDosAvisos.test.ts` (32, molde de `tomMemorialDeClientes`, pela AST; escopo `features/push-notifications/`, `widgets/account-menu/` e a página; âncora com as frases da spec; a constante `LINHA` do menu é classe lida como literal — declarado, sem palavra acusável). Build gate: Full 6/6 exit 0 (core 4451/176, functions 1099/26, mobile-adm 1933/121 → 1973/123, store 5953/323 → 5966/323, backoffice 3710/214, catalog 512/23); `tsc` 0 em mobile-adm (app e node), store, backoffice, `tsconfig.server`, catalog-import e os 11 herdados em `packages/core` (um TS2345 do `it.each` de `swAvisos.test.ts` achado aqui e consertado com o tipo da tupla); eslint mobile-adm 0/0, backoffice 23/5, store 2/2; builds do mobile-adm e do backoffice exit 0, `dist/sw.js` com o `importScripts` e `dist/sw-avisos.js` presente. 6 mutantes, 6 mortos por asserção (VAPID na porta, JWK privada no SW, `!` e emoji nas frases, o polegar sem par, o par `opacity-100` que não desliga)

### Fase 6 — fecho e prova

### T25 — `25-avisos-com-client-real`
- **What**: `app/__tests__/avisosComClientReal.test.tsx` sobre o supabase-js real (`clientReal.ts`,
  `functions/v1/atelie-avisos` e `rpc/atelie_clock` respondidos pelo `fetch` falso).
- **Where**: o arquivo; `clientReal.ts` nas duas cópias se o arnês precisar de `functions`
  (`clientRealPareado` verde)
- **Depends on**: T24
- **Done when**: `/avisos` com a function em 403 e o relógio em 403 `42501` ⇒ a recusa da `72`; com a
  function em 403 e o relógio de pé ⇒ a frase de `MAN-16`, **nenhuma** recusa; function sem rede ⇒
  `MAN-16` e o relógio **não** chamado; o corpo enviado ao `invoke` exato; três mutantes da porta
  mortos.
- **Reqs**: `MAN-16`, `MAN-23`; `L-047`, `L-055`
- **Tests**: integração · **Gate**: full
- **Status**: ✅ Feita (2026-10-25) — `app/__tests__/avisosComClientReal.test.tsx` (8, o `<App />` real em `/avisos` sobre o supabase-js REAL): `config` 403 + `atelie_clock` 403 `42501` ⇒ a recusa da `72` e a frase de MAN-16 em instante nenhum (80+ leituras); 403 com o relógio de pé ⇒ MAN-16, rota mantida, papel não reconferido; `config` sem rede ⇒ MAN-16 e o relógio NÃO chamado; `subscribe` 403 + recusa ⇒ recusa e a inscrição do navegador desfeita; a leitura de abertura (`status`) com 403 + `42501` ⇒ recusa sem interruptor em instante nenhum, e com o relógio de pé ⇒ "Não consegui conferir…"; o par feliz com o corpo exato de `config` (`{}`), `subscribe` (`{ endpoint, keys }`) e `status` (`{ endpoint }`). O arnês ganhou `functions` (por nome, ou `{ porAcao }` pela `?action=`; sem entrada responde `[]` 200, como antes) nas DUAS cópias de `clientReal.ts` (`clientRealPareado` 5/5). Full gate 6/6 exit 0 (mobile-adm 1973/123 → 1981/124; core 4451/176, functions 1099/26, store 5966/323, backoffice 3710/214, catalog 512/23). 4 mutantes em `portaDeAvisos.ts` (403 ⇒ recusa direta; rede perguntando o papel; o `42501` da conferência ignorado; o corpo do `status` com um campo a mais), 4 mortos por asserção, SHA-256 restaurado

### T26 — `26-probe-da-porta-servida`
- **What**: com `supabase functions serve` (as chaves de dev do `.env`), um probe HTTP com JWT de uma
  conta admin e de uma sem papel (fixturas `P79-…`): as seis ações de ponta a ponta contra o banco
  local, inclusive a troca de dono, o despejo da 11ª, o 429 do teste, e o `test` contra um endpoint
  sintético do FCM (que o FCM recusa) ⇒ o desfecho e o que acontece com a linha registrados.
- **Where**: `probes/03-porta.ts`, `probe-03.md`
- **Depends on**: T25
- **Done when**: cada ação com a saída real; o par conta admin × conta sem papel; fixturas apagadas e
  contagens iguais às da T01.
- **Reqs**: Success Criteria (porta), `MAN-23`, `MAN-27`, `MAN-28`, `MAN-33`
- **Tests**: probe · **Gate**: —
- **Status**: ✅ Feita (2026-10-25) — `probes/03-porta.ts` + `probe-03.md`: 19/19 passos verdes (exit 0) contra a function servida por `functions serve --env-file .env` e contas de verdade do GoTrue (duas admin, uma sem papel): 401 sem header e com a anon key; a conta sem papel com 403 nas seis ações e nada gravado; `config` com a chave de 65 bytes; `status`, `subscribe` (dono novo ⇒ os quatro; mesmo dono ⇒ eventos mantidos; host/`http:`/chave recusados), `events` (subconjunto e evento fora), a troca de dono (a linha passa à B, eventos voltam aos quatro, a A vê `subscribed:false` e `events` 404), `unsubscribe` existente e ausente, o despejo da 11ª pelo `last_used_at` (o 5º envelhecido sai, o 1º fica), `test` sem linha ⇒ 404 sem consumir o teto, **`test` contra o FCM real ⇒ o FCM responde HTTP 410, a porta apaga a linha e devolve 410 `gone`**, 429 `cooldown` no segundo aparelho com o testado vivo, nenhuma escrita em `order_notifications`, nenhum corpo ecoando o endpoint. **ACHADO (não consertado; forma da migration/design)**: o teto de 30 s mora no `last_test_at` da linha, e a linha apagada pelo `gone` o leva junto — o teste seguinte noutro aparelho da conta sai na hora (medido: 410 em vez de 429). Fixturas P79- apagadas, contagens 78/11/0/9 (+ `customers` 11, `user_roles` 3) iguais às da T01; `functions serve` parado; `deno.lock` intocado
- **Conserto do probe da T26** (2026-10-25): o ACHADO virou conserto — o teto de 30 s passou a morar **por conta** em `public.push_test_claims` (`user_id` PK, `on delete cascade`, RLS sem policy, só `service_role`), fora da inscrição; `claim_push_test` mantém a assinatura e faz trava → o aparelho é da conta? (senão `false` sem consumir) → confere → upsert; `push_subscriptions.last_test_at` removida, e a porta deixou de gravá-la no `subscribe` (os três casos do teste passaram a exigir a AUSÊNCIA da chave). Migration editada (nunca publicada: arquivo não versionado) e o banco local ajustado por script de uso único, sem `db reset`, conferido por `pg_dump` contra a migration aplicada num banco descartável (idênticos, salvo os `GRANT ALL` dos default privileges do Supabase local, iguais aos de `push_subscriptions`). `probes/05-teto-do-teste.ts` novo: **antes** (regra antiga) exit 1 — A=true, linha de A apagada, B=true; **depois** exit 0 duas vezes — B=false; `02-banco` 24/24 e `03-porta` 20/20 (o ACHADO virou passo: `test` em outro aparelho depois do `gone` ⇒ 429); fixturas P79- apagadas e contagens iguais. `pushSubscriptionsSchema` 39 → 58 (réguas da tabela nova e da ordem trava → dono → confere → grava, com sensores; 5 mutantes no arquivo real da migration, 5 mortos por asserção). Gates: store 5966 → **5985**/323 exit 0, functions **1099**/26 exit 0

### T27 — `27-gates-e-build`
- **What**: Build gate inteiro.
- **Where**: `baseline.md` (seção de saída)
- **Depends on**: T26
- **Done when**: os seis workspaces um por vez com exit 0 e os deltas atribuídos; tipos 0 nos apps e
  11 em `core`; lint sem regressão; os dois builds verdes; `git diff --name-only -- packages/core/src/payment`
  vazio.
- **Reqs**: Success Criteria (sem regressão)
- **Tests**: — · **Gate**: build
- **Status**: ✅ Feita (2026-10-25) — seis workspaces um por vez, exit 0: 17214/866 → **17719/886** (+505/+20; core 4451/176, functions 1099/26, mobile-adm 1981/124, store 5966/323, backoffice 3710/214, catalog 512/23), deltas atribuídos por task em `baseline.md` (seção Saída), nenhuma queda; `tsc` 0 nos seis projetos e os 11 herdados em `packages/core`; lint 0/0 · 23/5 · 2/2 (igual à T01); builds do mobile-adm (com `importScripts` no `sw.js`) e do backoffice exit 0; `packages/core/src/payment` e `deno.lock` sem diff

### T28 — `28-prova-em-navegador`
- **What**: no **Chrome real** (TQ5), com o app em `vite preview` numa porta livre e a
  `send-notification` servida local: ativar os avisos, ver a inscrição no banco com host
  `fcm.googleapis.com`, disparar `payment_approved` num pedido de fixtura pela porta `trigger` (admin)
  **duas vezes** ⇒ **um** aviso com o título e o corpo exatos; desligar o evento ⇒ nenhum; tocar o
  aviso ⇒ `/pedidos/<id>`; "Enviar um aviso de teste"; "Parar avisos". Layout de `/avisos` e do menu em
  360/390/412/1440 × fonte 100/130/200 % (Playwright no build servido): sem rolagem horizontal, sem
  sobreposição, alvos ≥ 44. Interceptar `**/g/collect*` por caminho.
- **Where**: `prova-navegador.md`
- **Depends on**: T27
- **Done when**: cada passo com a medida ou a captura; o Android real declarado pendente (TQ6) com o
  roteiro do que o usuário deve conferir; fixturas apagadas.
- **Reqs**: Success Criteria 1–2, `MAN-01`, `MAN-02`, `MAN-03`, `MAN-05`, `MAN-08`, `MAN-39`, `MAN-40`
- **Tests**: navegador · **Gate**: —
- **Status**: 🟡 Metade de layout feita (2026-10-25); **Chrome real NÃO feito** — o usuário mandou seguir sem a prova (2026-10-25), fixtura apagada e contagens iguais à T01, roteiro em `prova-navegador.md` (seção Chrome real); fica pendente junto com o Android (TQ6) — `prova-navegador.md` (seção Layout): build servido por `vite preview` na 8191 (bundle conferido pela frase), Playwright com `/rest/v1/**`, `/functions/v1/**`, `/auth/v1/**` e `**/g/collect*` interceptados (0 hits de collect) e `serviceWorker`/`PushManager`/`Notification` dublados por `addInitScript`; 12 estados (`desligado`, `ligado`, `bloqueado`, `sem-suporte`, erro ao ativar, ao ler, do interruptor, do teste, `cooldown`, ao parar, menu aberto, a pergunta de MAN-30) × 360/390/412/1440 × fonte 100/130/200 % = **144/144 limpas** (sem rolagem horizontal, todo alvo ≥ 48 px, rótulos sem corte nem sobreposição). **Defeito achado e consertado**: a 200 % em 360 px, "Pagamento" (166 px numa caixa de 110) passava por baixo do trilho do interruptor (texto até 231 px, trilho em 207); o rótulo ganhou `break-words hyphens-auto` em `AvisosPage.tsx`, com caso novo em `avisosPage.test.tsx` que reprovou antes (2 mutantes, 2 mortos por asserção); remedido no build novo. Build gate depois do conserto 6/6 exit 0 (mobile-adm 1981 → 1982/124; os demais iguais à T27), `tsc`, lint e builds iguais à T27. Capturas em `prova/`; o script em `probes/04-layout.mjs`

### T29 — `29-baselines-e-documentacao`
- **What**: `CLAUDE.md` raiz (o estado da `79` na lista do programa, a linha de *Baselines* e o
  parágrafo da feature, a guarda nova na tabela de guardas, a ordem de publicação em *Estado conhecido*);
  `apps/mobile-adm/CLAUDE.md` (a tela, a porta, o SW); `supabase/CLAUDE.md` (a porta e as chaves);
  `.specs/STATE.md` (handoff; `AD-062` accepted).
- **Where**: os quatro
- **Depends on**: T28
- **Done when**: os números do `CLAUDE.md` iguais aos da T27; nenhuma frase cita uma chave real; a
  pendência do Android e a geração das chaves de produção listadas como operação, **com o aviso de
  `BL-044`**: as chaves VAPID de dev estão no `.env` da raiz, e um `supabase secrets set` rodado de lá
  as gravaria em produção — as de produção são **geradas à parte** e gravadas de um diretório sem
  `.env`, conferindo `{"count":2}`.
- **Reqs**: `MAN-42`
- **Tests**: none · **Gate**: —
- **Status**: ✅ 2026-10-25 — `CLAUDE.md` raiz (status, baselines 17739/886, guardas, *Estado conhecido* com o aviso de `BL-044`), `apps/mobile-adm/CLAUDE.md` (rota, seção e guardas), `supabase/CLAUDE.md` (a function, o ramo do motor, o aviso das chaves de dev), `STATE.md` (handoff; `AD-062` accepted). Gates remedidos: 6/6 exit 0, `tsc`, lint e builds sem regressão

---

## Requisito → Task

| Req | Tasks | Req | Tasks |
| --- | --- | --- | --- |
| MAN-01 | T09, T10, T11, T28 | MAN-22 | T23 |
| MAN-02 | T09, T28 | MAN-23 | T06–T08, T13, T16, T17, T25, T26 |
| MAN-03 | T23, T28 | MAN-24 | T14, T24 |
| MAN-04 | T09, T12 | MAN-25 | T03, T09, T13 |
| MAN-05 | T09, T11, T28 | MAN-26 | T09 |
| MAN-06 | T04, T10 | MAN-27 | T06–T08, T13, T26 |
| MAN-07 | T09, T12 | MAN-28 | T03, T13, T26 |
| MAN-08 | T03, T24, T28 | MAN-29 | T06–T08 |
| MAN-09 | T05, T09 | MAN-30 | T20, T22 |
| MAN-10..13 | T19, T21 | MAN-31..33 | T03, T06–T08, T13, T21, T26 |
| MAN-14 | T13, T19, T21 | MAN-34 | T05 |
| MAN-15 | T13, T20, T21 | MAN-35 | T19 (estado `desligado`), T09 (410) |
| MAN-16 | T17, T19, T21, T25 | MAN-36 | T13, T19 |
| MAN-17 | T21, T22 | MAN-37 | T09, T12, T14 |
| MAN-18 | T09 | MAN-38 | T05, T10 |
| MAN-19 | T09, T10, T11 | MAN-39..41 | T21, T24, T28 |
| MAN-20 | T09 | MAN-42 | T06, T07, T14, T29 |
| MAN-21 | T15 | | |

**Coverage:** 42 requisitos, 42 mapeados, 0 sem task.

---

## Validação antes de aprovar

### Granularidade

| Task | Escopo | Status |
| --- | --- | --- |
| T01, T02, T08, T26–T29 | medição/probe/doc, um entregável cada | ✅ |
| T03 | um módulo puro de `core` | ✅ |
| T04 | uma função extraída | ✅ |
| T05 | canal + histórico + a recusa de `send` — três pontos do mesmo conceito ("push não se reenvia e se mostra como Celular") | ⚠️ coeso |
| T06, T07 | uma migration; os guardas dela | ✅ |
| T09, T10, T11 | um ramo do motor; uma reorganização; um repasse | ✅ |
| T12 | o adaptador (dois arquivos de um conceito) + a fiação nos dois `index.ts` + o guarda que a prende | ⚠️ coeso |
| T13 | uma function | ✅ |
| T14 | configuração em quatro arquivos, sem código | ⚠️ coeso |
| T15–T20 | uma peça do app cada | ✅ |
| T21–T24 | uma tela; um widget; o SW e sua configuração; os guardas | ✅ |
| T25 | um teste de contrato | ✅ |

### Diagrama × dependências

| Task | Depends on | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | início | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | T01 | Fase 1, depois de T02 (sequencial) | ✅ |
| T04 | T03 | T03 → T04 | ✅ |
| T05 | T03 | Fase 1, depois de T04 | ✅ |
| T06 | T03 | Fase 2 | ✅ |
| T07 | T06 | T06 → T07 | ✅ |
| T08 | T07 | T07 → T08 | ✅ |
| T09 | T05, T06 | Fase 3, primeira | ✅ |
| T10 | T04, T09 | T09 → T10 (T04 em fase anterior) | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T02, T11 | T11 → T12 (T02 em fase anterior) | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T01 | Fase 4, primeira | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | Fase 5, primeira | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T21 | Fase 5, depois de T22 | ✅ |
| T24 | T22, T23 | T23 → T24 | ✅ |
| T25 | T24 | Fase 6, primeira | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |
| T28 | T27 | T27 → T28 | ✅ |
| T29 | T28 | T28 → T29 | ✅ |

Nenhuma dependência aponta para uma fase posterior.

### Testes co-localizados

| Task | Camada | Matriz pede | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | medição | — | none | ✅ |
| T02 | risco da biblioteca (fora do vitest) | probe | probe | ✅ |
| T03, T04 | regra de `core` | unit | unit | ✅ |
| T05 | `core` + painel + handler | unit + componente | unit + componente | ✅ |
| T06 | migration | guarda + probe | none, provada na T07/T08 (merge forward: o guarda e o probe só existem com a migration) | ✅ |
| T07 | migration | guarda | guarda | ✅ |
| T08 | migration | probe | probe | ✅ |
| T09–T11 | motor | unit | unit | ✅ |
| T12 | adaptador + fiação | unit + guarda (o `jsr:` fica no probe da T02) | unit + guarda | ✅ |
| T13 | porta | unit | unit | ✅ |
| T14 | config | build/guardas existentes | none | ✅ |
| T15 | auth + app | unit + componente | unit + componente | ✅ |
| T16–T20 | porta, hooks, modelo do app | unit | unit | ✅ |
| T21, T22 | UI | componente | componente (+ guarda) | ✅ |
| T23 | SW | unit em `vm` + guarda | unit + guarda | ✅ |
| T24 | guardas | guarda | guarda | ✅ |
| T25 | contrato | integração | integração | ✅ |
| T26 | porta servida | probe | probe | ✅ |
| T27 | gate | build | — | ✅ |
| T28 | navegador | navegador | navegador | ✅ |
| T29 | doc | none | none | ✅ |

---

## Ferramentas por task

- **Skills**: `tlc-spec-driven` (todas); `supabase` (T02, T06, T08, T12–T14, T26); `playwright-cli` e
  `claude-in-chrome` (T28); `qa-report` e `qa-execution` (depois da T29).
- **MCP**: `claude-in-chrome` (T28, o Chrome real com FCM); `playwright` (T28, medidas de layout).
  Nenhum MCP do Supabase hospedado: tudo é local.

---

## Rodada de conserto do Verificador r1 (2026-10-25)

O Verificador independente reprovou por **cobertura** (76 mutantes: 72 mortos por asserção, 0 por
compilação, 4 sobreviventes; nenhum defeito de produto) e achou por leitura uma cópia divergente. Cada
lacuna virou uma task, com o caso escrito e o mutante reinjetado no arquivo real (SHA-256 conferido na
restauração, arnês que lança sem alvo único):

| Task | Lacuna | O que entrou | Mutante reinjetado |
| --- | --- | --- | --- |
| V01 | F14 — a ordem e-mail → push só era provada pelo relatório | `dispatchPush.test.ts`: no instante em que o aviso sai, o Resend já recebeu o e-mail da dona | push antes do e-mail com o relatório na ordem antiga — **morto por asserção** |
| V02 | P16 — o log da `atelie-avisos` podia trazer o endpoint | `atelie-avisos/__tests__/handlers.test.ts`: espião do `console.log` em `subscribe` e `test` (sent, gone, failed): host presente, endpoint e chaves ausentes | `host: endpoint` no `subscribe` e no `gone` — **2 mortos por asserção** |
| V03 | C07 — push `pending` no histórico | `history.test.ts`: o mesmo título do falho, sem frase de cliente e sem `emailType` | recorte só por `failed` — **morto por asserção** |
| V04 | "caminho interno" com duas escritas divergentes (achado por leitura) | `destinoDepoisDoLogin` passou a recusar `/\` (**mudança de produto**, a regra do worker); `caminhoInternoPareado.test.ts` roda as duas cópias sobre as mesmas entradas, com âncora e sensor | a regra antiga do login — **morto por asserção** (3 casos) |
| V05 | F11 — `has_role` respondendo `null` | `push.test.ts`: aquele dono não recebe; o dublê aceita `null` | `!== false` — **morto por asserção** |

Sem rodada 2 do Verificador nesta passada: autor = verificador nos consertos (precedente da `72`, `73` e `75`).

## Conserto do QA: o aparelho descartado (2026-10-26)

Decisão do usuário (opção 1 de `BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada`). `SPEC_DEVIATION`
de `MAN-32`: o teste que volta `gone`/`not_found` deixa de dizer "O aviso de teste não saiu. Tente de novo." e
passa a voltar ao estado de `MAN-10` com a frase nova "Este celular deixou de receber avisos. Ative de novo."
(`APARELHO_DESCARTADO`); o `not_found` de um interruptor faz o mesmo. Teste antes (10 reprovaram), 7 mutantes
mortos por asserção. Reteste em navegador pendente.
