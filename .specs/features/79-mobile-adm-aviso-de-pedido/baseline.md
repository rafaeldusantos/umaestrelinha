# 79 — Baseline de entrada (T01)

Medida em **2026-10-25**, na branch `feat/79-mobile-adm-aviso-de-pedido` recém-criada de
`feature/mobile-adm` (HEAD `5e31a99b`), **com a árvore parada** — nenhum arquivo de código da `79`
existia quando as suítes rodaram. A árvore tinha só mudanças de outras sessões em `.specs/` e dois
`tsbuildinfo` não rastreados.

## Testes — um workspace por vez, exit code fora de pipe

Comando: `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (sem o `--`), cada um com
`> log 2>&1; echo EXIT=$?`, em sequência.

| Workspace | Testes | Arquivos | Exit |
| --- | --- | --- | --- |
| core | 4365 | 175 | 0 |
| functions | 957 | 21 | 0 |
| mobile-adm | 1765 | 111 | 0 |
| store | 5908 | 322 | 0 |
| backoffice | 3707 | 214 | 0 |
| catalog-import | 512 | 23 | 0 |
| **Total** | **17214** | **866** | — |

**Bate exatamente com o `CLAUDE.md` raiz** (17214 em 866). Nenhuma divergência a declarar.

## Tipos — `npx tsc --noEmit -p <projeto>`

| Projeto | Erros | Exit |
| --- | --- | --- |
| `apps/mobile-adm/tsconfig.app.json` | 0 | 0 |
| `apps/store/tsconfig.app.json` | 0 | 0 |
| `apps/backoffice/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.node.json` | 0 | 0 |
| `apps/store/tsconfig.server.json` | 0 | 0 |
| `tools/catalog-import/tsconfig.json` | 0 | 0 |
| `packages/core/tsconfig.json` | **11** (herdados) | 2 |

Os 11 de `core` são os herdados que o `CLAUDE.md` registra.

## Lint — `npx eslint .` em cada app

| App | Erros / warnings |
| --- | --- |
| mobile-adm | 0 / 0 |
| backoffice | 23 / 5 |
| store | 2 / 2 |

Igual ao `CLAUDE.md` (25/7 no total).

## Banco local (Postgres 54442)

| Medida | Valor |
| --- | --- |
| `public.orders` | 78 |
| `public.order_notifications` | 11 |
| `public.user_roles` com `role = 'admin'` | 3 |
| `auth.users` | 9 |
| tabela `push_subscriptions` | não existe |
| migrations aplicadas no local | 67 de 67 (última `20261025120000`) |

## Functions no disco (`ls supabase/functions`)

`_shared admin-users checkout google-analytics google-feed melhor-envio mercado-pago send-notification visit`

## SHA-256 dos arquivos que a `79` altera

| Arquivo | SHA-256 |
| --- | --- |
| `supabase/functions/send-notification/dispatch.ts` | `e035528f6cf0c6abb4a548c7b067a62071f14cf4ae2ff05e58c4849ae5ee4de0` |
| `packages/core/src/notifications/precondition.ts` | `675e9998e9e6f7311e0b118425a638f3838e8e180f119b9e4d5bfaf788d5dde3` |
| `packages/core/src/orders/history.ts` | `d3124f01f6562a73ec5319151c27d06b12c54c52e7b79446c06bb896dc9adecf` |
| `packages/core/src/notifications/settings.ts` | `42b21e47dfbd37ff8a9c5f970a8e36fc03471a41a5a9b53d78fa09b09abca1e1` |
| `supabase/functions/mercado-pago/handlers.ts` | `06556e8be6ce1d9ab72a18fb7daebda1e992a31dc92e4f6b6521be6330d7140e` |
| `packages/auth/src/RequireAdmin.tsx` | `c52707b88db0d34d5724a8064f65c4d559638771bfeaad4863da5b4875ac485b` |
| `apps/mobile-adm/src/pages/LoginPage.tsx` | `d5d2790fa6bd0003102a553ec417c69cb942de6960f5a7476c46d55512c82c31` |
| `apps/mobile-adm/src/widgets/account-menu/ui/AccountMenu.tsx` | `1c1e255e152f1a510bd4d626c81e74660a118d613e90e46e60ebeb85b374c760` |
| `apps/mobile-adm/src/features/order-actions/api/gravarAcao.ts` | `ec1d757cbfa99ced6b21c2084b70aec3c5fdf0edcda9d4d4236770838425ca48` |
| `apps/mobile-adm/pwa.config.ts` | `6a7c4bcbf57e55563643297000c9868e99fad07b049d3984ef03859202f13625` |
| `apps/mobile-adm/vercel.json` | `32b85a3d885ca186765a321b75a5877c6b89fd39eea41f49dce533f64e2195d3` |

---

# 79 — Saída (T27, Build gate)

Medida em **2026-10-25**, depois da T26 (nenhum arquivo de workspace mudou entre o gate da T25 e este;
as duas medições deram os mesmos números). Mesmo comando da entrada, um workspace por vez, exit fora de
pipe.

## Testes

| Workspace | Entrada (T01) | Saída (T27) | Delta | Exit |
| --- | --- | --- | --- | --- |
| core | 4365 / 175 | **4451 / 176** | +86 / +1 | 0 |
| functions | 957 / 21 | **1099 / 26** | +142 / +5 | 0 |
| mobile-adm | 1765 / 111 | **1981 / 124** | +216 / +13 | 0 |
| store | 5908 / 322 | **5966 / 323** | +58 / +1 | 0 |
| backoffice | 3707 / 214 | **3710 / 214** | +3 / 0 | 0 |
| catalog-import | 512 / 23 | **512 / 23** | 0 | 0 |
| **Total** | **17214 / 866** | **17719 / 886** | **+505 / +20** | — |

**Deltas atribuídos** (pelos `Status` do `tasks.md`; a soma fecha em cada workspace):

| Workspace | Atribuição |
| --- | --- |
| core +86/+1 | T03 +47/+1 (`push.test.ts`) · T04 +33 (`precondition.test.ts`, só casos novos) · T05 +6 (`history`) |
| functions +142/+5 | T05 +1 (`send` recusa `push`) · T09 +25/+1 (`push.test.ts`) · T10 +12/+1 (`dispatchPush.test.ts`) · T11 +6 (`mercado-pago/handlers.test.ts`) · T12 +30/+2 (`pushOutcome`, `pushSoNoMotor`) · T13 +68/+1 (`atelie-avisos/handlers.test.ts` 64 + `http.test.ts` 1 + reflexos nos guardas) |
| mobile-adm +216/+13 | T05 +1 · T15 +13/+1 · T16 +2/+1 · T17 +26/+1 · T18 +12/+1 · T19 +31/+2 · T20 +10/+1 · T21 +39/+1 · T22 +10/+1 · T23 +24/+1 · T24 +40/+2 · T25 +8/+1 (`avisosComClientReal`) |
| store +58/+1 | T07 +44/+1 (`pushSubscriptionsSchema` e `orderNotificationsSchema`) · T13 +1 (`marcacaoSoPorAcao` com `claim_push_test`) · T24 +13 (`chaveDeServidorForaDoNavegador`) |
| backoffice +3 | T05 +2 (o par da linha de push sem "Reenviar", em `AdminOrderPage.test.tsx`) · T15 +1 (`AdminLoginPage.test.tsx`) |

**Nenhuma queda.** Asserções antigas tocadas, todas declaradas nas tasks: a lista de colunas de
`order_notifications` em `usePedido.test.tsx` (T05, a coluna nova é o requisito), as âncoras de
contagem de importadores do client em `escritaSoPelaPorta`/`leituraSoComPapel` (T17, 8 → 9) e o log
esperado do caso "concedida" do hook (T20, `getRegistration`).

## Tipos

| Projeto | Erros | Exit |
| --- | --- | --- |
| `apps/mobile-adm/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.node.json` | 0 | 0 |
| `apps/store/tsconfig.app.json` | 0 | 0 |
| `apps/backoffice/tsconfig.app.json` | 0 | 0 |
| `apps/store/tsconfig.server.json` | 0 | 0 |
| `tools/catalog-import/tsconfig.json` | 0 | 0 |
| `packages/core/tsconfig.json` | **11** (os herdados, iguais à entrada) | 2 |

## Lint — `npx eslint .`

| App | Entrada | Saída |
| --- | --- | --- |
| mobile-adm | 0 / 0 | **0 / 0** |
| backoffice | 23 / 5 | **23 / 5** |
| store | 2 / 2 | **2 / 2** |

## Builds e o código de dinheiro

- `pnpm --filter @estrelinha/mobile-adm build` exit 0: `dist/sw.js` com `importScripts("sw-avisos.js")`
  e `dist/sw-avisos.js` presente.
- `pnpm --filter @estrelinha/backoffice build` exit 0.
- `git diff --name-only -- packages/core/src/payment`: **vazio**.
- `git diff --stat -- deno.lock`: **vazio**.

> **Depois da T28 (metade de layout)**: o conserto do rótulo do interruptor somou **+1** no mobile-adm
> (`avisosPage.test.tsx`, o token de quebra de palavra) — **1982/124**, total **17720/886** (+506/+20
> sobre a entrada). Build gate remedido inteiro depois do conserto: os outros cinco workspaces, `tsc`,
> lint e os dois builds iguais aos da tabela acima.

> **Fecho da T29 (2026-10-25)**, depois do conserto do teto do teste (`push_test_claims`), um workspace por
> vez, exit fora de pipe: core 4451/176 · functions 1099/26 · mobile-adm 1982/124 · store **5985/323** ·
> backoffice 3710/214 · catalog-import 512/23 = **17739/886** (+525/+20 sobre a entrada). `tsc` 0 nos seis
> projetos e 11 herdados em core; lint 0/0 · 23/5 · 2/2; os dois builds exit 0; `payment/**` e `deno.lock`
> sem diff.

> **Depois do Verificador r1 (V01..V05) e do QA** (2026-10-25, um workspace por vez, exit fora de pipe): core
> 4452/176 · functions 1105/26 · mobile-adm **2005/125** (V04 +15 e o conserto do foco do QA +7) · store
> 5985/323 · backoffice 3710/214 · catalog-import 512/23 = **17769/887**.
