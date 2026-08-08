# PRD — Revisão Crítica do Codebase Nanita Store

> **Data:** 2026-07-18 · **Branch:** `refactor/monorepo-fsd` · **Método:** auditoria de código dos 2 apps (`apps/store`, `apps/backoffice`), packages compartilhados, migrations e edge functions.
> **Objetivo:** base única para quebra de features e priorização de implementação.

**Legenda usada em todo o documento**

| Campo | Escala |
|---|---|
| **Prioridade** | P0 (bloqueia vender) · P1 (completa o fluxo de venda) · P2 (conversão/retenção/gestão) · P3 (diferenciais) |
| **Dificuldade** | Baixa (horas–2 dias) · Média (2–5 dias) · Alta (1–3 semanas) |
| **Ganho** | Crítico / Alto / Médio / Baixo — com o eixo: Receita, Conversão, AOV (ticket), Retenção, Operação, Risco/Segurança, Marca |

---

## 1. Sumário executivo

O projeto tem uma **base de produto acima da média** para o estágio: catálogo funcional, carrinho/wishlist/cupom reais, um **editor de botton personalizado completo** (`/crie-seu-botton`, canvas com upload, stickers, texto, gradientes — a feature mais madura da loja), backoffice com CRUD de produtos de 7 abas, pedidos com **integração real Melhor Envio** (cotação → etiqueta → rastreio) e dashboard em tempo real.

O que separa isso de um e-commerce que fatura são **quatro bloqueadores concentrados no fim do funil e na fundação**:

1. **Não existe pagamento.** O PIX é um QR fake, dados de cartão são coletados e descartados. Todo pedido nasce `pending` e a transição para `paid` é manual no admin.
2. **Segurança de dados grave.** Policies RLS `USING (true)` em `orders`/`order_items`/`order_status_history`/`order_notes` permitem que **qualquer visitante anônimo leia e altere todos os pedidos** (com PII). Totais do pedido são calculados no cliente e aceitos pelo banco sem validação.
3. **O checkout perde dados que a operação precisa.** CPF, telefone, **CEP** e complemento são coletados e descartados — sem CEP, a geração de etiqueta Melhor Envio no admin falha.
4. **Schema drift.** As migrations versionadas não criam `collections`, `abandoned_carts` nem ~15 colunas que o código usa (`stock_total`, `variants`, `sizes/finishes`, dimensões etc.). Num banco recriado do zero, **todo produto aparece "Esgotado"** e módulos inteiros falham silenciosamente.

Nada disso é grande em volume de código — é trabalho de fundação (1 sprint focada resolve P0). Depois disso, o roadmap natural é: completar o fluxo de venda (frete real no checkout, variantes na PDP, rastreio, e-mails), depois conversão/retenção (reviews reais, guest checkout, recuperação de carrinho fase 2, SEO), e então os diferenciais onde a Nanita pode ser única: **kit mix & match de bottons, drops com hype real, galeria de criações da comunidade e gamificação de colecionador**.

---

## 2. Estado atual — Loja (`apps/store`)

### 2.1 Funciona de verdade ✅

| Área | Estado | Evidência |
|---|---|---|
| Catálogo (Home, Categoria, PDP) | Funcional; filtros/ordenação client-side | `pages/CategoryPage.tsx`, `entities/product/api/useProducts.ts` |
| Galeria de produto com zoom | Completa (thumbs, fullscreen, zoom 250%) | `entities/product/ui/ProductGallery.tsx` |
| Carrinho + drawer + barra de frete grátis | Completo, persistido (Zustand) | `entities/cart/model/cartStore.ts` |
| Wishlist | Completa, porém só localStorage | `entities/wishlist/model/wishlistStore.ts` |
| Cupons (percent/fixed/free_shipping, validade, min., 1º pedido) | Funcional de ponta a ponta | `packages/core/src/hooks/useCoupons.ts` |
| **Editor "Crie seu Botton"** | Funcional: upload, drag, zoom, 16 cores + gradientes, 60 stickers, texto multi-camada, export PNG, **vai ao carrinho** | `pages/CustomPinPage.tsx` (727 linhas) |
| Auth (e-mail/senha + Google) + conta com histórico de pedidos | Funcional | `packages/auth`, `pages/AccountPage.tsx` |
| Checkout wizard 5 passos + ViaCEP + criação de pedido no Supabase | Funciona **até** o pagamento | `pages/CheckoutPage.tsx`, `entities/order/api/useOrders.ts` |
| Captura de carrinho abandonado + link de recuperação | Funcional (fase 1) | `features/abandoned-cart`, `features/recover-cart` |
| Cotação de frete na PDP (Melhor Envio) | Funcional | `features/shipping-calc/ui/ShippingCalc.tsx` |
| WhatsApp float + share de produto | Funcional (usa settings) | `widgets/whatsapp-float` |

### 2.2 Mock, fake ou quebrado ❌

