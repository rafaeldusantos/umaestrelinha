# Spec — ACME-15 Cancelar pedido

## Escopo

UC-01 status na listagem · UC-02 cancelar pelo detalhe · UC-03 modal de confirmação com motivo

**Anexos consultados**

nada — o humano não informou insumo nenhum.

**Achados de eval que este Work Item resolve**

nada — a condição não vale.

## Design

nada — sem fonte de design; o humano respondeu "seguir sem design" (handoff de 2026-10-25).

## Código — acme-app (raiz do repositório)

- **O que já serve** — `src/pedidos/listagem.ts:1` — `PedidoResumo` com `status`
- **O que nasce** — `src/pedidos/cancelamento.ts` com o contrato `GET /pedidos/:id/cancelamento` (status, motivo, quando) e `POST /pedidos/:id/cancelamento`; `src/pages/PedidoDetalhe.tsx`; `src/pages/ConfirmarCancelamento.tsx`
- **Compartilhado** — o contrato `GET /pedidos/:id/cancelamento` é consumido pela listagem (UC-01) e pelo detalhe (UC-02)
- **Testes** — `src/pedidos/cancelamento.test.ts` (criar)

## Fronteira entre repositórios

nada — repositório único.

## Cobertura dos UCs

| UC | Reivindicado por |
|---|---|
| UC-01 | acme-app |
| UC-02 | acme-app |
| UC-03 | acme-app |

## Decisões

- Design: seguir sem design (handoff, 2026-10-25).

## Não resolvido

nada
