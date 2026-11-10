# 98 · O pagamento que falhou — pagar de novo na loja, e o pago por fora registrado no painel

Costura de 2026-11-09. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC | Título | Origem |
| -- | ------ | ------ |
| UC-01 | Pagar de novo um PIX que venceu ou foi recusado | caso de uso do PRD |
| UC-02 | Pedido de cartão que não foi concluído | caso de uso do PRD |
| UC-03 | Registrar no painel um pagamento feito fora da loja | caso de uso do PRD |
| UC-04 | Conferir um pagamento registrado | caso de uso do PRD |
| UC-05 | A Adri gera um novo link de cartão para o mesmo pedido | caso de uso do PRD |
| UC-06 | Cancelamento automático do pedido não pago | caso de uso do PRD |

**Achados de eval que este Work Item resolve**

`nada`: o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

`nada`: o humano não informou insumo nenhum (`item.md` › Insumos vazio).

## Fora do escopo

Do `prd.md` › Escopo › Fora, verbatim:
- Estorno e reembolso pelo painel.
- Conciliação automática com o extrato.
- Registrar pagamento pelo app do ateliê (o app só mostra o pagamento registrado).

Máquina de estados do pagamento (`packages/core/src/payment/status.ts:15-22`): `pending→approved|rejected|expired|cancelled`,
`rejected→pending|approved`, `expired→approved`, `approved→refunded`, `cancelled` terminal. Este WI acrescenta
uma exceção declarada: o **desfazer** do registro manual leva `approved` de volta ao estado anterior ao registro,
só para origem manual, e fora de `canTransition` (Decisão 14).

## Design

Fontes: `nada`. Nenhuma fonte de design (PRD sem link de UI/UX, `item.md` sem link, `PROJECT.md` sem fonte `fixo`).
Pergunta ao humano, 2026-11-09: "O WI 98 tem telas novas (formulário 'Registrar pagamento' no painel, tela de
pagamento por cartão aberta pelo link, avisos ao cliente) e nenhuma fonte de design. Como sigo?" — resposta:
**"Seguir sem design (Recommended)"**. As telas novas seguem o desenho que já existe:

- **Registrar pagamento (painel)** — tela própria do pedido, não modal (`apps/backoffice/CLAUDE.md` › Molde dos
  formulários: "Editor é TELA"), com `FormCard`, `FieldGroup`, `ActionButton`, `RecordPageHeader`; o portão de aviso
  da feature 88 (`features/order-notice › useGestoComAviso`, `NoticeDialog.tsx`).
- **Bloco Pagamento do pedido (painel)** — o de hoje (`AdminOrderPage.tsx:761-784`), com o registro, os comprovantes
  por URL assinada, os selos e as ações.
- **Tela do link de cartão (loja)** — molde de `apps/store/src/pages/ProposalCheckoutPage.tsx` (rota em `App.tsx:244`),
  com `PaymentBlock`/`CardPaymentBrick`, `PaymentProgress`, `PaymentApproved`.
- **Avisos à cliente (loja)** — `widgets/order-action/ui/OrderActionPanel.tsx` (`Cartao`, `ConversarNoWhatsApp`) e
  `entities/order/lib/attention.ts` / `AttentionList`.

Divergências entre fontes: `nada`.

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

- **Instruções** — `CLAUDE.md` (inteiro); `supabase/CLAUDE.md` › O deploy é automático, Migrations, RLS, Edge functions,
  `admin-users`, `mercado-pago`, `send-notification`, `checkout`, `order-proposals`; `apps/backoffice/CLAUDE.md` ›
  Molde dos formulários, Pedidos e a fila de material, O aviso à cliente é escolha (88), Montar pedido (89), Dívidas
  (upload); `apps/store/CLAUDE.md` › Carrinho/checkout, Parcelas, O PIX tem endereço (AD-042), O cartão espera por
  cima do checkout, Checkout sem conta, Minha conta e detalhe do pedido, `/pedido-montado`; `apps/mobile-adm/CLAUDE.md`
  › Pedidos (74), Ações (75), Guardas, Testes; `packages/core/CLAUDE.md` › pertencimento, Pureza, módulos, Dinheiro,
  `orders/*`, `order-actions`, `proposals`, Convenções de tipo; `DESIGN.md` › 1, 7, 8.
- **Recorte** — UC-01, UC-02, UC-03, UC-04, UC-05, UC-06.