| Problema | Detalhe | Onde |
|---|---|---|
| **Pagamento 100% mock** | QR PIX placeholder, código copia-e-cola hardcoded, cartão coleta número/CVV e joga fora (anti-padrão PCI) | `features/checkout/ui/PaymentStep.tsx` |
| **Desconto PIX 5% prometido e nunca aplicado** | Promessa aparece em 4 lugares (PaymentStep, MarqueeBar, TrustBar, Políticas); total ignora | `PaymentStep.tsx`, `widgets/home-sections` |
| **Frete do checkout hardcoded** | SEDEX R$18,90 / Jadlog R$12,90 fixos; a edge function real só é usada na PDP | `features/checkout/ui/ShippingStep.tsx` |
| **Checkout descarta CPF, telefone, CEP e complemento** | Pedido gravado sem `address_zip` → etiqueta Melhor Envio falha no admin | `CheckoutPage.tsx:38`, `AddressStep.tsx:42` |
| **Busca por URL quebrada** | `/busca` não lê `?q=`; header e TrendingTags navegam para `/busca?q=...` → página vazia | `pages/SearchPage.tsx` |
| Links para `/colecao` (sem slug) → 404 | Home carousel e CategoryGrid "Ver todas" | `HomePage.tsx:46`, `widgets/category-grid` |
| **Reviews 100% mock** | 3 avaliações hardcoded iguais em todo produto; tabela `reviews` (com moderação) existe e não é usada | `entities/review/ui/ReviewList.tsx` |
| **PDP sem seletor de variante** | ProductCard tem seletor size/finish; a PDP não — adiciona sem variante; carrinho não exibe variante; bloco "Detalhes" é hardcoded | `entities/product/ui/ProductInfo.tsx`, `CartItem.tsx` |
| `OrderConfirmationPage` órfã | Nenhuma navegação aponta para `/pedido/:id`; sucesso do checkout promete "confirmação no e-mail" que não existe | `App.tsx`, `CheckoutPage.tsx:73` |
| Newsletter fake | Submit só muda estado local; promete cupom de 10% que não existe | `features/newsletter` |
| DropCountdown fake | Conta até "sexta 18h" fixo no código; ignora tabela `drops`; botão "Ativar lembrete" sem onClick | `widgets/home-sections/ui/DropCountdown.tsx` |
| HeroBanner vitrine | "+2.000 colecionadores" hardcoded; grid de produtos = 4 divs vazias | `widgets/hero-banner` |
| Sem SEO | Sem helmet/título dinâmico; `SeoSettings` do admin não são consumidos; og:image aponta para URL do Lovable | `index.html:20` |
| Loading states fracos | Home/Categoria/Busca sem skeleton; PDP e Categoria mostram **"não encontrado" durante o loading** | `ProductPage.tsx`, `CategoryPage.tsx` |
| Sem guest checkout, sem "esqueci a senha", sem endereços salvos | Tabela `addresses` existe e não é usada | `pages/AuthPage.tsx`, `pages/AccountPage.tsx` |
| Custom pin: arte em base64 | Arte vai como dataURL no localStorage (risco de quota ~5MB) e inteira em `order_items.product_image`; nada sobe ao Storage; preços hardcoded no front | `CustomPinPage.tsx:373-400` |
| "Monte seu Kit" só vitrine | 3 cards com preços fixos que linkam para `/colecao/anime`; não existe lógica de kit | `features/custom-pin/ui/MonteSeuKit.tsx` |
| NotFound em inglês, fora do layout | | `pages/NotFound.tsx` |

Dead code: `useNewProducts`, `useOrdersByEmail`, `useCart`, `TrustBar`, `shared/ui/NavLink`.

---

## 3. Estado atual — Backoffice (`apps/backoffice`)

### 3.1 Funciona de verdade ✅

| Área | Estado | Evidência |
|---|---|---|
| Dashboard | 9 queries reais + **realtime** em `orders`; gráfico 7/30 dias, alertas de estoque, top produtos | `entities/stats/api/useAdminStats.ts` |
| **Produtos — CRUD completo** | Form de 7 abas: upload múltiplo c/ compressão WebP + drag-reorder, variantes tamanho×acabamento c/ SKU, margem, dimensões p/ frete, SEO preview, relacionados/compre-junto, agendamento, duplicar, TipTap | `pages/admin/AdminProductFormPage.tsx`, `features/product-form` |
| Categorias | CRUD com hierarquia 1 nível, cor, contagem de produtos | `features/category-form` |
| Coleções | CRUD manual (drag-and-drop) e automática (regras) | `features/collection-form` |
| **Pedidos — módulo mais maduro** | Paginação server-side, filtros, realtime, detalhe 5 abas (resumo/rastreio/**Melhor Envio completo**/timeline/notas), mudança de status c/ histórico, cancelamento c/ motivo | `pages/admin/AdminOrdersPage.tsx`, `features/order-management` |
| Cupons | CRUD completo (react-hook-form + zod), stats, badges de expirado/esgotado | `pages/admin/AdminCouponsPage.tsx` |
| Carrinhos abandonados | Métricas (valor em risco, taxa de recuperação), filtros, detalhe | `pages/admin/AdminAbandonedCartsPage.tsx` |
| Configurações | 5 abas (geral/frete/pagamento/SEO/carrinho) sobre `store_settings` | `pages/admin/AdminSettingsPage.tsx` |
| Auth admin | Login + `RequireAdmin` via `user_roles` + RLS `has_role()` | `packages/auth/src/RequireAdmin.tsx` |

