# Descoberta — WI 98 · O pagamento que falhou

> Relatório do `wi-discovery`, 2026-11-09. Gravado verbatim pela thread principal.

Repositórios: o monorepo (apps/store, apps/backoffice, apps/mobile-adm, packages/core, supabase).
Instruções lidas: `CLAUDE.md` (defeito 01, Convenções, Os guardas, Estado conhecido, CI e deploy),
`apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`
(seções `mercado-pago` e `send-notification`), `.specs/STATE.md` (AD-003, AD-042), `.specs/BACKLOG.md`.
Não lidos: `apps/mobile-adm/CLAUDE.md`, `DESIGN.md`, `LESSONS.md`.

## Diagnóstico

### O que já existe e serve
| O que | Onde | O que cobre do pedido |
| ----- | ---- | --------------------- |
| O servidor aceita cobrar de novo um pedido com pagamento `pending`, `rejected` ou `expired`, e cancela a order anterior no MP antes de abrir outra | supabase/functions/mercado-pago/handlers.ts:177 (`RETRYABLE_STATUSES`), :381-386, :1004-1006 | Pagar de novo, pelo lado do servidor |
| Máquina de estados do pagamento: `rejected→pending/approved`, `expired→approved`, `approved` só vai para `refunded`, `cancelled` não sai | packages/core/src/payment/status.ts:15-22 | O que pode virar "pago"; aprovação manual nunca regride |
| `podePagarComPix`: "Pagar com PIX" só para PIX `pending`, pedido não cancelado e sem `paid_at` | apps/store/src/entities/order/lib/podePagarComPix.ts:40-45 | PIX ainda não pago |
| `podeGerarNovoPix`/`pagamentoPerdido`: PIX `expired`/`rejected` até 7 dias ⇒ "Gerar novo PIX"; depois, ou cartão recusado ⇒ "O pagamento não foi concluído" + WhatsApp | packages/core/src/orders/repix.ts:19, :32, :49-62 | PIX expirado ou recusado |
| Prioridade dos estados no topo de `/pedido/:id` e os cartões de cada um | apps/store/src/widgets/order-action/lib/orderActionState.ts:27-40; OrderActionPanel.tsx:113-150 | O que a cliente vê depois da falha |
| Pendências de `/conta` | apps/store/src/entities/order/lib/attention.ts:39-43 | Idem, na conta |
| `/pedido/:id/pagamento` recusa pedido pago, cancelado ou não-PIX | apps/store/src/pages/OrderPaymentPage.tsx:219 | A única superfície de PIX (AD-042) |
| Convidada lê o pedido por token por 7 dias; depois, entra com código | packages/core/src/checkout/guestAccess.ts:15; mercado-pago/handlers.ts:366-379 | Pagar de novo sem conta |
| Pedido montado (89) cobrado de novo pelo preço travado | mercado-pago/handlers.ts:420-433, :1173-1209 | Pedido montado pago de novo pela rota |
| `apply_payment_approval`: `approved` + `paid_at`, `pending→paid`, histórico, estoque, cupom; idempotente por `paid_at is null`; só `service_role` | supabase/migrations/20261030120000_pagamento-aprovado-marca-pago.sql:23-128 | O efeito completo de "pago" |
| Gatilho `payment_approved` ⇒ `order_paid`/`material_instructions` e `owner_order_paid`; pré-condições olham `paid_at` | packages/core/src/notifications/triggers.ts:55-59; precondition.ts:88-96, :160-162 | Aviso de pagamento confirmado |
| Porta `trigger` do motor, só admin, aceita pular e-mails da cliente (feature 88) | supabase/functions/send-notification/handlers.ts:140-175 | Disparar o aviso do painel, com escolha |
| `order_notes` + `addNote`/`getNotes` | migration 20260415160758:28-34; useAdminOrders.ts:128-131, :256-259; AdminOrderPage.tsx:251 | A observação (só texto) |
| `order_status_history` + `writeOrderStatus` (AD-059) | useAdminOrders.ts:140-154; packages/core/src/order-actions | Rastro da mudança |
| Venda no Dashboard/Início = `paid_at` no período + `approved` (AD-055) | 20261104140000_acessos-com-sacola.sql:269-276 | Pago por fora conta como venda se gravar `approved` + `paid_at` |
| Molde de política de Storage com escrita só admin | 20260815120000_24-home-gerenciavel.sql:240-275 | Base para o comprovante |
| `ORDER_PAYMENT_STATUS_LABELS`, `PAYMENT_METHOD_LABELS` (já tem `manual: 'Manual'`), `PAYMENT_METHOD_FALLBACK` | packages/core/src/orders/labels.ts:40-47, :63-72 | Rótulos |

