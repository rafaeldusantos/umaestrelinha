# State — Nanita Store

## Active Feature
- (planejada) `08-checkout-one-page` — Checkout one-page de 3 blocos (boards Paper `04`–`07`), com
  cotação real do Melhor Envio, CPF do pagador, endereços salvos e order bump. `spec.md` (44 requisitos,
  6 stories) + `context.md` escritos em 2026-07-27 a partir do discovery no Paper + varredura do código.
  Spec passou por review independente: **7 achados bloqueantes + 16 não-bloqueantes**, todos verificados
  e incorporados na rev. 2. `design.md` (abordagem A: domínio puro em core + Zustand) e `tasks.md`
  (30 tasks em 7 fases) escritos em 2026-07-27. **Execute concluído (T1–T29 + docs do T30) em
  2026-07-28**, em 5 batches de sub-agents. Monorepo: **652 testes, 0 falhas** (227 core + 363 store
  + 62 backoffice); `pnpm build` verde nos dois apps. As 3 migrations **já aplicadas** no Supabase
  local (o bloqueio de ambiente caiu — Docker rodando). Pendente: Verifier independente, sandbox do
  Mercado Pago e os commits. Detalhes em `## Handoff`.
- (planejada) `07-product-catalog-admin` — Reforma do cadastro e da listagem de produto no backoffice,
  com modelo de variação como fonte de verdade. `spec.md` (55 requisitos, 14 stories), `design.md` e
  `tasks.md` (42 tasks em 8 fases) escritos em 2026-07-27 a partir do `context.md` + artboards do Paper
  (página Backoffice) + varredura do código. Spec passou por review independente: 6 achados bloqueantes
  verificados e incorporados. **Execute não iniciado.** Bloqueio de ambiente: as 7 migrations dependem
  do MCP `supabase` autenticado ou do CLI local.
- (discovery) `06-mockup-editor-ia` — Editor de mockup em tela cheia + guias de sangria + assistência
  por IA. Desenho concluído no Paper (arquivo Nanapin, página Backoffice) e decisões consolidadas em
  [`.specs/features/06-mockup-editor-ia/context.md`](../features/06-mockup-editor-ia/context.md) em
  2026-07-27. `spec.md` / `design.md` / `tasks.md` pendentes. Sugestão de fatiamento: frentes A+B
  (tela cheia + sangria, sem custo externo) e frente C (IA) como features separadas.
- (concluída) `05-mockup-generator` — Engine canvas de composição + coleção no Admin (aplicar arte→`images[]`) + prévia realista na Loja
- (concluída) `03-backoffice-ui-standardization` — Redesign da tela de produto (2 colunas) + shared components e padronização de UI do admin

