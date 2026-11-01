---
id: ACME-20
titulo: Exportação de pedidos
tipo: feature
entrada: prd
fase: done
criado: 2026-09-20
---
## Descrição

Iniciar o ACME-20 — exportação de pedidos em CSV. PRD colado na conversa.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-09-20 | approved · sem itens |
| handoff | 2026-09-21 | pass · sem itens |
| fila | 2026-09-21 | aprovada · 01–02 · auditoria `a fila serve` (nenhum achado) |
| execução | 2026-09-22 | autorizada: 01–02 |
| validation 1 | 2026-09-23 | PASS |
| QA · Gate 3 — veredito | 2026-09-25 | fail · 1 bug novo · qa/qa-result.md |