### 3.2 Parcial, quebrado ou ausente ❌

| Problema | Detalhe |
|---|---|
| **Import CSV provavelmente quebrado** | Insere com chaves `price`/`stock_total` sem o remapeamento `price→base_price` que o form faz; sem relatório de erro por linha | 
| **Link de recuperação de carrinho gerado com origem errada** | Usa `window.location.origin` do backoffice (:8081); a rota `/carrinho?recover=` só existe na loja — link inválido desde o split do monorepo |
| Link "Ver Loja" quebrado | Aponta para `/` do próprio backoffice → NotFound |
| Status `separating` viola o CHECK constraint | UI oferece 6 status; a migration inicial só permite 5 — transição falha se o CHECK existir no banco |
| Export CSV exporta só a página atual | Recebe o array paginado de 20 pedidos |
| Clientes raso | Sem busca, paginação, LTV/ticket, edição, endereços, canal de comunicação |
| Lembrete de carrinho abandonado desabilitado | Botão `disabled` hard-coded; sem provedor de e-mail; **nenhum processo marca `active→abandoned/lost`** (threshold das settings não é consumido por nada) |
| Sem decremento de estoque na venda | `stock_total` só muda manualmente; oversell possível; alerta usa `lte(stock_total, 5)` fixo ignorando `low_stock_threshold` |
| Sem máquina de estados de pedido | Qualquer transição permitida; `order_status_history.created_by` sempre NULL (auditoria sem autor) |
| Sem gestão de conteúdo da home | Hero, marquee, depoimentos, contadores — tudo hardcoded na loja |
| Sem moderação de reviews | Tabela `reviews` tem coluna `approved` + policy admin, zero UI |
| Sem relatórios | Só dashboard; nada exportável por período/categoria/produto |
| Sem multi-usuário/roles | Papel binário admin; enum tem `moderator` sem uso; **conceder admin é só via SQL** |
| Sem NF-e, sem devoluções/RMA, sem criação manual de pedido, sem reembolso | |
| Admin sem menu mobile | Sidebar `hidden md:flex` sem hambúrguer |
| Imagens órfãs no Storage | Remover imagem só tira do array; `deleteProductImage` existe e nunca é chamado |

Dead code: `ProductForm.tsx`, `ProductFormDialog.tsx`, `shared/ui/DataTable.tsx`, `resolveAutoCollection`, `updateStatus` (abandoned carts).

---

## 4. Estado atual — Backend (Supabase)

### 4.1 O que existe

- **17 tabelas** com RLS habilitado; funções `has_role()` (SECURITY DEFINER), trigger que cria `customers` no signup, RPC `increment_coupon_usage` com guarda de `max_uses`.
- **1 edge function**: `melhor-envio` (345 linhas, completa: quote/create/print/tracking, sandbox por default).
- `store_settings` key/value JSONB com seeds e RLS correta (leitura pública, escrita admin).
- Buckets `products` e `product-images` (upload real usa o segundo).

### 4.2 Riscos de segurança (todos verificados no código) 🔴

| # | Risco | Onde |
|---|---|---|
| S1 | **`orders`, `order_items`, `order_status_history`, `order_notes` com policy `FOR ALL USING(true) WITH CHECK(true)` sem `TO`** → anon lê/altera/deleta qualquer pedido (PII: nome, e-mail, endereço) | `20260415090935:88-110`, `20260415160758` |
| S2 | **Total do pedido calculado no cliente e aceito pelo banco** — sem trigger/RPC validando contra `products.base_price`; `order_number` gerado no cliente; sem idempotência (duplo clique = 2 pedidos) | `apps/store/src/entities/order/api/useOrders.ts:87-132` |
| S3 | Edge function `melhor-envio` **sem autenticação** (`verify_jwt=false`) e usando SERVICE_ROLE internamente — qualquer pessoa com a URL gera etiqueta (gasta saldo) e escreve na order | `supabase/config.toml:351`, `functions/melhor-envio/index.ts` |
| S4 | `abandoned_carts`: INSERT anon irrestrito (spam) + UPDATE anon de qualquer carrinho `active` (vaza/permite alterar e-mails de clientes) | `.lovable/sql/003` |
| S5 | Bucket `product-images` com escrita para **qualquer usuário autenticado** (não só admin) | `20260415095816` |
| S6 | `coupons` legível por anon incluindo inativos/futuros; `increment_coupon_usage` executável por qualquer autenticado sem vínculo a pedido | `20260418113443` |

### 4.3 Schema drift (fonte de verdade quebrada) 🟠