### O que já serve

| O que | Onde | Cobre |
| ----- | ---- | ----- |
| O servidor aceita cobrar de novo `pending`/`rejected`/`expired` | `supabase/functions/mercado-pago/handlers.ts:177`, `:381-386` | UC-01 |
| Cancelar a order anterior no MP (nunca lança) | `mercado-pago/handlers.ts › cancelPreviousOrder` (:190-222), chamada em `:1004-1006` | CA-01.4; base de CA-03.5a e CA-06.3 |
| Pedido montado cobrado pelo preço travado | `mercado-pago/handlers.ts:420-433`, `› lockedProposalCharge` (:1173-1259) | CA-01.5 (pedido montado) |
| "Pagar com PIX" | `apps/store/src/entities/order/lib/podePagarComPix.ts:40-45` | CA-01.1 (com o recorte de CA-03.16) |
| Janela de 7 dias do PIX novo | `packages/core/src/orders/repix.ts:19`, `› podeGerarNovoPix` (:49-53), `› repixDeadline` (:35-39) | CA-01.2 |
| Cartão do topo e "Conversar no WhatsApp" | `OrderActionPanel.tsx › ConversarNoWhatsApp` (:75-94), `case 'payment_lost'` (:142-150) | CA-02.1, CA-06.5 |
| Máquina de estado do pagamento | `packages/core/src/payment/status.ts:15-22` | RNF-01 |
| Efeito completo de "pago" | `supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql:23-122` | CA-03.3, CA-03.4 |
| Venda do Dashboard/Início | `20261104140000_acessos-com-sacola.sql:269-287` | CA-03.7 por construção |
| `order_paid` × `material_instructions` | `packages/core/src/notifications/triggers.ts:55-59`; `precondition.ts:88-96` | CA-03.8 |
| Previsão do aviso / portão | `core/notifications/notice.ts › customerNoticeFor`; `features/order-notice › useGestoComAviso`, `NoticeDialog.tsx` | CA-03.8 |
| Porta `trigger` do motor (admin, `customer: false`) | `send-notification/handlers.ts:137-142`, `› runTrigger` (:166-187) | CA-03.8 |
| `dispatchTrigger` no mesmo processo | `send-notification/dispatch.ts:420`; molde `mercado-pago/handlers.ts › fireTrigger` (:114) | CA-06.6 |
| Escrita por RPC no dono, client injetado | `packages/core/src/order-actions/material.ts › writeMaterialStatus` | RNF-02 |
| Tabela só de admin com nome de quem gravou, `on delete set null` | `20261108120000_95-observacao-do-pedido.sql:20-53`; `core/order-actions/adminNote.ts › writeAdminNote` | RNF-08, CA-04.3 |
| Credencial por fragmento + hash | `core/checkout/guestAccess.ts › newAccessToken`/`hashAccessToken`/`accessGrant` (:30, :39, :72); `core/proposals/link.ts`; `features/proposal-checkout/model/proposalToken.ts`; `get-proposal` em `checkout/handlers.ts` | UC-05 |
| Prova de posse na `create-payment` (JWT ou `access_token`) | `mercado-pago/handlers.ts:320-379`; `features/checkout/api/useCreatePayment.ts:114-116` | UC-05 (onde entra a terceira) |
| Brick, parcelas, aviso de recusa, espera | `features/checkout/ui/CardPaymentBrick.tsx`, `PaymentBlock.tsx`, `InstallmentPicker.tsx`, `lib/cardNotice.ts`; `features/order-payment/ui/PaymentProgress.tsx`, `PaymentApproved.tsx` | UC-05 |
| Meio pelo nome | `packages/core/src/orders/labels.ts:63-78`; voz da cliente em `apps/store/src/entities/order/lib/paymentDelivery.ts:19-26` | CA-04.1, CA-04.3 |
| Bloco "Pagamento e entrega" da cliente | `apps/store/src/entities/order/ui/OrderPaymentDelivery.tsx:60-66` | CA-04.3 |
| Leitura do detalhe no app com papel | `apps/mobile-adm/src/entities/order/api/usePedido.ts:84-106`; `entities/order/model/linha.ts:21-54` | RNF-09 |
| `order_notes` só admin | `20260919120000_52-entrega-de-email-comprovada.sql:79-84` | (incerteza da descoberta resolvida) |
| Lote que conta os de fora | `apps/backoffice/src/features/order-list/model/bulkMaterial.ts › runStatusBulk` (:175-193, `untouched`) | CA-03.9 |
| Botão que grava, trava, foco | `apps/backoffice/src/shared/ui/ActionButton.tsx`, `usePendingAction`, `shared/lib/foco.ts` | UC-03, UC-05 |

