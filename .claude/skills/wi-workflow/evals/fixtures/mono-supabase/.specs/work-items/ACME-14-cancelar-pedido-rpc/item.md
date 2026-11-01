---
id: ACME-14
titulo: Cancelar pedido por RPC
tipo: feature
entrada: prd
fase: implement
criado: 2026-10-25
---
## Descrição

Iniciar o ACME-14 — o lojista cancela o pedido; a regra roda numa RPC do banco. PRD colado na conversa.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-10-25 | approved · sem itens |
| handoff | 2026-10-26 | pass · sem itens |
| fila | 2026-10-26 | aprovada · 01–02 · auditoria `a fila serve` (nenhum achado) |
