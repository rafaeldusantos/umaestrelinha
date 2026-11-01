---
id: ACME-29
titulo: Rastreio do pedido
tipo: feature
entrada: prd
fase: done
criado: 2026-09-10
---
## Descrição

Iniciar o ACME-29 — o cliente acompanha o rastreio do pedido. PRD colado na conversa.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-09-10 | approved · sem itens |
| handoff | 2026-09-11 | pass · sem itens |
| fila | 2026-09-11 | aprovada · 01–02 · auditoria `a fila serve` (nenhum achado) |
| execução | 2026-09-12 | autorizada: 01–02 |
| validation 1 | 2026-09-13 | PASS |
| QA · Gate 3 — veredito | 2026-09-15 | pass · 0 bugs novos · qa/qa-result.md |
| QA · perguntas ao produto | 2026-09-16 | 3 respondidas → qa/decisoes-produto.md |
