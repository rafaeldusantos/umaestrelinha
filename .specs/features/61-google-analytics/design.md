# 61 · Google Analytics 4 — Design

**Spec**: `.specs/features/61-google-analytics/spec.md`
**Context**: `.specs/features/61-google-analytics/context.md`
**Desenho**: Paper, página "61 · Google — Analytics e Shopping"
**Status**: Draft

---

## Architecture Overview

Três caminhos levam dado ao GA4, e cada um tem **um** dono:

1. **Navegador → gtag.js** — todos os eventos de navegação e funil (`EVT-*`), montados por funções
   puras em `@estrelinha/core/analytics` e enviados por **um** módulo da loja
   (`apps/store/src/shared/lib/analytics`). Nenhum outro arquivo chama `gtag` nem escreve no
   `dataLayer`.
2. **Servidor → Measurement Protocol** — só o `purchase` (`CMP-*`), disparado pela function
   `mercado-pago` no instante em que `apply_payment_approval` devolve `applied`. A loja nunca monta
   `purchase`.
3. **Painel → configuração** — o ID e o interruptor em `store_settings.analytics` (público por
   natureza); a chave secreta numa tabela **sem policy nenhuma**, gravada e consultada só por uma
   edge function que exige admin.

```mermaid
graph TD
  subgraph Loja
    P[Páginas e widgets] -->|chamam| T[shared/lib/analytics · track]
    T -->|builders puros| C[core/analytics]
    T --> G[gtag.js]
    CK[Aviso + Preferências] --> CS[consentimento · localStorage]
    CS --> T
    CO[CheckoutPage] -->|ga_client_id, ga_session_id, analytics_declined| FX[function checkout]
  end
  G --> GA[(GA4 G-SQL517XDQZ)]
  FX --> O[(orders)]
  MP[function mercado-pago] -->|applied| PS[analytics/sendPurchase]
  PS --> O
  PS -->|lê| SEC[(analytics_secrets · sem policy)]
  PS -->|builder puro| C
  PS -->|POST /mp/collect| GA
  subgraph Painel
    AG[/admin/google/analytics] -->|ID + interruptor| SS[(store_settings.analytics)]
    AG -->|chave| EF[function google-analytics · requireAdmin]
    EF --> SEC
  end
  SS --> T
  SS --> PS
```

### Alternativas consideradas

| Abordagem | Por que não |
| --- | --- |
| **`purchase` no navegador, em `/pedido/:id`** | PIX aprovado com a aba fechada nunca chega; F5 duplica; a dedução por `transaction_id` do GA4 é por usuário e não cobre a falta. Recusada pelo pedido ("uma vez só, inclusive PIX") |
| **GTM no lugar do gtag** | Os eventos passariam a ter dois donos — o código que empurra e o contêiner que interpreta —, e o contêiner atual já carrega a tag do GA4 (contagem em dobro). Fica para a fase 2 decidir, sobre o `dataLayer` que esta feature já preenche |
| **Chave secreta como secret do Supabase (`supabase secrets set`)** | Funciona, mas tira a dona do circuito e traz o risco `BL-044` (a CLI mescla o `.env` local). A spec pede a chave **pelo painel** |
| **Chave em `store_settings`** | A tabela tem `SELECT using (true)` para `anon`: a chave estaria publicada |