### O que muda

| O que | Onde | Mudança |
| ----- | ---- | ------- |
| `create-payment` não confere `orders.status` | `mercado-pago/handlers.ts:381-386` | Recusar cancelado, pago ou registrado antes de qualquer escrita ou chamada ao MP |
| `create-payment` regrava total e recusa 422 quando desconto cai; cupom esgotado sobe o total em silêncio | `mercado-pago/handlers.ts:722-770`, `:785-805`, `:676-687` | Gravar a primeira cobrança calculada pelo servidor em lugar só da service role e cobrar por ela dali em diante (molde `lockedProposalCharge`) |
| 422 "o valor mudou" ao pagar de novo | `apps/store/src/pages/OrderPaymentPage.tsx:121-153` (`PriceChangedContact`) | Fica só para a primeira cobrança; inalcançável no pagar de novo com valor travado |
| `OrderPaymentPage` recusa não-PIX | `OrderPaymentPage.tsx:219` | Sem mudança de regra; conferir que pedido pago à mão continua recusado |
| `podePagarComPix` só olha `status !== 'cancelled'` | `podePagarComPix.ts:40-45` | Recorte de CA-03.16 (pedido avançado à mão sem pagamento não oferece pagar), no dono |
| Cartão recusado/pendente | `repix.ts:42-62`; `orderActionState.ts:27-40`; `attention.ts:36-52` | Estado que lê tentativa de cobrança (`mp_order_id`); `RepixInput` ganha a coluna |
| Pedido cancelado no topo | `OrderActionPanel.tsx:98-99`; `attention.ts:37` | Estado "cancelado por falta de pagamento" + WhatsApp, por marcador próprio |
| Pendente→Pago sem pagamento | `packages/core/src/orders/nextStep.ts:63-68`, `:121-128`; `OrderNextStep.tsx:66-99` (`Select` :79-86, botão :95-97) | Levar não pago a Pago ou além abre a tela "Registrar pagamento" |
| Lote "Avançar status" | `bulkMaterial.ts:156-161` (`NEXT_STATUS`), `:175-193` | Exclui não pagos e diz quantos; `NEXT_STATUS` passa a ler `PROXIMO` de `core` |
| Bloco Pagamento do painel | `AdminOrderPage.tsx:761-784`; "Método" cru `:778`; "Pago em" no fuso do navegador `:781` | Meio por `paymentMethodLabel`, data em Brasília, registro, comprovantes, ações e selos |
| `apply_payment_approval` | `20261030120000_…sql:23-128` (`search_path` `public`) | Recriar em migration nova: chamada pela porta manual (data e autor), em cancelado não grava `paid_at`/estoque/cupom, em já pago marca em vez de calar |
| Webhook | `mercado-pago/handlers.ts:1355-1416` (no-op em `:1376-1393`; `duplicate_approved_other_order` em `:1357-1375`) | Marcador estruturado de "pago duas vezes" e "pago depois de cancelado", sem efeitos e sem `purchase` |
| Precondição de `order_paid`/`material_instructions` | `precondition.ts:88-96` | Recusar pedido cancelado |
| Gatilhos | `triggers.ts:55-59`, `:16-25` | Gatilho do registro manual (só cliente, sem `owner_order_paid`); gatilho e evento do cancelamento automático |
| Vocabulário de eventos | `core/notifications/events.ts:22-101`; `catalog.ts:45-139`; `defaults.ts:215`; `check` recriado em `20260920120000_57-avisos-para-a-dona.sql` | Evento novo, nascendo desligado, com `check` recriado |
| Cancelar pelo painel | `apps/backoffice/src/entities/order/api/useAdminOrders.ts:156-183`; `AdminOrderPage.tsx:208-247` | Fecha a cobrança aberta no MP; caixa de aviso continua como hoje |
| Histórico | `core/orders/history.ts › buildHistory` (`HistoryKind` :25); `useAdminOrder.ts:190-202`; `usePedido.ts:85-98` | Linha própria de "registrado" e "desfeito", com autor, quando e motivo |
| `order_list` | `20261110160000_pedido-montado-desconto-na-lista-de-pedidos.sql:18-42` | Só acrescenta no fim; nenhuma coluna de observação |
| Detalhe do app | `usePedido.ts:84-106`; `widgets/order-detail/ui/BlocoValores.tsx:60` | Leitura nova no mesmo `lerComPapel`, sem comprovante |
| Expirador de 24 h | `20260718235214_payment_approval_rpc.sql:86-108` | Sem mudança obrigatória |
| Selo do cartão expirado | `packages/core/src/orders/situation.ts:145` (`expired → 'pix_expired'` para qualquer meio) | Avaliar o selo do cartão |