- **Sem migration**: tabelas `collections` e `abandoned_carts`; colunas de `products` usadas pelo código (`compare_price`, `cost_price`, `stock_total`, `sizes`, `finishes`, `variants`, `seo_*`, `video_url`, `weight_kg/width_cm/height_cm/length_cm`, `scheduled_at`, `related_product_ids`, `buy_together_ids`); colunas de `categories` (`parent_id`, `banner_url`, `color_accent`, `emoji`).
- Consequência: num banco criado só pelas migrations, `stock_total` = undefined → **loja inteira "Esgotado"**; coleções e carrinhos abandonados falham silenciosamente (hooks engolem erro).
- Status `separating` (backoffice) e `confirmed` (badge na loja) violam/extrapolam o CHECK de `orders.status`.
- Migrations duplicadas de `store_settings` (`20260416000000` ≡ `20260417015945`).
- Types em `packages/supabase/src/types` são escritos à mão e divergem — **não há `supabase gen types`**.
- Tabelas mortas: `product_variants` (admin salva variantes como JSON no produto), `addresses`, `profiles`, `wishlist`, `reviews`, `drops` — criadas e não consumidas por nenhum app.

### 4.4 Ausências estruturais

Gateway de pagamento (zero SDK/env no repo) · e-mail transacional (zero provedor) · cron/fila (ciclo de carrinho abandonado não roda) · decremento de estoque · webhook de rastreio · validação server-side de cupom no uso.

---

## 5. Decisões de produto (perguntas-chave)

### 5.1 Página dedicada de personalização — **já existe; precisa de hardening, não de criação**

`/crie-seu-botton` (`CustomPinPage.tsx`) já é um editor canvas completo: upload de foto, posicionamento por drag, zoom, 16 cores + gradientes (inclusive custom), 60 stickers, camadas de texto com 7 fontes e rotação, export PNG 2x, touch, e **adiciona ao carrinho de verdade**. É o maior diferencial já construído.

O que falta para ser vendável (ver épico E12):

1. **Arte → Supabase Storage** no "adicionar ao carrinho" (hoje: base64 no localStorage — estoura quota — e inteira no banco).
2. **Preços vindos do banco/settings** (hoje 4 tamanhos hardcoded no front) e validados no servidor.
3. **Visão de produção no admin**: pedido com item personalizado precisa exibir/baixar a arte em alta (existe via base64, mas frágil) + checklist de produção.
4. Salvar rascunhos na conta, refazer pedido de uma arte anterior, compartilhar criação (vira P3/diferencial).

### 5.2 "BlackPink tem infinitas artes": categoria, produto ou opção? — **Recomendação: arte = produto; fandom = categoria/coleção; tamanho/acabamento = variante**

| Conceito | Papel recomendado | Exemplo |
|---|---|---|
| **Categoria** | Eixo de navegação permanente (fandom/tema) | K-Pop → BlackPink (subcategoria — `parent_id` já existe) |
| **Coleção** | Agrupamento editorial/transversal, manual ou por regra (já implementado no admin) | "Comeback 2026", "Dia das Mães", "Mais vendidos" |
| **Produto** | **Uma arte** — foto própria, slug/URL próprio, estoque próprio | "Botton BlackPink — Logo Coração" |
| **Variante** | Dimensões do mesmo item: tamanho × acabamento (já existe no admin como JSON; falta seletor na PDP) | 3,5cm / 4,5cm · fosco / brilhante |

**Por que não** um produto "BlackPink" com 200 opções de arte na tela de detalhe:

- **SEO**: 1 URL vs. 200 URLs indexáveis ("botton blackpink logo coração") — para nicho de fã, busca orgânica é o canal mais barato.
- **Estoque e analytics**: você precisa saber *qual arte* vende e *qual arte* acabou. Opção dentro de produto único enterra os dois.
- **Wishlist, reviews, compartilhamento** ficam por arte — fã compartilha a arte específica.
- **UX**: dropdown/grid com centenas de imagens dentro da PDP é pior que a grade da categoria, que já É o seletor de artes.

**Como fica a experiência** (mudanças pequenas sobre o que existe):

1. Página da categoria = a "galeria de artes" (já existe).
2. PDP ganha **seletor de variante** (tamanho/acabamento) + carrossel **"Outras artes desta coleção"** para trocar de arte sem voltar (estilo swatch de cor).
3. Camada de cima: **modo kit na categoria** — "escolha quaisquer 5 por R$ 23" com seleção múltipla nos cards (ver E15) — resolve a compra em volume, que é como botton se compra.
4. Cauda infinita de artes de verdade (sob demanda) = território do editor `/crie-seu-botton`, não do catálogo.

---

## 6. Backlog priorizado (formato PRD)

### FASE P0 — Destravar a primeira venda real (fundação) 🔴

