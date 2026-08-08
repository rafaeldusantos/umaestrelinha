# BUG-20260730-separating-viola-check-do-banco: "Em Separação" nunca salva, e o admin não fica sabendo

- **User impact:** Blocks-Completion (para o admin) · Cosmetic-plus (para a cliente, que vê status errado)
- **Persona affected:** admin (operação de pedidos)
- **Journey / step:** operação pós-venda — mudar o status de um pedido no backoffice
- **Scenarios:** —
- **First seen:** 2026-07-30 · descoberto durante o desenho da feature `10-emails-transacionais`
- **Status:** open

## Symptom (what the user experiences)

O admin abre um pedido, escolhe **"Em Separação"** no dropdown de status, clica em "Atualizar". O
dialog fecha normalmente, como se tivesse salvo. O status do pedido **não muda** — nem na lista, nem
para a cliente. Nenhum erro aparece.

## Reproduction (from the persona's entry point)

1. Backoffice → `/admin/pedidos` → abrir qualquer pedido.
2. Aba "Resumo" → dropdown "Alterar status" → escolher **"Em Separação"**.
3. Clicar em "Atualizar".
4. Observar: o dialog fecha. Reabrir o pedido — o status é o anterior.

## Evidence

O dropdown é alimentado por `ORDER_STATUSES` em
`apps/backoffice/src/entities/order/api/useAdminOrders.ts:5`, que inclui `'separating'`:

```ts
export const ORDER_STATUSES = ['pending', 'paid', 'separating', 'shipped', 'delivered', 'cancelled'] as const
```

Mas a constraint do banco, em
`supabase/migrations/20260414121021_305804ba-a826-4a90-9d43-6c78231e94d7.sql:88`, só admite cinco
valores — e **nenhuma migration posterior a altera** (as únicas `drop constraint` do repo atingem
`order_items_product_id_fkey`, `orders_payment_status_check` e duas de `coupons`):

```sql
status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','shipped','delivered','cancelled')),
```

Então o `update` viola `orders_status_check` e o Postgres recusa a escrita.

Registrado também em `.specs/project/PRD-REVISAO.md:99,141,210,247`.

## Why it matters

São **dois** defeitos empilhados, e o segundo é o que faz o primeiro passar despercebido:

1. A UI oferece um valor que o banco recusa.
2. O erro era **descartado** — `OrderDetailDialog.tsx` chamava `onStatusChange` sem olhar o retorno,
   fechava o dialog e não mostrava nada. Falha silenciosa é indistinguível de sucesso.

O impacto operacional é real: o admin acredita que marcou o pedido como em separação, e a cliente
continua vendo o status antigo.

## Root cause (when known)

Divergência entre a lista de status da UI e o CHECK do schema. `'separating'` foi adicionado ao
front sem a migration correspondente.

## Situação atual (2026-07-30)

A feature `10-emails-transacionais` **consertou o defeito 2**: `updateStatus` agora devolve
`{ error, emailSent }` e `OrderDetailDialog.handleSaveStatus` exibe `toast.error` com a mensagem do
banco em vez de fechar em silêncio (AC UX-02, teste em
`apps/backoffice/src/entities/order/api/useAdminOrders.test.ts`).

Ou seja: **este bug agora é visível** — quem escolher "Em Separação" vai ver o erro de constraint.
O defeito 1 segue **aberto** e não foi tocado, por estar fora do escopo daquela feature.

## Duas correções possíveis (decisão de produto, não de implementação)

1. **Adicionar `'separating'` ao CHECK** por migration, se "em separação" é um estágio real da
   operação. Exige também decidir como a loja renderiza esse status (`OrderTimeline` hoje só ramifica
   em `delivered`/`shipped`/`paidAt`).
2. **Remover `'separating'` da UI**, se não é. Some o dropdown e o `StatusBadge`
   (`apps/backoffice/src/entities/order/ui/StatusBadge.tsx:6`).

Achado relacionado, do mesmo par UI↔schema: `AccountPage.tsx:18` na **loja** tem um status
`'confirmed'` no `statusConfig` que o banco também não produz — e o mapa **não tem a chave `paid`**,
então um pedido realmente pago cai no fallback e aparece como **"Pendente"** para a cliente
(`AccountPage.tsx:25`). Esse é caminho de leitura, não de escrita, mas o efeito é o mesmo: status
errado na tela de quem comprou.