### O que nasce

| O que | Onde | Por que nada existente serve |
| ----- | ---- | ---------------------------- |
| RPC admin "registrar pagamento" (data, autor, meio, idempotente, recusa a corrida) | `supabase/migrations/` | `apply_payment_approval` é só `service_role` e grava `now()` |
| RPC admin "desfazer registro" | `supabase/migrations/` | Não existe reversão |
| Tabelas do registro manual e dos comprovantes, só admin | `supabase/migrations/` | Coluna em `orders` chega à cliente |
| Bucket privado (primeiro do projeto) e URL assinada | `supabase/migrations/` (storage); painel | Todos os buckets são `public = true`; zero `createSignedUrl` |
| Envio de comprovante (JPG/PNG/WebP/HEIC/PDF, 10 MB, até 3, sem compressão, guarda caminho) | painel | `shared/lib/uploadImage.ts` aceita só PNG/JPEG/WebP (:51), 8 MB (:49), comprime e é público |
| Ações registrar/desfazer | `packages/core/src/order-actions/` | Nenhuma das cinco escritas cobre pagamento (`index.ts:13-25`) |
| Campo de data e hora em Brasília com limites | painel `shared/ui` + `core/time` | `DateField.tsx` é só data; `core/time` só formata |
| Credencial do link de cartão (um vivo por pedido) | `supabase/migrations/` (molde `order_proposals`) | `guest_access_*` é da compra e vence em 7 dias |
| Porta admin para gerar/invalidar o link | edge function (`requireAdmin`) | Nada gera credencial de pagamento de pedido existente |
| Leitura do pedido pelo token do link | `supabase/functions/checkout` (molde `get-proposal`, teto por IP) | `get-order` exige o token de 7 dias |
| Terceira prova de posse na `create-payment`, só cartão | `mercado-pago/handlers.ts:328-379`; `useCreatePayment.ts` | Hoje JWT e `access_token` |
| Tela da loja do link de cartão | `apps/store/src/pages/` + `features/` | `/pedido/:id/pagamento` é só PIX (AD-042) |
| Job do cancelamento automático | edge function agendada + agendamento | Nenhuma function é agendada; job SQL não chama o MP nem o motor |
| Marcadores "pago duas vezes", "pago depois de cancelado", "pagamento não registrado", "cancelado por falta de pagamento" | dados + `core/orders` | Só existe a string `duplicate_approved_other_order` em `mp_status_detail` |
| Rótulos dos meios manuais | `packages/core/src/orders/labels.ts` | `PAYMENT_METHOD_LABELS` (:63-69) não os tem |
| Valor travado da primeira cobrança | `supabase/migrations/` (só service role) | Nada guarda o valor calculado pelo servidor fora de `orders` |

### Exemplares