**Recomendada e adotada:** gtag direto + `purchase` pelo servidor + chave em tabela sem policy.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --- | --- | --- |
| `publicProductId` | `packages/core/src/shopping/identity.ts:53` | `item_id` de todo evento — o mesmo `item_group_id` do feed |
| `formatOrderNumber` | `packages/core/src/orders/format.ts:64` | **só** o número exibido no painel (`#0244`). O `transaction_id` é o `order_number` **cru** (`0244`) — o `#` é apresentação, e o GA4 compara texto (decisão de 2026-10-06, `CMP-02`) |
| `useStoreSettings` / `DEFAULTS` | `packages/core/src/hooks/useStoreSettings.ts:29` | chave nova `analytics` (sem entrada em `DEFAULTS` ela é descartada) |
| `requireAdmin` / `currentUser` | `supabase/functions/admin-users/handlers.ts:84-129` | **movidos** para `_shared/auth.ts` e reexportados (molde de `_shared/http.ts`, `toBe`) — a function nova seria a segunda cópia |
| `corsHeaders`, `json`, `preflight` | `supabase/functions/_shared/http.ts` | a function nova |
| `fireTrigger` + orçamento `AbortController` | `supabase/functions/mercado-pago/handlers.ts:91` | `sendPurchase` segue o mesmo formato: `await` limitado (`AD-008`), erro capturado, nunca derruba o pagamento |
| `Deps.fetch` injetado | `mercado-pago/handlers.ts:43-69` | o POST ao Measurement Protocol usa o `fetch` dos `Deps`, testável com `createFakeFetch` |
| `COLUNAS_DO_PEDIDO` | `supabase/functions/checkout/handlers.ts:208` | as três colunas novas entram na allowlist — fora dela são descartadas em silêncio |
| `buildOrderPayload` | `apps/store/src/features/checkout/lib/buildOrderPayload.ts:125` | recebe os ids do GA como parâmetro |
| `previewMode` | `apps/store/src/app/App.tsx:64` | desliga carregador, eventos e aviso na prévia (`AVS-08`) |
| `ScrollToTop` | `apps/store/src/app/ScrollToTop.tsx` | `PageViewTracker` irmão, mesma regra de "só pathname" (`EVT-01`) |
| `settingsSections` + `panels.tsx` + rotas irmãs | `apps/backoffice/src/shared/lib/settingsSections.ts`, `widgets/settings-sections/` | molde da seção Google (registro, endereço por seção, mapa `slug → painel`), conforme `AD-038` |
| `AdminGoogleShoppingPage` | `apps/backoffice/src/pages/admin/AdminGoogleShoppingPage.tsx` | o corpo vira `features/google-shopping/ui/GoogleShoppingPanel.tsx`, sem mudar uma linha de comportamento |
| `storeSettingsDefaults.test.ts`, `PrivacyPolicyPage.test.tsx`, `politicaComDonoUnico.test.ts` | store `shared/lib/__tests__`, `pages/__tests__` | ampliados, nunca afrouxados |

### Integration Points

| System | Integration Method |
| --- | --- |
| `store_settings` | chave `analytics` semeada por `INSERT … ON CONFLICT DO NOTHING` (forma que `storeSettingsDefaults` lê) |
| `orders` | 5 colunas novas (ver Data Models); escritas pelo `checkout` e pelo `sendPurchase` com `service_role` |
| GA4 navegador | `https://www.googletagmanager.com/gtag/js?id=…` injetado em tempo de execução |
| GA4 servidor | `POST https://www.google-analytics.com/mp/collect?measurement_id=…&api_secret=…` |

---

## Components

### `@estrelinha/core/analytics` — a regra pura

- **Purpose**: montar todo evento e todo item a partir dos dados de domínio, sem I/O.
- **Location**: `packages/core/src/analytics/` (**todo import relativo com `.ts`** — o `mercado-pago`
  importa por caminho; `denoReach`-style guard incluído)
- **Interfaces**:
  - `measurementIdRefusal(raw: string): string | null` — `ANL-03` (formato string|null, nunca união
    booleana, por `strictNullChecks: false`)
  - `normalizeMeasurementId(raw: string): string` — apara + maiúsculas
  - `toAnalyticsItem(input: ItemInput): AnalyticsItem` — `EVT-13`/`EVT-14`; o tipo de entrada **não
    tem** campo de gravação, nome de cliente nem endereço
  - `buildEvent(name: StoreEventName, input): { name, params }` — um builder por evento de `EVT-01..12`
  - `trafficType(host: string, productionHost: string): 'internal' | null`
  - `purchaseDecision(input): 'send' | 'skip_declined' | 'skip_disabled'` — `CMP-04..06`
  - `buildPurchaseBody(order, items, ids): MeasurementProtocolBody` — `CMP-02/05/08`
  - `syntheticClientId(orderId: string): string` — determinístico, formato `<int>.<int>`
- **Dependencies**: `core/shopping/identity.ts`
- **Reuses**: `publicProductId` (o `transaction_id` é o `order_number` cru, sem `formatOrderNumber` — `CMP-02`)

### `apps/store/src/shared/lib/analytics/` — o único que fala com o gtag