#### E1 · Gateway de pagamento (PIX + cartão)
- **Prioridade** P0 · **Dificuldade** Alta · **Ganho** Crítico (Receita — sem isso não há loja)
- **Escopo**: integrar gateway BR (recomendação: **Mercado Pago** — PIX nativo, cartão, parcelamento, boleto; alternativas: Pagar.me, Asaas, Stripe). Edge function `create-payment` (cria preferência/cobrança server-side a partir do pedido) + edge function `payment-webhook` (confirma `pending→paid`, com validação de assinatura). PaymentStep passa a renderizar QR PIX real e tokenização de cartão do gateway (nunca tocar em número/CVV — remover os campos atuais). Aplicar `pix_discount_percent` das settings no total (promessa já exibida em 4 lugares).
- **Dependências**: E2 (criação de pedido server-side), E3 (schema).
- **Critérios de aceite**: pedido só vira `paid` via webhook; reembolso/cancelamento refletem status; nenhum dado de cartão transita pelo nosso backend.

#### E2 · Pedido server-side + correção de RLS (segurança)
- **Prioridade** P0 · **Dificuldade** Média-Alta · **Ganho** Crítico (Risco/Segurança + integridade de receita)
- **Escopo**:
  1. RPC transacional `create_order(...)`: valida preço de cada item contra `products`, recalcula subtotal/desconto/frete, valida cupom **no servidor** e incrementa uso atomicamente, decrementa estoque (com guarda de oversell), gera `order_number`, insere order + items numa transação, idempotency key.
  2. **Substituir as policies `USING(true)`** de `orders`/`order_items`/`order_status_history`/`order_notes` por: cliente lê os próprios pedidos (`customer_id = auth.uid()` via customers), admin tudo; escrita só via RPC/admin.
  3. Corrigir S3–S6: `verify_jwt` na `melhor-envio` (restrita a admin), `abandoned_carts` update restrito, bucket `product-images` escrita só admin, leitura de `coupons` só ativos/vigentes.
- **Critérios de aceite**: anon não lê pedido alheio; alterar preço no devtools não altera o total gravado; 2 cliques = 1 pedido.

#### E3 · Reconciliação de schema + types gerados
- **Prioridade** P0 · **Dificuldade** Média · **Ganho** Alto (Operação — ambiente reproduzível, CI, onboarding)
- **Escopo**: escrever migrations para tudo que o código usa (tabelas `collections`, `abandoned_carts`; colunas de `products` e `categories` listadas em §4.3); alinhar CHECK de `orders.status` com os 6 status da UI (incluir `separating`; decidir `confirmed`); remover migration duplicada de `store_settings`; adotar `supabase gen types typescript` e substituir os types manuais de `packages/supabase`.
- **Critérios de aceite**: `supabase db reset` local → loja e backoffice 100% funcionais sem passos manuais.

#### E4 · Checkout não perde dados (CPF, telefone, CEP, complemento)
- **Prioridade** P0 · **Dificuldade** Baixa · **Ganho** Alto (Operação — etiqueta Melhor Envio depende de `address_zip`; contato do cliente depende do WhatsApp)
- **Escopo**: propagar todos os campos coletados até `orders`/`customers`; enviar `phone`/`document` reais no payload da etiqueta (hoje vazios).

#### E5 · E-mail transacional mínimo
- **Prioridade** P0 · **Dificuldade** Média · **Ganho** Alto (Confiança/Operação — o checkout já promete "confirmação no e-mail")
- **Escopo**: provedor (recomendação: **Resend**, DX simples em edge function Deno) + templates: pedido recebido, pagamento aprovado, pedido enviado (com rastreio). Disparo via webhook de pagamento (E1) e mudança de status no admin.

---

### FASE P1 — Completar o fluxo de venda 🟠

#### E6 · Frete real no checkout
- **Prioridade** P1 · **Dificuldade** Baixa-Média · **Ganho** Alto (Receita/Operação — hoje SEDEX/Jadlog são valores inventados: risco de prejuízo por frete subcotado)
- **Escopo**: ShippingStep consome `melhor-envio?action=quote` (a function e a UI de cotação já existem na PDP); dimensões/peso do kit calculadas dos produtos; fallback para tabela fixa se a API cair. Preencher dimensões nos produtos (admin já tem os campos).

#### E7 · Variantes na PDP + carrinho ciente de variante
- **Prioridade** P1 · **Dificuldade** Média · **Ganho** Alto (Conversão — produto físico com tamanho/acabamento sem seletor gera pedido ambíguo)
- **Escopo**: seletor tamanho×acabamento na `ProductInfo` (padrão já existe no ProductCard); preço por variante (`price_override`); `CartItem` exibe variante; estoque por variante bloqueia compra; remover bloco "Detalhes" hardcoded (3,8cm) e usar dados do produto.

#### E8 · Correções de navegação e busca
- **Prioridade** P1 · **Dificuldade** Baixa · **Ganho** Médio-Alto (Conversão — busca é porta de entrada e está quebrada)
- **Escopo**: `SearchPage` lê `?q=`; rota `/colecao` (índice de categorias) ou corrigir os 2 links que apontam para ela; usar `OrderConfirmationPage` após checkout (`/pedido/:id`); NotFound pt-BR dentro do layout; link "Ver Loja" do admin e link de recuperação de carrinho usam **URL da loja vinda de settings** (`store_url`), não `window.location.origin`.