| Tipo de mudança | Siga a forma de |
| --------------- | --------------- |
| RPC admin + escrita no dono | `packages/core/src/order-actions/material.ts › writeMaterialStatus` + `useAdminOrders.ts › setMaterialStatus` (:208-225) |
| Tabela só de admin com autor e nome | `supabase/migrations/20261108120000_95-observacao-do-pedido.sql` + `core/order-actions/adminNote.ts` |
| Recriar `apply_payment_approval` | `20261030120000_pagamento-aprovado-marca-pago.sql` + `pagamentoMarcaPagoSchema.test.ts` |
| Recriar o `check` de evento | `20260920120000_57-avisos-para-a-dona.sql` |
| Políticas de storage com `has_role` | `20260815120000_24-home-gerenciavel.sql:240-275` (sem o `public` e a leitura pública) |
| Credencial em fragmento + hash | `core/checkout/guestAccess.ts`, `core/proposals/link.ts`, `features/proposal-checkout/model/proposalToken.ts`, `checkout/handlers.ts › get-proposal` |
| Tela de pagamento por link | `apps/store/src/pages/ProposalCheckoutPage.tsx` |
| Cobrança travada no servidor | `mercado-pago/handlers.ts › lockedProposalCharge` |
| E-mail de dentro de uma function | `mercado-pago/handlers.ts › fireTrigger` (:114) com `dispatchTrigger` |
| Job `pg_cron` condicionado à extensão | `20261104120000_presenca-na-loja.sql:209-222` |
| Portão de aviso | `features/order-notice › useGestoComAviso` + `NoticeDialog.tsx`; uso em `AdminOrderPage.tsx:160-180` |
| Lote que exclui e conta | `bulkMaterial.ts › runStatusBulk` + `bulkSummary` |
| Validação de arquivo | `apps/backoffice/src/shared/lib/uploadImage.ts › validateImageFile`/`uploadFailureMessage` (:66-80) |
| Cartão e frase do topo da loja | `OrderActionPanel.tsx` + `orderActionState.ts` |
| Leitura nova no app | `usePedido.ts:84-106` (leitura de `order_admin_notes`) |
| Formulário do painel | `shared/ui/FormCard`, `FieldGroup`, `ActionButton`, `RecordPageHeader` |

### Obrigações transversais

- "Defeito 01": "foi pago?", "pode pagar?", meio, marcadores e data em Brasília com um dono em `core` (`core/orders`, `core/order-actions`, `core/notifications`).
- Migration só local (`supabase migration up --local`); push com migration nova pede pergunta; migration aplicada é imutável (AD-017).
- RLS: `has_role` no `using` e no `with check`, `revoke` de `anon`, nenhum `grant` (molde da 95). Coluna nova em `orders` chega à cliente: observação, comprovante, hash do link e valor travado em tabela própria.
- Escrita do pedido só pelo dono (AD-059, `pedidoGravadoSoPeloDono.test.ts`); RPC nova na lista literal de `marcacaoSoPorAcao.test.ts:157-211`.
- `pagamentoMarcaPagoSchema.test.ts` lê a migration vigente da função; o probe `supabase/operacoes/pagamento-aprovado-marca-pago.probe.sql` é gate.
- `pagamentoComDonoUnico.test.ts` passa a nomear o dono do cartão por link (segunda superfície declarada).
- Vocabulário de eventos com um dono (`orderNotificationsSchema`, `storeSettingsDefaults`, `catalog.test.ts`, `eventIcons.test.ts`, `notificationSingleOwner`); `avisoComDonoUnico.test.ts`.
- Módulo de `core` alcançável pelo Deno: todo especificador relativo com `.ts`, `import type` incluso; nunca escrever a forma proibida em comentário (`denoReach`/`purity`).
- `strictNullChecks: false`: vereditos devolvem `string | null` ou discriminam por string.
- Fuso com um dono (`fusoComDonoUnico.test.ts`).
- Mobile primeiro (390×844, 44 px, sem rolagem lateral, prova a 100–200 %); `animacaoRespeitaMovimento.test.ts`; tom memorial.
- Rota nova da loja: `reservedSlugs`, `routes`, `sitemapRoutes`, `routeSplitting`, `metaPorRota`, `rotasDeApp`, `seo.test.ts`, `paginasFixasServidas`; `page_view` sem fragmento.
- App: `leituraSoComPapel.test.ts`, `escritaSoPelaPorta.test.ts`, `semDadoSensivelDeClienteNoApp.test.ts`.
- AD-012: toda tela que grava se prova por probe HTTP contra o banco local.
- Baselines sem regressão (`tsc -p apps/<app>/tsconfig.app.json`; suítes um workspace por vez, `--testTimeout=20000`); `payment/**` só com justificativa.
- Ordem de publicação: migration → functions (`mercado-pago`, `checkout`, `send-notification`, a nova) → bundles.

### Testes