### O que existe e precisa mudar
| O que | Onde | O que falta |
| ----- | ---- | ----------- |
| Cartão recusado fora do checkout | repix.ts:56-62; OrderPaymentPage.tsx:219 | Só WhatsApp; não paga o mesmo pedido pela loja. Contradiz AD-003 |
| Cartão `pending` (checkout abandonado / MP `processing`) | podePagarComPix exige `pix`; repix exige `expired`/`rejected` | Nenhuma ação até o expirador (24 h); só então o WhatsApp |
| `create-payment` não confere `orders.status` | handlers.ts:381-386 | Pedido `cancelled` com pagamento retentável pode ser cobrado por chamada direta |
| `create-payment` não grava `orders.payment_method` | handlers.ts:701-716, :785-802 | Troca de meio deixaria a coluna mentindo |
| Pedido de catálogo pago de novo é recalculado pelo catálogo de hoje | handlers.ts:435-716 | Promoção encerrada ⇒ 422; preço mudado ⇒ total diferente |
| "Avançar mesmo assim" Pendente→Pago no painel | core/orders/nextStep.ts:63-68, :121-128; OrderNextStep.tsx:66-99 | Grava só `orders.status='paid'`: sem `payment_status`, `paid_at`, estoque, cupom, aviso, venda; o expirador ainda marca `expired`. Dois donos de "foi pago?" |
| Bloco Pagamento do pedido no painel | AdminOrderPage.tsx:761-784 | Sem ação de registrar; "Método" mostra valor cru (linha 778); sem quem/como/nota/comprovante |
| `order_notes` | migration 20260415160758:28-34 | Sem anexo; não sabe que pertence a um registro de pagamento |
| `apply_payment_approval` | migration 20261030120000:125-128 | Só `service_role`; precisa de porta de admin com o mesmo efeito. `pagamentoMarcaPagoSchema.test.ts` e o probe passam a valer |
| Guardas | `pedidoGravadoSoPeloDono.test.ts`; `marcacaoSoPorAcao.test.ts` | A ação mora em `core/order-actions` ou é RPC chamada por ela, e entra na lista de RPCs |

### O que não existe
| O que | Camada | Como procurou |
| ----- | ------ | ------------- |
| Ação/RPC/migration de "marcar como pago manualmente" | dados, regra, entrada | grep `marcar.*pago|mark_paid|markPaid|mark_order_paid`; `pagamentoMarcaPagoSchema` guarda o pago pelo webhook |
| Bucket privado ou URL assinada | Storage | buckets todos `public = true`; zero `createSignedUrl` |
| Anexo em nota / tabela de comprovante | dados | DDL de `order_notes`; grep `comprovante|anexo` |
| Quem confirmou, meio e data informada | dados | `orders` só tem `mp_payment_id`, `mp_status_detail`, `paid_at` (20260718234043:31-35) |
| Trocar de meio no mesmo pedido fora do checkout | UI loja | OrderPaymentPage.tsx:219, repix.ts |
| Cancelamento automático de pedido não pago | jobs | `expire-pending-orders` (20260718235214:86-108) só marca `expired` em 24 h |
| "Marcar pago" no app do ateliê | mobile-adm/core | `core/orders/appAction.ts` só parte de `paid` (51, 91) |

