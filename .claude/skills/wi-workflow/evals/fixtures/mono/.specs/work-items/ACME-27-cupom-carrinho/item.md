---
id: ACME-27
titulo: Cupom no carrinho
tipo: feature
entrada: prd
fase: validation
criado: 2026-10-16
---
## Descrição

Iniciar o ACME-27 — o cliente aplica cupom no carrinho. PRD colado na conversa.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-10-16 | approved · sem itens |
| handoff | 2026-10-17 | pass · 1 item (seguir sem design) → `spec.md` Design |
| fila | 2026-10-17 | aprovada · 01–02 · auditoria `a fila serve` (1 corrigido) |
| execução | 2026-10-18 | autorizada: 01–02 |