#### E9 · Rastreamento para o cliente
- **Prioridade** P1 · **Dificuldade** Média · **Ganho** Alto (Retenção/Operação — reduz "cadê meu pedido" no WhatsApp)
- **Escopo**: AccountPage e `/pedido/:id` exibem timeline de status + `tracking_code` com link da transportadora; consulta de rastreio via function (já existe `action=tracking`); e-mail de "enviado" (E5) linka para cá.

#### E10 · Estoque decrementado e confiável
- **Prioridade** P1 · **Dificuldade** Média · **Ganho** Alto (Operação — evita vender o que não existe)
- **Escopo**: decremento na RPC do pedido (E2) e restauração no cancelamento; alerta de estoque usa `low_stock_threshold` por produto; badge "Esgotado" na PDP bloqueia compra (hoje só o card bloqueia).

#### E11 · Máquina de estados do pedido + auditoria
- **Prioridade** P1 · **Dificuldade** Baixa-Média · **Ganho** Médio (Operação)
- **Escopo**: transições válidas (`pending→paid→separating→shipped→delivered`, cancelamento com regras); `created_by` preenchido no histórico; motivo em toda transição sensível.

#### E12 · Custom pin production-ready
- **Prioridade** P1 · **Dificuldade** Média · **Ganho** Alto (AOV/Marca — é o diferencial da loja e hoje é frágil)
- **Escopo**: upload da arte ao Storage no add-to-cart (URL no carrinho/pedido, nunca base64); preços por tamanho vindos do banco (produto "botton personalizado" com variantes) e validados na RPC; aba/print de produção no detalhe do pedido no admin (arte em alta + specs); limite de resolução/formatos no upload.

---

### FASE P2 — Conversão, retenção e gestão 🟡

#### E13 · Guest checkout + fricção de conta
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Alto (Conversão — login obrigatório é o maior atrito atual do funil)
- **Escopo**: checkout como convidado (customer por e-mail); "esqueci minha senha" (flow Supabase já suporta); endereços salvos (tabela `addresses` já existe) com seleção no checkout.

#### E14 · Reviews reais com moderação
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Alto (Conversão — prova social; hoje é mock e arrisca a confiança)
- **Escopo**: form de avaliação (só quem comprou — verificação por order), fotos opcionais; tabela `reviews` já existe com `approved`; UI de moderação no admin; nota agregada no card/PDP; substituir os 3 mocks.

#### E15 · Recuperação de carrinho — Fase 2 (fechar o ciclo)
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Alto (Receita direta — a captura e as métricas já existem; falta o disparo)
- **Escopo**: `pg_cron`/scheduled function `process-abandoned-carts` (`active→abandoned→lost` usando `threshold_hours` já configurável); edge function `send-abandoned-cart-reminder` (Resend, com link de recuperação **da loja** + cupom das settings); habilitar botão manual no admin; respeitar `marketing_consent`.

#### E16 · SEO técnico
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Alto (Aquisição — nicho de fã compra por busca; hoje a loja é invisível)
- **Escopo**: `react-helmet-async` com título/OG por página (produto usa `seo_title/seo_description` que o admin já edita); sitemap.xml gerado das tabelas; robots.txt; JSON-LD Product (preço, disponibilidade, rating); avaliar prerender/SSG das PDPs (Vite SSG) — decisão separada.

#### E17 · Busca server-side + trending real
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Médio (Conversão)
- **Escopo**: Postgres FTS (ou `pg_trgm`) com índice; debounce; "Tá Bombando" da home passa a usar vendas reais (order_items 7d — query já existe no admin) em vez de `slice(0,8)`; TrendingTags dinâmico.

#### E18 · Newsletter real
- **Prioridade** P2 · **Dificuldade** Baixa-Média · **Ganho** Médio (Retenção/Aquisição)
- **Escopo**: tabela `newsletter_subscribers` + double opt-in via Resend + cupom de boas-vindas real (gerar cupom `first_order_only`); export/segmentação no admin.

#### E19 · Relatórios e export no admin
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Médio (Operação/decisão)
- **Escopo**: vendas por período/categoria/produto/cupom; export CSV **de todo o filtro** (não só a página); corrigir import CSV (remap `base_price`, relatório de erros por linha, dry-run).

#### E20 · CRM básico de clientes
- **Prioridade** P2 · **Dificuldade** Baixa-Média · **Ganho** Médio (Retenção/Operação)
- **Escopo**: busca/paginação/ordenação; LTV, ticket médio, nº pedidos; notas internas; atalho WhatsApp com template (settings já têm mensagem padrão); edição de dados cadastrais.

#### E21 · Comunicação transacional via WhatsApp
- **Prioridade** P2 · **Dificuldade** Média-Alta (API oficial) ou Baixa (deep links manuais) · **Ganho** Médio-Alto (Retenção — público jovem BR vive no WhatsApp)
- **Escopo mínimo**: botões "avisar cliente" no pedido (deep link `wa.me` com mensagem pronta por status). Evolução: WhatsApp Business API para disparo automático.

