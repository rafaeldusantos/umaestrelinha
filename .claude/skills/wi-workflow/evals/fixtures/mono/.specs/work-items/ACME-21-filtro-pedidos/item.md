---
id: ACME-21
titulo: Filtro de pedidos por status
tipo: bug
entrada: plano
fase: implement
criado: 2026-10-05
---
## Descrição

Bug: o filtro por status da lista de pedidos ignora "cancelado".

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| fila | 2026-10-05 | aprovada · 01 · `não roda: fila de 1` |
| execução | 2026-10-05 | autorizada: 01 |
| validation 1 | 2026-10-06 | PASS |
| QA · Gate 3 — veredito | 2026-10-08 | fail · 2 bugs novos · qa/qa-result.md |
| fix tasks | 2026-10-09 | aprovadas: 02–03 (BUG-003, BUG-007) |