- **Purpose**: carregar o gtag, saber se pode medir, e enviar.
- **Interfaces**:
  - `loadGtag(measurementId: string): void` — injeta o script **uma vez**, `config` com
    `send_page_view: false`, `allow_google_signals: false`, `allow_ad_personalization_signals: false`
    e, fora do host de produção, `traffic_type: 'internal'` (`CMP-08`) — **na configuração**, para
    que os eventos que o GA4 manda sozinho (rolagem, `form_start`, histórico) também saiam marcados.
    Lê a configuração que o `AnalyticsLoader` gravou **antes** de chamá-lo; a ordem é presa pelo App
    real (`app/__tests__/analytics.test.tsx`, nos dois sentidos)
  - `track(name, params): void` — sai **só** se: configuração ligada, ID válido, sem recusa, fora da
    prévia, fora de `import.meta.env.DEV`/teste; acrescenta `traffic_type: 'internal'` também no
    **evento manual**, fora do host de produção — os dois lugares, a configuração e o evento
  - `gaIds(): { clientId: string | null; sessionId: string | null }` — lê `_ga`/`_ga_<id>`
  - `clearGaCookies(): void` — `AVS-05`
- **Reuses**: `core/analytics`, `useAnalyticsSettings` (hook novo em `core/hooks`)

### `apps/store/src/entities/cookie-consent/` — a escolha da cliente

- **Purpose**: estado do aviso e das preferências (`localStorage` `estrelinha-cookie-consent`, valor
  `{ v: 1, notice: 'answered' | null, statistics: boolean }`), com `try/catch` (aba privada).
- **Interfaces**: `useCookieConsent()` → `{ noticeOpen, statistics, accept(), dismiss(), save(stats),
  openPreferences() }`; o padrão sem chave é `statistics: true` (legítimo interesse).
- **Why entities**: lida pelo aviso, pelo rodapé e por `track` — três consumidores do mesmo app
  (`AD-033`). `track` mora em `shared` e por isso **recebe** o estado por um leitor injetável
  (`setConsentReader`), não importa `entities` (camada acima).

### `apps/store/src/widgets/cookie-notice/` — o aviso e a folha

- **Purpose**: `AVS-01..08`, conforme o Paper.
- **Location**: montado em `App.tsx` fora das rotas (vale também para o `/checkout`), oculto em
  `previewMode`.
- **Reuses**: tokens da loja, `TAP_44`, `Sheet` do `@estrelinha/ui`.

### `apps/store/src/app/AnalyticsLoader.tsx` + `PageViewTracker.tsx`

- **Purpose**: ler a configuração, chamar `loadGtag`, e emitir `page_view` por pathname (`EVT-01`).
- **Location**: dentro do `BrowserRouter`, irmão do `ScrollToTop`.

### Pontos de chamada na loja (só chamam `track`)

| Evento | Arquivo |
| --- | --- |
| `view_item_list` | `pages/CategoryPage.tsx`, `pages/SearchPage.tsx`, `widgets/product-carousel/ui/ProductCarousel.tsx`, `widgets/related-products/ui/RelatedProducts.tsx`, `pages/WishlistPage.tsx` — via hook `useTrackList(listId, listName, products)` que emite uma vez por conjunto carregado |
| `select_item` | `entities/product/ui/ProductCard.tsx` (recebe `list` opcional do pai) |
| `view_item` | `pages/ProductPage.tsx` |
| `add_to_cart` | `entities/product/model/useProductPurchase.tsx` (`add`, **uma** chamada com `qty`, fora do laço) e `widgets/cart-drawer/ui/CrossSell.tsx` |
| `remove_from_cart` | `widgets/cart-drawer/ui/CartDrawerRow.tsx` |
| `view_cart` | `widgets/cart-drawer/ui/CartDrawer.tsx` (transição fechado → aberto com itens) |
| `add_to_wishlist` | os 5 chamadores de `toggleItem`, via um `toggleWishlist` em `entities/wishlist` que só emite quando o resultado é "marcado" |
| `search` | `pages/SearchPage.tsx`, no envio (o `pushRecentSearch` já marca esse instante) |
| `begin_checkout` | `pages/CheckoutPage.tsx`, uma vez por montagem com itens |
| `add_shipping_info` | `features/checkout/ui/DeliveryBlock.tsx` |
| `add_payment_info` | `features/checkout/ui/PaymentBlock.tsx` |
| `login` / `sign_up` (P2) | `features/auth/model/useAuthFlow.ts` |

### Servidor — `supabase/functions/mercado-pago/analytics.ts`