#### E22 · Wishlist sincronizada + avise-me
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Médio (Retenção)
- **Escopo**: sync da wishlist com a tabela existente quando logado (merge com local); "avise-me quando voltar" em produto esgotado + e-mail de reposição (gancho para E5).

#### E23 · Gestão de conteúdo da home
- **Prioridade** P2 · **Dificuldade** Média · **Ganho** Médio (Marketing autônomo — hoje qualquer banner exige deploy)
- **Escopo**: hero/banners/marquee/contadores editáveis (chave `home` em `store_settings` ou tabela `banners` com imagem no Storage); depoimentos reais (pode nascer de reviews aprovadas de E14); HeroBanner com produtos reais em vez de divs vazias.

---

### FASE P3 — Diferenciais, hype e "features LOL" 🟣

#### E24 · Kit mix & match ("escolha 5 por R$ 23") ⭐ maior alavanca de AOV
- **Prioridade** P3 (primeiro da fila) · **Dificuldade** Média-Alta · **Ganho** Alto (AOV — botton se compra em lote; o site já anuncia kits que não existem)
- **Escopo**: regras de kit (3/5/10 unidades com preço fixo ou % progressivo) em settings/tabela; modo seleção múltipla na página de categoria + barra de progresso "faltam 2 para o kit"; kit como agrupamento no carrinho/pedido; MonteSeuKit passa a ser real. Precificação validada na RPC (E2).

#### E25 · Drops reais com hype
- **Prioridade** P3 · **Dificuldade** Média · **Ganho** Médio-Alto (Urgência/Marca — mecânica nativa de cultura pop; tabela `drops` já existe)
- **Escopo**: admin agenda drop (produtos + data + estoque limitado); countdown real na home (substitui o fake); "ativar lembrete" funcional (e-mail/WhatsApp); página do drop com estado antes/durante/esgotado; badge "Drop #N".

#### E26 · Compartilhar criação + galeria da comunidade
- **Prioridade** P3 · **Dificuldade** Média · **Ganho** Médio (Aquisição viral/Marca — transforma o editor em canal de marketing)
- **Escopo**: salvar design com URL pública (`/criacao/:id`, OG image = a arte); botão "clonar e editar"; galeria curada (opt-in + moderação no admin); "criação da semana" com cupom.

#### E27 · Gamificação de colecionador
- **Prioridade** P3 · **Dificuldade** Alta · **Ganho** Médio (Retenção/Recompra — identidade de colecionador é o core do público)
- **Escopo**: álbum de coleção na conta ("você tem 3 de 12 da coleção BlackPink") com base nos pedidos; badges (1ª compra, 1º custom, coleção completa); recompensa por completar (cupom/frete grátis). Depende de coleções bem cadastradas (já suportado no admin).

#### E28 · Mystery box / blind bag
- **Prioridade** P3 · **Dificuldade** Baixa · **Ganho** Médio (AOV/Marca — clássico do mercado de colecionáveis, quase só cadastro)
- **Escopo**: produto "caixa misteriosa" por tema; sorteio dos itens na separação (checklist no admin); unboxing como conteúdo social.

#### E29 · Fan vote — "qual arte lançamos?"
- **Prioridade** P3 · **Dificuldade** Baixa-Média · **Ganho** Médio (Engajamento + validação de demanda antes de produzir)
- **Escopo**: enquete de artes candidatas (home/Instagram embed); quem votou recebe e-mail no lançamento; vira insumo do drop (E25).

#### E30 · Microinterações e delícia de UX
- **Prioridade** P3 · **Dificuldade** Baixa · **Ganho** Baixo-Médio (Marca — barato e memorável)
- **Escopo**: confetti/bounce no add-to-cart, botton "girando" no hover do card (flip 3D), easter egg Konami code com cupom, progress bar de frete grátis com mascote, skeletons com shimmer nas listas (corrige §2.2 loading).

#### E31 · Multi-usuário e auditoria no admin
- **Prioridade** P3 · **Dificuldade** Média · **Ganho** Baixo-Médio agora (Operação — vira P1 quando o time crescer)
- **Escopo**: UI de gestão de `user_roles` (enum `moderator` já existe); trilha de auditoria em produtos/cupons/settings (`updated_by` já existe na tabela e nunca é preenchido).

#### E32 · NF-e / obrigações fiscais
- **Prioridade** P3 (vira P1 com volume) · **Dificuldade** Alta · **Ganho** Depende do enquadramento
- **Escopo**: integração emissor (Focus NFe, eNotas) disparada em `paid`; campos fiscais no produto (NCM/CFOP/origem).

---

## 7. Matriz de priorização (visão única)

