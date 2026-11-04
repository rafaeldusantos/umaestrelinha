---
id: 95
titulo: Observação do pedido, só para quem administra
tipo: improvement
entrada: plano
fase: done
criado: 2026-11-03
---
## Descrição
Na geração de pedidos do Backoffice, vamos adicionar um campo de observaçào no pedido, um campo textarea epenas oara o backoffice, para o admin conseguir adicionar informações especificas daquele pedido. Esse campo de obdservação deve ser visivel em pedidos fechados, e pode ser editavel dentro dos pedidos també. valida o que precisamos ajustar para essa implementação.

Decidido pelo usuário na mesma sessão (2026-11-03), em resposta às três perguntas do levantamento:
- "Serve para todo pedido." (pedidos da loja e pedidos montados pelo painel)
- "As notas no admin sào exclusivas para os administradores, nao devem mostrar na tela do cliente."
- "Deve sim sair ao lado do Recado da cliente." (na folha de separação, `features/pick-slip`)
- "Sim, o APP deve mostrar as observaçoes também." (`apps/mobile-adm`, detalhe do pedido)

Levantado no código antes do Work Item (a confirmar pela descoberta):
- `orders.notes` é o "Recado da cliente" (escrito no checkout; `AdminOrderPage.tsx:436`, `pickSlip.ts:106`).
- `order_notes` é a "Nota interna": histórico só de acréscimo, não um campo editável.
- A loja lê `orders` com `select('*, order_items(*)')` (`apps/store/src/entities/order/api/useOrder.ts:93`, `useOrders.ts:60/75`) e a policy `users read own orders` entrega a linha inteira à cliente: uma coluna nova em `orders` chegaria a ela.
- `save_order_proposal` recusa proposta fora de `open` e conta toda coluna editável como conteúdo (sobe `version`); a migration da `89` (`20261103120000_89-pedido-montado.sql`) já está em produção, imutável.
- `checkout/proposal.ts` lista as colunas da proposta que saem para a loja de forma explícita.

## Insumos
- A montagem no painel, já implementada: `.specs/features/89-pedido-montado-pelo-painel/spec.md` (`AD-070`, `AD-071`)
- `supabase/migrations/20261103120000_89-pedido-montado.sql`

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| perguntas do plano | 2026-11-04 | 6 itens · 4 ratificados (N1–N4) · N5 mudou o plano (o app cadastra e edita) · N6 tirou a folha em lote · 0 abertos → `plan.md` |
| fila | 2026-11-04 | aprovada ("Siga com essa fila") · 01–03 · auditoria: a fila serve com correção — 4 achados corrigidos (card em slice próprio, caminho da porta e da folha do app, contradição da ação `note` na concluída), 0 ao humano |
| execução | 2026-11-04 | 01–03 (a fila toda), sob "Siga com essa fila" |
| validation 1 | 2026-11-04 | PASS · 7/7 critérios · 21285 testes em 5 workspaces · tipos e lint sem erro novo · build verde → `qa-report.md` |