- **Purpose**: `CMP-02..08`.
- **Interface**: `sendPurchase(deps: Deps, orderId: string, budgetMs: number): Promise<void>`
  1. lê `store_settings.analytics` e `analytics_secrets`;
  2. **reivindica** o envio: `update orders set ga_purchase_status = 'sending' where id = $1 and
     ga_purchase_status is null returning …` (molde `AD-006` — mesmo que `applied` já seja único,
     a reivindicação é a contenção barata contra o próximo caminho de aprovação que alguém criar);
  3. decide com `purchaseDecision`; grava `skipped_*` e sai, ou
  4. lê itens (`order_items` + `products.name, nuvemshop_id, categoria`) e monta `buildPurchaseBody`;
  5. `POST` com `AbortController` (orçamento próprio, 2000 ms) pelo `deps.fetch`;
  6. grava `sent` ou `failed` + `ga_purchase_at`. **Nunca** registra a URL (ela carrega a chave).
- **Chamado em**: `handlers.ts:~852` (cartão) e `~1052` (webhook), logo depois do `fireTrigger`,
  dentro de `try/catch`.

### Servidor — `supabase/functions/google-analytics/` (function nova)

- **Purpose**: `ANL-05/06/07`, `ANL-10/11`.
- **Actions** (todas exigem admin por `requireAdmin` de `_shared/auth.ts`):
  - `GET ?action=status` → `{ secret_configured: boolean, secret_updated_at: string | null }`
  - `POST ?action=save-secret` `{ secret }` → valida (não vazio, ≤ 128, sem espaço) e grava
  - `POST ?action=clear-secret`
- **Never**: devolver a chave, registrá-la em log.

### Painel — a seção Google

- **Registro**: `apps/backoffice/src/shared/lib/googleSections.ts` — `[{ slug: 'analytics', … },
  { slug: 'shopping', … }]`, no molde de `settingsSections.ts`.
- **Rotas** (irmãs auto-fechadas, dentro do único `</Route>` do `RequireAdmin`):
  `/admin/google`, `/admin/google/:secao`, e `/admin/google-shopping` → `<Navigate
  to="/admin/google/shopping" replace />` (`ANL-02`).
- **Página**: `pages/admin/AdminGooglePage.tsx` — cabeçalho + **fileira de links** das seções (ver
  `AD-046`) + painel da seção ativa por mapa `slug → componente`.
- **Painéis**: `features/google-analytics/ui/AnalyticsPanel.tsx` (estado + chaves + último envio +
  "onde criar a chave") e `features/google-shopping/ui/GoogleShoppingPanel.tsx` (o corpo atual).
- **Hooks**: `useAnalyticsSettings` (core), `useAnalyticsSecretStatus`/`useSaveAnalyticsSecret`
  (`features/google-analytics/model`), `useLastPurchaseSend` (lê `orders` com admin).
- **Nav**: a entrada "Google Shopping" vira **"Google"** → `/admin/google`.

---

## Data Models

### `store_settings.analytics`

```typescript
interface AnalyticsSettings {
  enabled: boolean          // AD-027: interruptor próprio; nasce false
  measurement_id: string    // semeado 'G-SQL517XDQZ'
  production_host: string   // semeado 'umaestrelinha.com.br' — host onde o tráfego NÃO é interno
}
```

`production_host` resolve o "sou produção?" sem env nova (a loja não tem `VITE_STORE_URL`) e serve
aos **dois** lados — navegador e `sendPurchase` leem o mesmo valor. Não é editável na tela nesta
fase (muda uma vez, na troca de domínio); fica registrado no Apêndice B.

### `public.analytics_secrets` (tabela nova)

```sql
create table public.analytics_secrets (
  key text primary key check (key = 'ga4_api_secret'),
  value text not null check (char_length(value) between 1 and 128),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.analytics_secrets enable row level security;
-- nenhuma policy: só service_role lê e grava
revoke all on public.analytics_secrets from anon, authenticated;
```

### `orders` (colunas novas)

| Coluna | Tipo | Quem escreve |
| --- | --- | --- |
| `ga_client_id` | `text null` | `checkout` (allowlist) |
| `ga_session_id` | `text null` | `checkout` |
| `analytics_declined` | `boolean not null default false` | `checkout` |
| `ga_purchase_status` | `text null check in ('sending','sent','failed','skipped_declined','skipped_disabled')` | `sendPurchase` |
| `ga_purchase_at` | `timestamptz null` | `sendPurchase` |

Nenhuma é exposta à cliente: `get-order`/`customer_order_events` não as selecionam (conferir na task).

### `Product` (loja)