**Integração no ambiente local (Postgres 54442 / API 54441)**
- Registrar: `approved`, `paid_at` = data informada, `pending→paid`, linha de histórico com autor, estoque uma vez, `used_count` +1.
- Registrar duas vezes e por duas admins ao mesmo tempo: nada repete. Registrar com o pedido já aprovado: recusa, nada gravado.
- Data futura ou anterior à criação: recusa com motivo.
- Desfazer: `paid_at` nulo, `payment_status` anterior, `paid→pending`, estoque e cupom devolvidos, observação preservada, histórico com motivo. Recusado fora de `paid` e em pagamento da loja.
- A venda do Dashboard/Início entra pela data informada e sai ao desfazer.
- Aprovação da loja em pedido cancelado: sem `paid_at` de venda, sem estoque, marcador. Em pedido já pago: sem efeitos, marcador.
- Comprovante: cliente logada e `anon` não leem nem gravam; URL assinada expira. RLS das tabelas novas.
- `order_list` e `get-order` não devolvem observação, comprovante, hash do link nem valor travado.
- Job de cancelamento: só `pending` não pago, 7 dias, depois do corte, sem material enviado/recebido; reinicia do desfazer; idempotente.
- `create-payment` servida localmente: cancelado ⇒ recusa sem MP; pagar de novo cobra o travado com promoção encerrada, cupom esgotado ou preço mudado; token de link inválido, substituído ou de pedido pago ⇒ recusa; link só cartão.

**Unidade (vitest, `packages/core` e functions com dublê)**
- Regras de oferta (PIX pendente; PIX novo em 7 dias; cartão recusado ou pendente com tentativa ⇒ informativo; abandonado ⇒ nada; cancelado ⇒ nada; cancelado por falta de pagamento ⇒ frase e WhatsApp; avançado à mão ⇒ sem oferta).
- Gatilho do registro manual: e-mail da cliente, sem aviso interno. Gatilho do cancelamento automático: e-mail próprio.
- Precondição recusa "pagamento confirmado" em cancelado.
- Pendente→Pago leva ao registro; lote exclui e conta.
- Data local de Brasília vira o instante certo; recusas de data.
- Recusa de arquivo antes da rede.
- Rótulos dos meios no painel e na cliente.
- Webhook marca e não repete efeitos.
- Link novo invalida o anterior.

**Componente e página real**
- Bloco Pagamento (meio, data, autor, observação, comprovantes; desfazer só em Pago; "Pagamento não registrado").
- Portão marca e desmarca o e-mail da cliente.
- Loja mostra o meio informado e nunca a observação.
- Tela do link mostra a situação de pedido pago ou cancelado.
- App mostra registro, meio, data e observação, sem comprovante.
- Recusa sobre o client real (`clientReal`).

**Prova em navegador**
- Formulário em 390 com galeria e câmera, sem rolagem lateral; tela do link em 390; cópia de "cancelado por falta de pagamento".

### Depende / Expõe

| Direção | Dado | Formato | Momento | Rota ou artefato |
| ------- | ---- | ------- | ------- | ---------------- |
| expõe | registrar pagamento | RPC admin `{ order_id, meio, pago_em, observação, comprovantes[] }` → desfecho | painel, via `core/order-actions` | — |
| expõe | desfazer | RPC admin `{ order_id, motivo }` | painel | — |
| expõe | comprovante | bucket privado + URL assinada curta | painel | — |
| expõe | gerar link de cartão | ação admin → `{ link }` | painel | — |
| expõe | resumo pelo token do link | ação pública com teto por IP | loja | molde `checkout/handlers.ts › get-proposal` |
| expõe | cobrar pelo token do link | `create-payment` com o token, só cartão | loja | `mercado-pago/handlers.ts:328-379` |
| expõe | registro manual para o app | colunas sem comprovante | app | `usePedido.ts:84-106` |
| expõe | meio informado e marcador de cancelamento à cliente | campo devolvido por `get-order`/leitura da cliente | loja | `OrderPaymentDelivery.tsx:63`; `checkout/handlers.ts:710-720` |
| expõe | e-mail "cancelado por falta de pagamento" | evento do motor | job | — |
| depende | cancelar a order no MP | `POST /v1/orders/{id}/cancel` | registrar, cancelar, gerar outro link | `mercado-pago/handlers.ts:196` |
| depende | agendamento | `pg_cron` (+ `pg_net` ou agenda de function) | job | `20260718235214_payment_approval_rpc.sql:86-108` |
| depende | aprovação pelo webhook | `type: "order"` | pedido já pago ou cancelado | `mercado-pago/handlers.ts:1263-1448` |

## Fronteira entre repositórios

