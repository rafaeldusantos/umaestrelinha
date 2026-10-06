# 61 · Google Analytics 4 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source
of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier,
discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Regra do projeto que sobrepõe a skill (`CLAUDE.md`, `BL-012`)**: **não** criar commit por task.
> Os commits completos da implementação saem de uma vez, depois da última task e do Verifier.

---

**Design**: `.specs/features/61-google-analytics/design.md`
**Status**: Done (2026-10-06 — Verifier PASS na rodada 3)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found:
> `CLAUDE.md` (raiz: guardas com âncora dupla, sensor por mutação, prova em navegador em 390×844,
> `--testTimeout=20000`, um workspace por vez), `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`,
> `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `vitest.config.ts` dos workspaces.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`packages/core/src/analytics`) | unit | Todos os ramos; 1:1 com `ANL-03`, `EVT-13/14`, `CMP-02/04/05/08`; pureza e alcance do Deno (extensão `.ts`) | `packages/core/src/analytics/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Edge function handlers | unit (dublês de `_shared/testing`) | Toda action: caminho feliz + recusa de auth + erro; idempotência; log sem segredo; **filtros de coluna observáveis** pelo dublê | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Migration | unit (guarda lendo o `.sql` do disco, sensor por mutação) + **probe SQL no banco local** | Cada comando com régua própria (`L-033`); RLS sem policy; `revoke`; default do interruptor | store `shared/lib/__tests__/*Schema.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Loja — hooks, componentes, páginas | unit/RTL | Cada AC de `AVS-*` e `EVT-*` pela **página real montada** (nunca árvore recriada no teste); asserção no evento emitido (dublê do `track`) | `apps/store/src/**/__tests__/*.test.ts(x)` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Painel — páginas, painéis, rotas | unit/RTL | Cada AC de `ANL-*`; rotas sob o `RequireAdmin`; registro × mapa bidirecional | `apps/backoffice/src/**/__tests__/*.test.ts(x)` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Guardas de dono único | unit (varredura de disco, âncora dupla, sensores CRLF/LF/glob) | Recusa a forma proibida e prova o inverso | store `shared/lib/__tests__/` | idem store |
| Layout (largura, alvo de toque, sobreposição) | prova em navegador | 390×844 e 1440; jsdom devolve 0 | — | Playwright com Chrome do sistema, interceptando `/rest/v1/**` |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Task de um workspace | o comando do workspace tocado (tabela acima), exit code fora de pipe |
| Full | Fim de cada fase | os **cinco** workspaces, um por vez (`core`, `functions`, `store`, `backoffice`, `catalog-import`) + `npx tsc --noEmit -p apps/store/tsconfig.app.json` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |
| Build | Fecho (T26) | Full + `pnpm lint` (sem regressão sobre **26/7**) + `pnpm build` |

> ⚠️ Toda task de painel roda também a suíte da **loja**: os guardas de lá varrem `apps/**` e
> `supabase/**` (lição das features `51`, `53`, `55`).

---

## Execution Plan

### Phase 1: Fundação — dados e regra pura

```
T01 → T02 → T03 → T04 → T05
```

### Phase 2: Servidor

```
T06 → T07 → T08 → T09 → T10
```

### Phase 3: Loja — infraestrutura de medição e aviso

```
T11 → T12 → T13 → T14 → T15
```

### Phase 4: Loja — eventos do funil

```
T16 → T17 → T18 → T19 → T20
```

### Phase 5: Painel — seção Google

```
T21 → T22 → T23 → T24
```

### Phase 6: Política e fecho

```
T25 → T26
```

---

## Task Breakdown

### T01: Migration da feature 61

**What**: migration `supabase/migrations/20261005120000_61-google-analytics.sql` com (a) a chave
`analytics` em `store_settings` (`enabled: false`, `measurement_id: 'G-SQL517XDQZ'`,
`production_host: 'umaestrelinha.com.br'`) por `INSERT … ON CONFLICT (key) DO NOTHING`;
(b) `public.analytics_secrets` com RLS ligada, **sem policy**, `revoke all` de `anon` e
`authenticated`; (c) as 5 colunas de `orders` com `if not exists` e o `check` de
`ga_purchase_status`.
**Where**: a migration + `apps/store/src/shared/lib/__tests__/analyticsSchema.test.ts` (novo) +
`storeSettingsDefaults.test.ts` (ampliado)
**Depends on**: None
**Reuses**: forma de `20260816130000_30-google-shopping.sql:75-83`; `mutar()` que lança de
`entregaDeEmailSchema.test.ts`
**Requirement**: ANL-05, ANL-06, CMP-01, CMP-04, CMP-07

**Done when**:
- [ ] Guarda novo: uma régua por comando; RLS ligada; zero `create policy` na tabela; `revoke` de
      `anon` e `authenticated`; nenhum `grant`; interruptor nasce `false`; `check` com os 5 status;
      cada asserção com sensor por mutação que **lança** se a mutação não muda nada
- [ ] `supabase db reset` local aplica; probe: `select` em `analytics_secrets` com a anon key e com
      um JWT de cliente devolve erro/zero linhas; `insert` com os dois é recusado
- [ ] Gate quick (store) verde

**Tests**: unit (guarda) + probe SQL
**Gate**: quick

---

### T02: Tipo e leitura de `store_settings.analytics`

**What**: `AnalyticsSettings` + `DEFAULT_ANALYTICS` em `packages/supabase/src/types/settings.ts`,
entrada em `SettingsKey`/`SettingsMap`, `DEFAULTS` e `useAnalyticsSettings` em
`packages/core/src/hooks/useStoreSettings.ts`.
**Depends on**: T01
**Reuses**: `useGoogleShoppingSettings`
**Requirement**: ANL-08, edge "leitura falha ⇒ desligado"

**Done when**:
- [ ] `storeSettingsDefaults.test.ts` compara `DEFAULT_ANALYTICS` com o que a migration grava
- [ ] Caso: chave ausente no banco ⇒ `enabled: false`
- [ ] Gates quick core e store verdes

**Tests**: unit
**Gate**: quick

---

### T03: `core/analytics` — ID, host e pureza

**What**: `measurementIdRefusal`, `normalizeMeasurementId`, `trafficType` + guarda de pureza e de
alcance do Deno (todo especificador relativo com `.ts`, sem React/Supabase/Deno).
**Where**: `packages/core/src/analytics/{ids,host,index}.ts` + `__tests__/`
**Depends on**: T02
**Reuses**: molde de `core/checkout/__tests__/denoReach.test.ts`
**Requirement**: ANL-03, CMP-08

**Done when**:
- [ ] `G-SQL517XDQZ` aceito; ` g-sql517xdqz ` normalizado e aceito; `UA-1-1`, `GTM-K5N4XKF`,
      `G-`, `G-ABC` e vazio recusados **com a frase exata** de `ANL-03`
- [ ] `trafficType('umaestrelinha.com.br','umaestrelinha.com.br') === null`;
      `www.` igual; `*.vercel.app` e `localhost` ⇒ `'internal'`
- [ ] Sensor do guarda de alcance com `import type` sem extensão e com CRLF
- [ ] Gate quick core verde

**Tests**: unit
**Gate**: quick

---

### T04: `core/analytics` — itens e eventos do navegador

**What**: `toAnalyticsItem` e um builder por evento de `EVT-01..12` (+ `login`/`sign_up`).
**Where**: `packages/core/src/analytics/{items,events}.ts`
**Depends on**: T03
**Reuses**: `publicProductId`
**Requirement**: EVT-01..14, EVT-16..17

**Done when**:
- [ ] `item_id` = `publicProductId` (com `nuvemshop_id` e sem); `item_brand` = "Uma Estrelinha";
      `item_variant` = rótulo da variação; `price` = preço unitário efetivo
- [ ] **Igualdade de chaves** do item com a allowlist (nunca "contém"): um campo a mais reprova — é
      o que prova `EVT-14`; sensor: entrada com `engravingText` não vaza
- [ ] Cada builder com caso que confere nome e parâmetros exatos; `add_to_cart` com `quantity` = qty
- [ ] Gate quick core verde

**Tests**: unit
**Gate**: quick

---

### T05: `core/analytics` — a compra

**What**: `purchaseDecision`, `buildPurchaseBody`, `syntheticClientId`.
**Where**: `packages/core/src/analytics/purchase.ts`
**Depends on**: T04
**Reuses**: `formatOrderNumber`, `toAnalyticsItem`
**Requirement**: CMP-02, CMP-04, CMP-05, CMP-06, CMP-08

**Done when**:
- [ ] Tabela de decisão completa: desligado / sem chave / recusou / ok
- [ ] Corpo: `transaction_id` = número do pedido; `value`, `currency`, `shipping`, `coupon`,
      `discount`; `session_id` quando há; `traffic_type` só em host interno
- [ ] `syntheticClientId` determinístico (mesmo pedido ⇒ mesmo id) e no formato `<int>.<int>`
- [ ] Gate full da fase 1 verde

**Tests**: unit
**Gate**: full

---

### T06: `_shared/auth.ts`

**What**: mover `currentUser`/`requireAdmin` de `admin-users/handlers.ts` para
`supabase/functions/_shared/auth.ts`; `admin-users` reexporta.
**Depends on**: T05
**Reuses**: molde de `_shared/http.ts` + `http.test.ts`
**Requirement**: ANL-06 (fundação)

**Done when**:
- [ ] Teste: `admin-users` reexporta **a mesma referência** (`toBe`); uma segunda declaração de
      `requireAdmin` em `supabase/functions/**` reprova
- [ ] Suíte de `admin-users` verde sem asserção tocada; gate quick functions verde

**Tests**: unit
**Gate**: quick

---

### T07: Function `google-analytics`

**What**: `supabase/functions/google-analytics/{index,handlers}.ts` com `status`, `save-secret`,
`clear-secret`.
**Depends on**: T06
**Reuses**: `_shared/auth.ts`, `_shared/http.ts`, `AD-004`
**Requirement**: ANL-05, ANL-06, ANL-07

**Done when**:
- [ ] Sem token ⇒ 401; não admin ⇒ 403; admin ⇒ 200 — nas três actions
- [ ] `status` nunca devolve a chave (asserção sobre o **corpo inteiro**)
- [ ] `save-secret` recusa vazio, > 128 e com espaço; grava `updated_by`
- [ ] Log de erro sem a chave (dublê do `console`)
- [ ] `wiringResolve.test.ts` encontra o `index.ts` novo (âncora derivada sobe sozinha)
- [ ] Gate quick functions verde

**Tests**: unit
**Gate**: quick

---

### T08: `checkout` grava os ids do GA

**What**: `ga_client_id`, `ga_session_id`, `analytics_declined` em `COLUNAS_DO_PEDIDO`, com validação
(texto ≤ 64, só `[0-9.]`; booleano).
**Where**: `supabase/functions/checkout/handlers.ts`
**Depends on**: T07
**Requirement**: CMP-01

**Done when**:
- [ ] Caso: os três chegam ao `insert` de `orders` (dublê que registra o objeto inserido)
- [ ] Caso: valor fora do formato é descartado, não grava lixo, e o pedido nasce
- [ ] Caso: nada disso chega a `order_items`
- [ ] Probe HTTP contra a function local: o pedido no banco tem as colunas (`AD-012`)
- [ ] Gate quick functions verde

**Tests**: unit + probe
**Gate**: quick

---

### T09: `mercado-pago/analytics.ts` — `sendPurchase`

**What**: leitura própria do pedido, reivindicação `ga_purchase_status is null`, decisão, corpo,
`POST` com `AbortController` (2000 ms) por `deps.fetch`, gravação do resultado.
**Depends on**: T08
**Reuses**: `core/analytics/purchase.ts`, `createFakeFetch`
**Requirement**: CMP-02..08

**Done when**:
- [ ] Caso feliz: **uma** chamada a `/mp/collect` com `measurement_id`/`api_secret` na query e o
      corpo esperado; status `sent`
- [ ] Segunda chamada para o mesmo pedido: reivindicação não casa ⇒ zero `fetch`
- [ ] Recusa ⇒ `skipped_declined`, zero `fetch`; desligado ou sem chave ⇒ `skipped_disabled`
- [ ] `fetch` que rejeita ⇒ `failed`, sem exceção para o chamador
- [ ] Nenhum log contém a chave nem a URL completa
- [ ] O dublê **enxerga** o filtro da reivindicação (fixtura em função — lição da `49`)
- [ ] Gate quick functions verde

**Tests**: unit
**Gate**: quick

---

### T10: Fiação do `sendPurchase` nos dois pontos de aprovação

**What**: chamar `sendPurchase` depois do `fireTrigger` no cartão síncrono (`handlers.ts:~852`) e no
webhook (`~1052`), só quando `applied`.
**Depends on**: T09
**Requirement**: CMP-02, CMP-03, CMP-06

**Done when**:
- [ ] Cartão aprovado ⇒ um envio; webhook com `applied=false` ⇒ zero
- [ ] Corrida cartão + webhook do mesmo pedido ⇒ um envio no total
- [ ] `sendPurchase` que lança não altera a resposta do pagamento
- [ ] Gate full da fase 2 verde

**Tests**: unit
**Gate**: full

---

### T11: `nuvemshop_id` do produto na loja

**What**: `Product.nuvemshop_id`, `mapDbToProduct`, `PRODUCT_CARD_SELECT`.
**Where**: `packages/supabase/src/types/index.ts`, `apps/store/src/entities/product/lib/mapProduct.ts`
**Depends on**: T10
**Requirement**: EVT-13

**Done when**:
- [ ] `cardSelect.test.ts` exige a coluna; caso do mapper com e sem valor
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T12: `shared/lib/analytics` — o dono do gtag

**What**: `loadGtag`, `track`, `gaIds`, `clearGaCookies`, `setConsentReader`, `setPreviewMode`.
**Depends on**: T11
**Reuses**: `core/analytics`, `useAnalyticsSettings`
**Requirement**: EVT-01 (base), AVS-05, AVS-08, edge cases

**Done when**:
- [ ] `loadGtag` injeta **um** script mesmo chamado duas vezes; `config` com
      `send_page_view:false`, `allow_google_signals:false`, `allow_ad_personalization_signals:false`
- [ ] `track` é no-op em cada uma das condições (desligado, ID inválido, recusa, prévia, dev) — um
      caso por condição, e o caso positivo ao lado
- [ ] `traffic_type: 'internal'` fora do host de produção
- [ ] `clearGaCookies` apaga `_ga` e `_ga_<id>`
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T13: `entities/cookie-consent`

**What**: estado do aviso e das preferências em `localStorage` (`estrelinha-cookie-consent`), com
`try/catch`.
**Depends on**: T12
**Requirement**: AVS-03, AVS-05, AVS-06, edge `localStorage` lança

**Done when**:
- [ ] Sem chave ⇒ aviso aberto, `statistics: true`; `accept`/`dismiss` ⇒ aviso fechado e
      persistido; `save(false)` ⇒ `statistics: false` persistido e `clearGaCookies` chamado
- [ ] `localStorage` que lança ⇒ estado em memória, sem exceção
- [ ] Chave listada em `CLAUDE.md` (chaves em uso)
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T14: `AnalyticsLoader` + `PageViewTracker`

**What**: montar em `apps/store/src/app/App.tsx`, dentro do Router, irmãos do `ScrollToTop`,
desligados em `previewMode`.
**Depends on**: T13
**Requirement**: EVT-01, AVS-08, ANL-08

**Done when**:
- [ ] Casos pelo `App` real: troca de pathname ⇒ um `page_view`; só query ⇒ zero; prévia ⇒ zero e
      nenhum script injetado; configuração desligada ⇒ nenhum script
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T15: Aviso de cookies, folha de preferências e link do rodapé

**What**: `widgets/cookie-notice` conforme o Paper; montado no `App` (vale para `/checkout`); link
"Preferências de cookies" no `Footer`.
**Depends on**: T14
**Reuses**: `Sheet`, `TAP_44`, tokens da loja
**Requirement**: AVS-01..08

**Done when**:
- [ ] Texto exato do aviso (`AVS-01`) e das categorias (Apêndice A), por asserção de literal
      (`L-036`)
- [ ] "Aceitar" e X fecham e persistem; seguir navegando não fecha nem recusa
- [ ] Folha: Necessários sem interruptor; Estatísticas ligada; "Salvar escolhas" com desligado ⇒
      `track` vira no-op dali em diante (asserção no dublê do gtag, não no estado)
- [ ] Medição desligada no painel ⇒ folha sem a categoria Estatísticas
- [ ] Rodapé: link reabre a folha; `Footer.test.tsx` segue verde
- [ ] Guardas de toque, contraste e `motion-reduce` verdes
- [ ] Gate full da fase 3 verde

**Tests**: unit
**Gate**: full

---

### T16: Listagens e clique no card

**What**: hook `useTrackList` + `view_item_list` em categoria, busca, carrossel, relacionados e
favoritos; `select_item` no `ProductCard` com a lista e o `index`.
**Depends on**: T15
**Requirement**: EVT-02, EVT-03

**Done when**:
- [ ] Pela página real: um `view_item_list` por conjunto carregado (rerender não repete; página
      seguinte da rolagem infinita emite com os itens novos)
- [ ] Clique no card ⇒ `select_item` com `item_list_id` e `index` certos
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T17: Produto e sacola

**What**: `view_item`, `add_to_cart` (página e `CrossSell`), `remove_from_cart`, `view_cart`,
`add_to_wishlist` via `toggleWishlist`.
**Depends on**: T16
**Requirement**: EVT-04..08

**Done when**:
- [ ] `add_to_cart` com qty 3 ⇒ **um** evento com `quantity: 3`; restaurar sacola ⇒ zero
- [ ] Diminuir de 3 para 1 ⇒ `remove_from_cart` com `quantity: 2`
- [ ] `view_cart` só na transição fechado → aberto com itens
- [ ] Desfavoritar ⇒ zero; os 5 chamadores passam por `toggleWishlist`
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T18: Busca e checkout

**What**: `search` no envio; `begin_checkout`, `add_shipping_info`, `add_payment_info`;
`buildOrderPayload` recebe `gaIds()` e `analytics_declined`.
**Depends on**: T17
**Requirement**: EVT-09..12, CMP-01

**Done when**:
- [ ] Digitar sem enviar ⇒ zero `search`
- [ ] `begin_checkout` uma vez por montagem com itens; zero com sacola vazia
- [ ] Payload do pedido com os três campos (caso com recusa e sem)
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T19: Guarda de dono único da medição

**What**: `apps/store/src/shared/lib/__tests__/medicaoComDonoUnico.test.ts`: (1) `gtag(` /
`dataLayer` fora de `shared/lib/analytics`; (2) o nome do evento `purchase` em `apps/**`; (3)
metade positiva — os pontos de chamada de `EVT-02..12` chamam `track`.
**Depends on**: T18
**Requirement**: EVT-15, CMP-09

**Done when**:
- [ ] Âncora dupla; sensores CRLF/LF/glob de dois asteriscos (`BL-027`); inversos provando que
      `track('view_item', …)` e a prosa que explica a regra não são acusados
- [ ] Mutação reinjetada no arquivo real (um `window.gtag(` num widget) reprova
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T20: `login` e `sign_up` (P2)

**What**: eventos em `features/auth/model/useAuthFlow.ts`.
**Depends on**: T19
**Requirement**: EVT-16, EVT-17

**Done when**:
- [ ] Código verificado com conta existente ⇒ `login` (`method: 'codigo'`); conta nova ⇒ `sign_up`;
      senha ⇒ `login` (`method: 'senha'`); Google ⇒ `login` (`method: 'google'`) no retorno
- [ ] Gate full da fase 4 verde

**Tests**: unit
**Gate**: full

---

### T21: Seção Google — registro, rotas, navegação

**What**: `shared/lib/googleSections.ts`, rotas irmãs `/admin/google` e `/admin/google/:secao`,
`<Navigate>` de `/admin/google-shopping`, item "Google" em `navItems`, `AdminGooglePage` com a
fileira de links (`AD-046`) e o mapa `slug → painel`; corpo atual movido para
`features/google-shopping/ui/GoogleShoppingPanel.tsx`.
**Depends on**: T20
**Requirement**: ANL-01, ANL-02, ANL-09

**Done when**:
- [ ] `rotasSobGuarda`, `navItems`, `focusRoutes` verdes; as três rotas novas dentro do bloco
- [ ] Registro × mapa bidirecional (molde `panels.test.tsx`)
- [ ] `/admin/google-shopping` ⇒ `/admin/google/shopping`; `/admin/google` ⇒ Analytics aberta
- [ ] `AdminGoogleShoppingPage.test.tsx` migra para o painel **sem perder asserção**
- [ ] Gates quick backoffice **e store** verdes

**Tests**: unit
**Gate**: quick

---

### T22: Painel Analytics — estado e ID

**What**: `features/google-analytics/ui/AnalyticsPanel.tsx` com o card de estado (interruptor) e o
campo do ID, gravando `store_settings.analytics`.
**Depends on**: T21
**Requirement**: ANL-03, ANL-04, ANL-08

**Done when**:
- [ ] ID inválido ⇒ frase de `ANL-03` junto ao campo, sem gravar; ligar sem ID ⇒ recusa
- [ ] Gravar preserva `production_host` (spread, não substituição)
- [ ] Gates quick backoffice e store verdes

**Tests**: unit
**Gate**: quick

---

### T23: Painel Analytics — chave secreta

**What**: card da chave (estado "Guardada no servidor", "Substituir", campo de colar), hooks
`useAnalyticsSecretStatus`/`useSaveAnalyticsSecret` chamando a function `google-analytics`; aviso
`ANL-07` quando ligado sem chave.
**Depends on**: T22
**Requirement**: ANL-05, ANL-07

**Done when**:
- [ ] Depois de salvar: o campo some, o valor **não** está no DOM, estado mostra a data
- [ ] Ligado e sem chave ⇒ aviso com o passo a passo
- [ ] `chaveDeServidorForaDoNavegador` verde (a tela chama a function, nunca a tabela)
- [ ] Gates quick backoffice e store verdes

**Tests**: unit
**Gate**: quick

---

### T24: Painel Analytics — último envio e ajuda (P2)

**What**: card "Última compra enviada" (`formatOrderNumber`, data, valor, "enviado ao Google") e
contagem de fora por recusa/falha em 30 dias; card "Onde criar a chave secreta".
**Depends on**: T23
**Requirement**: ANL-10, ANL-11

**Done when**:
- [ ] Sem envio ⇒ "Nenhuma compra enviada ainda" (literal)
- [ ] Contagens pelo `count: 'exact', head: true` (sem trazer linhas)
- [ ] `numeroDoPedidoComDonoUnico` verde
- [ ] Gate full da fase 5 verde

**Tests**: unit
**Gate**: full

---

### T25: Política de Privacidade

**What**: item novo em `COM_QUEM_COMPARTILHAMOS` e seção "Medição de audiência" com o texto do
Apêndice A **aprovado pela dona**.
**Depends on**: T24
**Requirement**: PRV-01..03

**Done when**:
- [ ] `PrivacyPolicyPage.test.tsx` com a 4ª regex e os literais da seção nova (ampliado)
- [ ] `politicaComDonoUnico.test.ts` 9 → 10 seções, nomeando o título novo
- [ ] A recusa de "remarketing/anúncios personalizados/publicidade comportamental" segue verde
- [ ] Gate quick store verde

**Tests**: unit
**Gate**: quick

---

### T26: Fecho — gates, prova em navegador, baselines

**What**: gate Build; prova em Chrome real (Playwright, interceptando `/rest/v1/**` e
`/g/collect`) em 390×844 e 1440: aviso, folha, rolagem horizontal zero, alvos ≥ 44px, percurso
produto → sacola → checkout contando eventos; recusa ⇒ zero `collect`; painel `/admin/google` nas
duas larguras. Baselines do `CLAUDE.md` e handoff em `STATE.md`.
**Depends on**: T25
**Requirement**: Success Criteria

**Done when**:
- [ ] Os cinco workspaces verdes, um por vez; tipos 0 · 0; lint sem regressão; `pnpm build` verde;
      `packages/core/src/payment/**` com zero arquivos alterados
- [ ] Relatório de navegador com as medidas
- [ ] Depois: Verifier independente (automático pela skill) e os commits da feature

**Tests**: e2e (navegador)
**Gate**: build

---

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram | Status |
| --- | --- | --- | --- |
| T01 | None | início da fase 1 | ✅ |
| T02–T05 | anterior | T01→T02→T03→T04→T05 | ✅ |
| T06 | T05 | início fase 2 após fase 1 | ✅ |
| T07–T10 | anterior | T06→…→T10 | ✅ |
| T11 | T10 | início fase 3 | ✅ |
| T12–T15 | anterior | T11→…→T15 | ✅ |
| T16 | T15 | início fase 4 | ✅ |
| T17–T20 | anterior | T16→…→T20 | ✅ |
| T21 | T20 | início fase 5 | ✅ |
| T22–T24 | anterior | T21→…→T24 | ✅ |
| T25 | T24 | início fase 6 | ✅ |
| T26 | T25 | T25→T26 | ✅ |

Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T01 | migration | guarda + probe | unit + probe | ✅ |
| T02–T05 | regra pura / hooks core | unit | unit | ✅ |
| T06–T10 | edge function | unit (+ probe em T08) | unit (+ probe) | ✅ |
| T11–T20 | loja | unit/RTL | unit | ✅ |
| T21–T24 | painel | unit/RTL | unit | ✅ |
| T25 | página da loja | unit | unit | ✅ |
| T26 | layout | prova em navegador | e2e | ✅ |

## Granularity Check

26 tasks, cada uma com um entregável. Duas agrupam mais de um arquivo por coesão declarada: T15 (o
aviso, a folha e o link que a abre — testáveis só juntos) e T21 (registro, rotas e página — o guarda
de rotas só passa com os três). Fases de 2 a 5 tasks, abaixo do teto de ~10.

## Ferramentas por task

| Tasks | MCP / Skill |
| --- | --- |
| T01, T08 | `supabase` CLI local (probe); skill `supabase` |
| T15, T21–T24 | desenho do Paper (`get_jsx`/`get_computed_styles` para os valores exatos) |
| T26 | Playwright com Chrome do sistema; skill `playwright-cli` |
| demais | nenhuma |