| # | Épico | Prioridade | Dificuldade | Ganho | Eixo do ganho | Depende de |
|---|---|---|---|---|---|---|
| E1 | Gateway de pagamento | P0 | Alta | Crítico | Receita | E2, E3 |
| E2 | Pedido server-side + RLS | P0 | Média-Alta | Crítico | Segurança/Receita | E3 |
| E3 | Reconciliação de schema + types | P0 | Média | Alto | Operação | — |
| E4 | Checkout persiste CPF/CEP/fone | P0 | Baixa | Alto | Operação | — |
| E5 | E-mail transacional mínimo | P0 | Média | Alto | Confiança | E1 |
| E6 | Frete real no checkout | P1 | Baixa-Média | Alto | Receita/Operação | E4 |
| E7 | Variantes na PDP + carrinho | P1 | Média | Alto | Conversão | E3 |
| E8 | Navegação e busca (fixes) | P1 | Baixa | Médio-Alto | Conversão | — |
| E9 | Rastreio para o cliente | P1 | Média | Alto | Retenção | E5 |
| E10 | Estoque decrementado | P1 | Média | Alto | Operação | E2 |
| E11 | Máquina de estados do pedido | P1 | Baixa-Média | Médio | Operação | — |
| E12 | Custom pin production-ready | P1 | Média | Alto | AOV/Marca | E2 |
| E13 | Guest checkout + senha + endereços | P2 | Média | Alto | Conversão | E2 |
| E14 | Reviews reais + moderação | P2 | Média | Alto | Conversão | E3 |
| E15 | Carrinho abandonado fase 2 | P2 | Média | Alto | Receita | E5, E3 |
| E16 | SEO técnico | P2 | Média | Alto | Aquisição | — |
| E17 | Busca server-side + trending real | P2 | Média | Médio | Conversão | — |
| E18 | Newsletter real | P2 | Baixa-Média | Médio | Retenção | E5 |
| E19 | Relatórios + export/import CSV | P2 | Média | Médio | Operação | — |
| E20 | CRM básico de clientes | P2 | Baixa-Média | Médio | Retenção | — |
| E21 | WhatsApp transacional | P2 | Baixa→Alta | Médio-Alto | Retenção | — |
| E22 | Wishlist sync + avise-me | P2 | Média | Médio | Retenção | E5 |
| E23 | CMS da home (banners) | P2 | Média | Médio | Marketing | — |
| E24 | Kit mix & match ⭐ | P3 | Média-Alta | Alto | AOV | E2 |
| E25 | Drops reais | P3 | Média | Médio-Alto | Urgência/Marca | E5 |
| E26 | Galeria da comunidade | P3 | Média | Médio | Aquisição viral | E12 |
| E27 | Gamificação de colecionador | P3 | Alta | Médio | Retenção | E14, coleções |
| E28 | Mystery box | P3 | Baixa | Médio | AOV | — |
| E29 | Fan vote | P3 | Baixa-Média | Médio | Engajamento | — |
| E30 | Microinterações | P3 | Baixa | Baixo-Médio | Marca | — |
| E31 | Multi-usuário admin + auditoria | P3 | Média | Baixo-Médio | Operação | — |
| E32 | NF-e | P3→P1 c/ volume | Alta | Situacional | Compliance | E1 |

**Leitura sugerida do roadmap**: P0 completo (E1–E5) é ~1 sprint focada e é o que transforma o projeto em loja. E8 (fixes de navegação) e E4 são *quick wins* que podem entrar imediatamente, em paralelo. Entre os diferenciais, **E24 (kits)** é o de melhor razão ganho/esforço para o modelo de negócio de bottons e já tem vitrine no site prometendo a feature.

---

## 8. Higiene técnica (fazer junto, sem épico próprio)

- Remover dead code: loja (`useNewProducts`, `useOrdersByEmail`, `useCart`, `TrustBar`, `NavLink`) e backoffice (`ProductForm.tsx`, `ProductFormDialog.tsx`, `DataTable.tsx`, `resolveAutoCollection`, `updateStatus`).
- Deletar imagem do Storage ao removê-la do produto (`deleteProductImage` já existe, nunca é chamado).
- Unificar sistema de toast na loja (hoje shadcn Toaster + Sonner montados juntos).
- Skeletons de lista no catálogo; eliminar flash de "não encontrado" durante loading (PDP/Categoria).
- Menu mobile no admin; item ativo da sidebar por prefixo de rota.
- Corrigir mock residual de decisões antigas: `.lovable/memory/index.md` menciona client hardcoded que não existe mais.
- Testes: hoje há 1 teste placeholder. Prioridade mínima: testes da RPC `create_order` (E2) e do cálculo de cupom/frete.

---

## 9. Riscos se nada for feito

| Risco | Gatilho | Severidade |
|---|---|---|
| Vazamento de PII de pedidos (RLS aberta) | Qualquer pessoa com a publishable key (que é pública por definição) | 🔴 Crítica — LGPD |
| Fraude de preço (total aceito do cliente) | Usuário editando payload no devtools | 🔴 Crítica |
| Prejuízo por frete subcotado | Valores fixos de SEDEX/Jadlog abaixo do real | 🟠 Alta |
| Loja quebrada em ambiente novo | Recriar banco a partir das migrations (CI, novo dev, disaster recovery) | 🟠 Alta |
| Confiança do cliente | Promessas fake visíveis: desconto PIX não aplicado, e-mail que não chega, avaliações inventadas | 🟠 Alta |
| Perda de venda silenciosa | Busca por URL quebrada, links 404 na home | 🟡 Média |