`nuvemshop_id: number | null` passa a existir no tipo, no `mapDbToProduct` e nos dois `select`
(`PRODUCT_SELECT` já traz por `*`; `PRODUCT_CARD_SELECT` ganha a coluna — `cardSelect.test.ts`
acompanha). **`item_id` é o do produto** (`publicProductId`), e a variação vai em `item_variant`:
dispensa carregar o `nuvemshop_id` das variações no card e na sacola. *(Ajuste de `EVT-13`: a spec
falava em "variação ou produto"; fica o do produto, que é o `item_group_id` do feed.)*

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| --- | --- | --- |
| Script do gtag bloqueado ou fora do ar | `track` vira no-op (o `gtag` é a fila do `dataLayer`, não lança) | nenhum |
| Leitura de `store_settings` falha | `enabled` = `false` (padrão seguro) | nenhum; não mede |
| `localStorage` lança | estado em memória; aviso a cada visita | aviso reaparece |
| MP do Google lento ou erro | `AbortController` 2000 ms, `failed` gravado, pagamento segue | nenhum para a cliente; painel mostra a falha |
| Chave ausente com medição ligada | `skipped_disabled`; painel avisa (`ANL-07`) | — |
| Webhook repetido | reivindicação `is null` não casa → sai sem enviar | — |
| `requireAdmin` falha | 401/403, sem corpo com dado | a tela mostra erro de permissão |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- |
| O webhook só carrega 4 colunas do pedido | `mercado-pago/handlers.ts:921` | `sendPurchase` sem totais nem itens | `sendPurchase` faz a própria leitura por `orderId`; não reaproveita o `order` do chamador |
| `order_items` é inserido com spread do item | `checkout/handlers.ts:352` | campo novo no item vai ao banco | nada de campo novo em item; os ids do GA vão no **pedido** |
| `COLUNAS_DO_PEDIDO` é allowlist | `checkout/handlers.ts:208` | coluna fora dela some em silêncio (AD-012) | task inclui probe HTTP contra o banco local provando que as 3 colunas gravam |
| `index.ts` não é lido por ferramenta nenhuma | `wiringResolve.test.ts` | function nova morta em produção sem nada acusar | o guarda já varre todo `index.ts` por derivação do disco — a function nova entra sozinha |
| Comentário com import sem `.ts` mata o `supabase start` | `CLAUDE.md`, merge 48/49 | ambiente local fora do ar | descrever a forma proibida, nunca escrevê-la, em `core/analytics` |
| `PRODUCT_CARD_SELECT` exclui colunas de propósito | `mapProduct.ts:103` | `nuvemshop_id` fora quebra `item_id` em silêncio (cairia no UUID) | `cardSelect.test.ts` passa a exigir a coluna |
| Aviso fixo no rodapé × barra de compra / CTA do checkout | `ProductBuyBar`, `CheckoutPage` | CTA coberto em 390 | aviso não bloqueia (some no X); prova em navegador em 390×844 obrigatória no fecho |
| `politicaComDonoUnico` conta 9 seções | `pages/__tests__/politicaComDonoUnico.test.ts:99` | seção nova reprova | âncora sobe para 10 junto com a seção, com o título novo nomeado |
| Guardas da loja varrem `apps/**` e `supabase/**` | `brandScan`, `chaveDeServidorForaDoNavegador`, `notificationSingleOwner` | feature do painel reprova a suíte da loja | o gate de todas as tasks inclui a suíte da loja |
| Teste não pode afirmar o que o GA "aceitou" | MP responde 2xx sempre | "enviado" ≠ "aceito" | o painel diz **"enviado ao Google"** (Paper corrigido); validação real é DebugView no fecho |

---

## Tech Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| `item_id` | `publicProductId` (produto) | é o `item_group_id` do feed; evita carregar o id de variação no card e na sacola |
| Orçamento do `POST` do servidor | 2000 ms, separado do `fireTrigger` | `AD-008`; o webhook tem 8000 ms no total |
| `traffic_type` | por `production_host` em `store_settings` | um dono para os dois lados; sem env nova |
| `add_to_cart` | uma chamada com `quantity = qty`, fora do laço de `addItem` | o laço chama `addItem` N vezes |
| `begin_checkout` | por montagem da página | F5 no checkout é nova entrada, e o GA4 mede assim |
| Chave secreta | tabela sem policy + function com `requireAdmin` | `AD-034`: operação de `service_role` passa por edge function |

**Decisões de projeto registradas em `.specs/STATE.md`**: `AD-046` (tela de integração com ≤ 3
seções pode desenhar o registro como fileira de links — refina `AD-038`) e `AD-047` (medição: o
`purchase` é do servidor, a chave secreta mora em tabela sem policy).