`nada`: topologia de repositório único.

## Cobertura dos UCs

| UC | Reivindicado por |
| -- | ---------------- |
| UC-01 | monorepo |
| UC-02 | monorepo |
| UC-03 | monorepo |
| UC-04 | monorepo |
| UC-05 | monorepo |
| UC-06 | monorepo |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
| - | ---------- | ---------- | ------------ |
| 1 | O cancelamento automático alcança quais pedidos? | O recorte do job é `orders.status = 'pending'`, sem material `material_enviado`/`material_recebido`, criado depois da publicação (corte fixado na migration). CA-06.1/06.1a trocados no `prd.md` (r1) | humano no gate do PRD Tech Review, pela recomendação (`recorte-do-cancelamento-automatico` · tech_prd_edit · r1) |
| 2 | Pedido cancelado com cobrança aberta | Cancelar (automático **ou pela admin**) fecha a cobrança aberta no MP (`cancelPreviousOrder`); `create-payment` recusa pedido cancelado; aprovação que chega em cancelado não grava venda, estoque nem e-mail e marca "pago depois de cancelado". CA-06.3/06.4 (r1) | humano no gate do PRD Tech Review, pela recomendação (`cancelamento-com-cobranca-aberta` · tech_prd_edit · r1); a extensão ao cancelamento pela admin: conferência (Conflito 10 do lookup) |
| 3 | Pagamento em dobro | Registrar fecha a cobrança aberta; aprovação em pedido já pago não repete efeitos e marca "pago duas vezes", lido pelo painel. CA-03.5/5a/5b (r1) | humano no gate do PRD Tech Review, pela recomendação (`pagamento-em-dobro` · tech_prd_edit · r1) |
| 4 | De onde vem o valor travado | Da primeira cobrança calculada pelo servidor, guardada em tabela só da service role — nunca `orders.total` (BL-030); pedido montado segue `lockedProposalCharge`; pedido sem cobrança gravada (inclusive os pendentes de antes da publicação) é calculado como hoje. CA-01.5/01.6 (r1) | humano no gate do PRD Tech Review, pela recomendação (`preco-travado-pedido-de-catalogo` · tech_prd_edit · r1); pedidos antigos: conferência (Conflito 6) |
| 5 | Como o link de cartão se autoriza | Credencial própria (token no fragmento, hash no banco, um vivo por pedido, molde da 89), independente de conta e do acesso de 7 dias; reaproveita o Brick; é segunda superfície de pagamento declarada (revisa AD-042; `pagamentoComDonoUnico` nomeia o dono do cartão). CA-05.2/05.6/05.7 (r1) | humano no gate do PRD Tech Review, pela recomendação (`credencial-do-link-de-cartao` · tech_prd_edit · r1) |
| 6 | Efeitos do desfazer | Exceção explícita de "aprovado não regride", só origem manual: volta o `payment_status` anterior gravado no registro, tira `paid_at`, `paid→pending`, devolve o estoque **efetivamente baixado** (gravado no registro) e o uso do cupom. CA-03.11/03.12 (r1) | humano no gate do PRD Tech Review, pela recomendação (`desfazer-registro-efeitos` · tech_prd_edit · r1); quantidade gravada: conferência (Incerteza do lookup) |
| 7 | Os outros caminhos que marcam Pago | "Avançar mesmo assim", "Outro status" (inclusive o salto direto para Separando/Enviado/Entregue) e o lote levam um pedido não pago a "Registrar pagamento"; o lote exclui e conta. CA-03.9/03.16 (r1) | humano no gate do PRD Tech Review, pela recomendação (`outros-caminhos-que-marcam-pago` · tech_prd_edit · r1); salto além de Pago: conferência (Conflito 7) |
| 8 | Data do pagamento | Data e hora de Brasília, não futura, não anterior à criação. CA-03.2b (r1) | humano no gate do PRD Tech Review, pela recomendação (`limites-da-data-do-pagamento` · negocio · r1) |
| 9 | Informativo de cartão pendente | Só com tentativa de cobrança (`mp_order_id`). CA-02.3 (r1) | humano no gate do PRD Tech Review, pela recomendação (`informativo-em-pedido-abandonado` · tech_prd_edit · r1) |
| 10 | Formatos de comprovante | HEIC aceito e guardado como chegou; no painel abre como download. CA-03.2 (r1) | humano no gate do PRD Tech Review, pela recomendação (`formatos-de-imagem` · tech_prd_edit · r1) |
| 11 | Formulário aberto quando o pagamento foi aprovado | A tela diz isso, não grava e não guarda comprovantes. CA-03.3a (r1) | humano no gate do PRD Tech Review, pela recomendação (`corrida-com-a-aprovacao` · tech_prd_edit · r1) |
| 12 | O corpo do efeito de pago | A porta manual chama o mesmo corpo de `apply_payment_approval` (data e autor como parâmetro), sem copiar a baixa; linha de histórico própria mesmo sem mudar status; RPCs na lista de `marcacaoSoPorAcao`; escrita por `core/order-actions`; colunas novas na `order_list` só no fim; primeiro bucket privado e URL assinada | humano no gate do PRD Tech Review, pela recomendação (`um-corpo-para-o-efeito-de-pago` · tech · r1) |
| 13 | `pg_cron` no hospedado | Conferir antes do deploy (leitura, sem escrita); o cancelamento roda como edge function agendada, porque um job SQL não chama o MP nem o motor | humano no gate do PRD Tech Review, pela recomendação (`pg-cron-no-hospedado` · tech · r1) |
| 14 | O desfazer passa por `canTransition`? | Não: o desfazer é RPC própria fora da máquina, para a exceção não vazar ao webhook (Conflito 5) | conferência |
| 15 | O "Registrar pagamento" é modal ou tela? | Tela própria do pedido ("Editor é TELA", `apps/backoffice/CLAUDE.md:234-236`); os três caminhos navegam para ela (Conflito 4) | conferência |
| 16 | Onde mora o meio que a cliente vê | No registro manual, exposto à leitura da cliente sem observação nem comprovante; `orders.payment_method` não muda, para nada que decide "é PIX?" ler outra coisa (Conflito 14) | conferência |
| 17 | Onde moram observação, comprovante, hash do link, valor travado | Tabelas próprias, nenhuma coluna em `orders` (Conflito 12) | conferência |
| 18 | Marcador "cancelado por falta de pagamento" | Marcador estruturado próprio; `cancel_reason` (texto livre da admin) não serve (Conflito 12) | conferência |
| 19 | `created_by` em tabelas novas | Molde da 95: `on delete set null` + nome gravado (Conflito 8) | conferência |
| 20 | `NEXT_STATUS` do lote | Passa a ler `PROXIMO` de `core/orders/nextStep.ts` (Conflito 9) | conferência |
| 21 | AD-003 × CA-02.2 | AD-003 é revista: cartão recusado não repaga por PIX pela loja; o código já segue o PRD (Conflito 2) | conferência |
| 22 | GA4 em "pago duas vezes" / "pago depois de cancelado" | `purchase` não sai (Incerteza do lookup; RNF-07) | conferência |
| 23 | "Quando cancelado pelo admin, não enviar email" × portão da feature 88 | "A frase vale para o e-mail novo: o 'cancelado por falta de pagamento' só sai no automático; o cancelamento pela admin continua com a caixa de escolha, como hoje" | humano no gate principal (H-01) |
| 24 | O e-mail "cancelado por falta de pagamento" nasce ligado? | "Nasce desligado, como os outros; a Adri revisa o texto e liga em Notificações" | humano no gate principal (H-02) |

## Não resolvido

- **Comportamento do MP ao cancelar** uma order de cartão em `processing` ou uma order PIX `action_required` (`handlers.ts:185-188`): define quanto o marcador "pago depois de cancelado" será exercitado. Confere-se na implementação, contra a documentação do MP; não trava escopo.
- **Limite de novas orders por `external_reference`** (`cc_rejected_max_attempts`) para links de cartão repetidos: não verificado; não trava escopo.
- **`pg_cron`/agenda no hospedado**: não verificado (Decisão 13); trava só o deploy do cancelamento automático, não a implementação.
- **Convidada depois dos 7 dias do token** não abre `/pedido/:id` e só sabe do cancelamento pelo e-mail — que nasce desligado (Decisão 24). Limitação aceita.
- **Selo do cartão expirado** aparecendo como "PIX expirou" (`situation.ts:145`): corrigir junto do estado de cartão, se o selo aparecer nas telas tocadas.
- **A janela entre o QR de 30 min e o `expired` de 24 h** segue sem medição; não trava.
