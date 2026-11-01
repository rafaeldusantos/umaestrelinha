---
id: ACME-15
titulo: Cancelar pedido
tipo: feature
entrada: prd
fase: tasks
criado: 2026-10-24
---
## Descrição

Iniciar o ACME-15 — o lojista cancela um pedido ainda não enviado, com o motivo. PRD colado na conversa.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| prd-review r1 | 2026-10-24 | approved · sem itens |
| handoff | 2026-10-25 | pass · 1 item (seguir sem design) → `spec.md` Design |