## Decisions
- [2026-04-16] Design system v3 afeta globalmente toda a loja (não só HomePage)
- [2026-04-16] Fontes: Lilita One (display), Outfit (headings), DM Sans (body)
- [2026-04-16] Paleta migra de cool lavender para warm cream (#FFF9F5)
- [2026-07-18] Pagamentos: exclusivamente Mercado Pago via `POST /v1/payments` (API clássica),
  edge function `mercado-pago` como única porta server-side. Decisão build-vs-buy documentada
  em `.specs/features/02-checkout-mercado-pago/` (discovery aprovado)
- [2026-07-18] Cartão sempre tokenizado no browser (CardPayment Brick) — nenhum PAN/CVV toca
  o backend (PCI SAQ-A). Vale para qualquer feature futura de pagamento
- [2026-07-18] Fim das políticas RLS `Allow all`: novas tabelas/features usam políticas
  escopadas por usuário + `service_role` para mutações de sistema
- [2026-07-20] Backoffice: UI padroniza em **tokens shadcn** (`bg-card`/`border-border`/
  `text-foreground`/`text-muted-foreground`) e em **shared components** de `apps/backoffice/src/shared/ui`
  (PageHeader, FormCard, StatCard, AdminTable, Pagination, EmptyState, Skeletons, FieldGroup).
  Uso direto de `nana-*` nas páginas admin fica restrito a accents de marca/gradiente. Não muda a
  paleta (tokens apontam para os mesmos valores warm-cream do design v3). Loja pública segue com `nana-*`.
- [2026-07-20] Feature `mockup-generator`: engine própria de composição em canvas (`@nanapin/core/mockup`),
  sem API externa. Template de mockup = fundo + overlay (banco de prontos), art-zone elipse normalizada 0..1.
  Nova tabela+bucket `mockup_templates` com RLS escopada (leitura pública, escrita admin `has_role`). Renders do
  Admin anexam ao `images[]` (bucket `product-images`). Mockup é **só exibição** — impressão/carrinho seguem com a
  arte chapada. `loadImage` seta `crossOrigin` p/ evitar canvas tainting no export.
- [2026-07-27] **Specs numeradas**: pastas em `.specs/features/` nascem com prefixo sequencial de dois
  dígitos na **ordem de criação** (`01-`…`06-`), imutável e independente de prioridade ou status.
  Renomeadas as 5 existentes via `git mv` (histórico preservado). Convenção em `CLAUDE.md` → Workflow de specs.
- [2026-07-27] **IA no produto — divisão por capacidade.** A IA **lê imagem e devolve JSON** (detectar
  art-zone, auditar template, julgar render, revisar arte do cliente, alt-text/SEO, triagem) e **gera
  cenário — o fundo do template — nunca o mockup composto nem a foto final do produto**. A composição
  segue na engine determinística de `@nanapin/core/mockup`, porque um modelo generativo redesenharia a
  arte do cliente. Geração de imagem exige **inpainting por máscara** (a máscara sai da art-zone), e
  toda saída de IA é **proposta**: engine valida, humano aprova — nada grava sozinho. Provedor de
  texto+visão: **Claude** (visão 2576 px, structured outputs por `json_schema`, prompt caching);
  provedor de imagem em aberto, decidido pelo critério da máscara. Claude **não gera imagem** — são
  dois fornecedores, atrás de uma interface por capacidade. Vale para qualquer feature futura de IA.
  Detalhes em `.specs/features/06-mockup-editor-ia/context.md`.
- [2026-07-27] **Segredos de IA só server-side.** Chave de LLM/gerador vive apenas como secret de edge
  function (`supabase secrets set`), nunca com prefixo `VITE_` — o backoffice é Vite e qualquer `VITE_*`
  vai no bundle público. A function valida `has_role(auth.uid(),'admin')` internamente (RLS de tabela
  não protege uma function) e registra cada chamada em `ai_jobs` (action, provider, modelo, tokens,
  custo) para auditoria e teto de gasto. Mesmo padrão de porta única do `mercado-pago`.

- [2026-07-27] **Checkout one-page** (`08-checkout-one-page`): padrão de 3 blocos numa página
  (Contato → Entrega → Pagamento) com resumo persistente no lugar do passo "Revisão". Critério da
  escolha: one-page converte melhor em **AOV baixo + SKU simples + recompra alta** (perfil da loja);
  multi-step ganharia em AOV alto e primeira compra. **Login segue obrigatório** — guest checkout
  descartado (custaria pedido sem `customer_id`, RLS por token e vínculo retroativo). Consequência:
  a faixa de login expresso do board `04` sai do checkout; o atalho fica no overlay de `features/auth`.
- [2026-07-27] **Preço de qualquer desconto por item é server-side.** `mercado-pago/index.ts` recalcula
  `unit_price` a partir de `products.base_price` e descarta o valor enviado pelo cliente (PAY-03) —
  correto como antifraude, mas significa que desconto calculado no front é **exibido e não cobrado**.
  Toda oferta por item (order bump agora, upsell depois) tem o desconto aplicado dentro da edge
  function, lendo a configuração de `store_settings`. Vale para qualquer feature futura de promoção.
- [2026-07-27] **RLS de `customers` e `addresses` precisa de UPDATE.** Ambas nasceram com SELECT +
  INSERT apenas (`20260414121021_*.sql:202-208`), então `AuthContext.tsx:160-164` já atualiza
  `customers.name` e **falha em silêncio** (RLS nega retornando 0 linhas, sem erro). Novas escritas de
  perfil/endereço exigem policy de UPDATE escopada (`user_id = auth.uid()` / `customer_id IN (...)`).
  Lição geral: `.update()` no Supabase sem policy não lança — checar linhas afetadas, não só `error`.

## Blockers
(nenhum)

## Lessons
(nenhum ainda)

## Deferred
(nenhum ainda)

## Handoff
- [2026-07-28] `08-checkout-one-page` — **Execute concluído: T1–T29 de 30** (5 batches: P1 · P2 · P3 ·
  P4+P5 · P6+P7). Do T30 sobrou só a geração dos commits. **Nada commitado** — por decisão do
  orquestrador, porque o working tree carrega trabalho não commitado de outra feature
  (`04-store-login-ux`) e os commits saem de uma vez, agrupados pelos 7 `Commit group` de `tasks.md`.
  - **Entregue.** Domínio puro em `@nanapin/core`: `validators/cpf.ts` (+`maskCep`), `shipping/estimate.ts`
    (dias úteis, janela de entrega, opção mais barata), `checkout/blocks.ts` (`resolveBlocks`,
    `isOrderStale`), `applyOrderBump` dentro de `payment/pricing.ts`, `useCheckoutSettings` e a chave
    `checkout` em `SettingsKey`/`SettingsMap`/`DEFAULTS`. 3 migrations (`orders_shipping_snapshot`,
    `customer_address_update_rls`, `store_settings_checkout`), **já aplicadas no Supabase local**.
    Edge function `mercado-pago` com pagador identificado (`payer.identification` para PIX **e**
    cartão, vencendo o Brick) e bump precificado no servidor. Loja: `checkoutStore` (Zustand +
    `sessionStorage`), `useShippingQuote`/`useCepLookup`, `entities/customer` + `entities/address`,
    `ContactBlock`/`DeliveryBlock`/`PaymentBlock`/`OrderBump`, `OrderSummary` (sidebar + barra),
    `CheckoutPage` one-page com header próprio e CTA único, `entities/order/ui/OrderTimeline`,
    `entities/order/api/useOrder` e `/pedido/:id` como rota de verdade. Backoffice: aba **Checkout**
    em Configurações com `features/settings/ui/CheckoutSettingsCard` (order bump). Apagados os 6
    componentes do fluxo de 5 passos (incl. `ReviewStep` e `StepIndicator`).
  - **Gates.** `pnpm test` verde: **652 testes** (227 core + 363 store + 62 backoffice), 0 falhas.
    O Batch 5 sozinho levou de 588 → 652 (**+64**: T26 +14, T27 +26, T28 +11, T29 +13).
    `pnpm build` verde nos dois apps. Os dois greps da spec voltam zero (paleta de CNF-06 e literais
    de frete de SHP-04). Lint sem aviso novo nos arquivos tocados.
  - **Flake conhecido, não é regressão:** `pnpm test` às vezes sai 1 por um erro **pós-teardown** do
    `input-otp@1.4.2` (`ReferenceError: window is not defined`) nos testes de auth da
    `04-store-login-ux`. **Nenhum teste falha.** Rodar de novo.
  - **PENDÊNCIAS MANUAIS (nenhuma prova automatizada — a Test Coverage Matrix classifica estas camadas
    como manuais):**
    1. **`supabase stop && supabase start` antes de exercitar a edge function.** O edge runtime local
       monta um bind mount por arquivo importado, calculado quando o container sobe; como o T10 passou
       a importar `payer.ts` e `validators/cpf.ts`, o worker devolve **503 "Module not found"** até o
       restart. Não é defeito de código — `deno check` passa.
    2. **Exercitar o sandbox do Mercado Pago** (herdado da `02`, nunca exercitado): PIX com CPF, cartão
       com CPF divergente do Brick, e pedido sem CPF (deve dar 422). É o que fecha **BMP-04** ("exibido
       == cobrado", comparando o total do rótulo do CTA com `orders.total` persistido) e **PGD-04**.
    3. **Verificar a RLS em banco vivo** com dois usuários autenticados: A não atualiza `customers`
       nem `addresses` de B (**PGD-05**, **ADR-03**). O roteiro está no corpo da migration
       `customer_address_update_rls.sql`.
    4. **Verifier independente** (autor ≠ verificador) pendente — os 44 requisitos estão em
       `Implementing` na traceability, não em `Verified`.
  - **Não é pendência:** as 3 migrations **já foram aplicadas** no Supabase local durante o Batch 2.
    Falta aplicá-las no hosted, quando houver hosted.
- [2026-07-21] `mockup-generator` — Execute + Verifier **PASS** (T1–T16; 17 commits atômicos `b61d6a9..f120253`,
  1 por task + fixup `221d690`) no branch `feat/backoffice-ui-standardization`. Entregue: engine
  `@nanapin/core/mockup` (composeMockup/loadImage/geometria, 19 testes) + tipos `@nanapin/supabase/types/mockup`;
  migrations bucket+tabela `mockup_templates` (RLS escopada); `useMockups` (core); backoffice `entities/mockup`
  + `features/mockup-studio` (ArtZoneEditor, MockupTemplateDialog, MockupStudioDialog + `renderPlan` 9 testes) +
  `AdminMockupsPage` (`/admin/mockups`); loja `features/mockup-preview` + aba "Prévia real" no `CustomPinPage`.
  Verifier (`validation.md`): 8/8 ACs unit + 13/13 build-gate, gates core 92 / backoffice 49 verdes, builds+tsc ok,
  sensor 5/5 mutantes mortos, +28 testes, STR-03 (impressão/carrinho chapados) preservado. **PENDÊNCIAS MANUAIS
  (bloqueiam runtime):** (1) aplicar as 2 migrations no Supabase (local/hosted) — MCP supabase não-autenticado nesta
  sessão; (2) preparar 3–5 templates (fatiar PSD de pin-button em fundo+overlay PNG) e cadastrá-los em `/admin/mockups`;
  (3) UAT em browser real do export/tainting (ENG-02 é contrato mockado em node). Não pushado. Branch compartilhada
  com sessão concorrente ativa (brand/store) — commits deste feature ficaram contíguos; WIP alheio intocado.
- [2026-07-20] `backoffice-ui-standardization` — Execute + Verifier concluídos (T1–T23) no branch
  `feat/backoffice-ui-standardization` (criado de `feat/checkout-mercado-pago`), 1 commit atômico
  por tarefa. Entregue: shared components em `apps/backoffice/src/shared/ui` (PageHeader, FormCard,
  StatCard, AdminTable, Pagination, EmptyState, Skeletons, FieldGroup) com 40 testes (vitest novo no
  backoffice); tela de produto redesenhada em 2 colunas (sticky Publicação/Resumo); AdminLayout com
  active-state por prefixo + drawer mobile; 9 páginas migradas para os componentes e tokens shadcn;
  Cupons migrado de sonner→use-toast; removidos ProductForm e StatsCard mortos. Verifier: PASS
  (`validation.md`) — build ok, lint na baseline (28 err/7 warn, 0 novos), sensor 3/3 mutantes mortos,
  sem regressão de payload/handlers. Gap não-bloqueante (MIG-06): accents de marca `nana-*` mantidos
  por não terem equivalente shadcn (exceção de identidade prevista). Não commitado/pushado além dos
  commits atômicos. Obs.: branch compartilha commits `feat(auth)` de uma sessão concorrente
  (`store-login-ux`), fora do escopo desta feature.
- [2026-07-18] `checkout-mercado-pago` — Execute concluído (T1–T19) no branch
  `feat/checkout-mercado-pago`, 1 commit atômico por tarefa. Domínio (`packages/core/src/payment`,
  73 testes), migrations (schema/RLS/RPC/Realtime), edge function `mercado-pago`, checkout real
  na loja (fluxo Revisão→Pagamento, Brick de cartão, PIX com Realtime, pagar pendente na conta)
  e payment_status no backoffice. `pnpm build && pnpm test` verdes.
  Pendências de ambiente (CLI supabase indisponível na máquina de execução): exercitar a edge
  function localmente (`supabase functions serve`), roteiro sandbox MP (cartão APRO/OTHE, webhook
  assinado, PIX) e aplicar migrations no hosted. Observação: `orders.payment_method` é gravado
  como `pix` na criação (método real é escolhido depois, no passo Pagamento) — follow-up se o
  filtro do admin precisar do método real. Verificação independente (Verifier) pendente —
  traceability em `Implementing`.
