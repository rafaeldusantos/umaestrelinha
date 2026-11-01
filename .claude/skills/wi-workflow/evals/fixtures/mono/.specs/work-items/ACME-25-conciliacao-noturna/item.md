---
id: ACME-25
titulo: Job de conciliação duplica lançamento
tipo: bug
entrada: plano
fase: tasks
criado: 2026-10-29
---
## Descrição

Bug em produção: o job noturno de reconciliação de pagamentos duplica o lançamento quando o gateway reenvia o webhook. Nenhuma tela muda.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| perguntas do plano | 2026-10-29 | 1 ratificada → `plan.md` |