## Premissas
| ID | Premissa | Alternativa | O que muda se a alternativa valer |
| -- | -------- | ----------- | --------------------------------- |
| P-01 | Pagar de novo um cartão recusado é PIX no mesmo pedido | Brick do cartão numa rota do pedido | Tela nova de cartão fora do checkout, contra AD-042 |
| P-02 | O registro manual produz o mesmo efeito que `apply_payment_approval` | Só marca o pagamento | Estoque errado, cupom não conta |
| P-03 | A data do pagamento é a informada pela admin (padrão: agora) | Sempre `now()` | Venda cai no dia do registro |
| P-04 | O `purchase` do GA4 não dispara no registro manual | Disparar | Muda a medição de conversão |
| P-05 | O registro guarda origem manual, meio, quem e nota, estruturado | Só `order_notes` com anexo | Sem marca para filtrar/auditar |
| P-06 | O app do ateliê mostra o registro, mas não registra | Registrar também no app | Escopo e tela no app |

## Perguntas
| ID | Pergunta | Sugestões | Muda |
| -- | -------- | --------- | ---- |
| Q-01 | Como a cliente paga de novo um pedido de cartão recusado? | (a) PIX no mesmo pedido; (b) cartão numa tela do pedido; (c) só WhatsApp | UC-02 |
| Q-02 | Em quais estados o painel pode registrar pagamento? | (a) pendente/recusado/vencido, não cancelado; (b) também cancelado; (c) só pendente | CA-03.1 |
| Q-03 | Comprovante obrigatório? Quantos, tipos, tamanho? | (a) opcional, até 3, imagem/PDF, 10 MB; (b) obrigatório, 1; (c) só imagem | CA-03.2, CA-03.10 |
| Q-04 | Cancelar automaticamente o pedido não pago? | (a) não; (b) depois de 7 dias | Job + aviso |
| Q-05 | O que acontece com o "Avançar mesmo assim" Pendente→Pago? | (a) abre o "Registrar pagamento"; (b) some; (c) fica | CA-03.9 |
| Q-06 | Quais meios a admin informa? | (a) PIX direto, transferência, dinheiro, outro; (b) texto livre | Vocabulário |
| Q-07 | O registro manual pode ser desfeito? | (a) não; (b) sim, com motivo | `approved` não regride |
| Q-08 | Ao pagar de novo, preço da compra ou de hoje? | (a) da compra, com teto; (b) de hoje | CA-01.5 |

## Conflitos
- **AD-003 × código**: AD-003 diz que o cartão recusado "segue podendo repagar, inclusive por PIX"; `OrderPaymentPage.tsx:219` redireciona todo não-PIX e `repix.ts:56-57` diz que cartão "não se refaz pela loja — AD-042".
- **"Pago" tem dois sentidos no painel**: `orders.status='paid'` (Avançar mesmo assim) × `payment_status='approved'` + `paid_at` (webhook, e-mails, AD-055).
- **Pagar duas vezes não é detectado**: registro manual + webhook aprovado da MESMA order vira no-op silencioso (handlers.ts:1376-1393); só order diferente marca `duplicate_approved_other_order` (1357-1375).
- **Pedidos órfãos**: mudar sacola/meio no checkout só descarta no sessionStorage (CheckoutPage.tsx:284-290); o órfão de cartão vira "O pagamento não foi concluído" em `/conta` (attention.ts:43) mesmo com o pedido novo pago.

## Incertezas
- Se o `pg_cron` existe no hospedado; sem ele nada vira `expired` (o "fallback lazy" da migration não foi encontrado no código).
- Como o mobile-adm mostra o pagamento no detalhe.
- As RLS vigentes de `order_notes` (feature 52 as restringiu a `has_role`).
- Limite de novas orders no MP para o mesmo `external_reference` (`cc_rejected_max_attempts`).
- Janela entre o QR de 30 min (`PT30M`, handlers.ts:961-962) e o `expired` de 24 h.
