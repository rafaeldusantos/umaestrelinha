---
id: ACME-23
titulo: Checkout com endereço salvo
tipo: feature
entrada: prd
fase: done
criado: 2026-09-28
---
## Descrição

Iniciar o ACME-23 — checkout com endereço salvo e exportação dos pedidos do dia. PRD colado na conversa.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-09-28 | approved · sem itens |
| handoff | 2026-09-29 | pass · sem itens |
| fila | 2026-09-29 | aprovada · 01–02 · auditoria `a fila serve` (nenhum achado) |
| execução | 2026-09-30 | autorizada: 01–02 |
| validation 1 | 2026-10-01 | PASS |
| QA · Gate 3 — veredito | 2026-10-03 | fail · 3 bugs novos · qa/qa-result.md |
