---
id: ACME-17
titulo: Filtro por período ignora a data final
tipo: bug
entrada: plano
fase: done
criado: 2026-10-01
---
## Descrição

Bug: o filtro por período da listagem de pedidos ignora a data final.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| fila | 2026-10-01 | aprovada · 01–02 · auditoria `a fila serve` (nenhum achado) |
| execução | 2026-10-01 | autorizada: 01–02 |
| validation 1 | 2026-10-02 | PASS |
| QA · Gate 3 — veredito | 2026-10-03 | pass · 0 bugs novos · 1 resolved · qa/qa-result.md |
