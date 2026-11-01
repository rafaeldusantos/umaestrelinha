---
id: ACME-22
titulo: Webhook reenviado duplica o lançamento
tipo: bug
entrada: plano
fase: specify
criado: 2026-10-28
---
## Descrição

Bug: quando o gateway reenvia o mesmo webhook (mesmo id de evento), a conciliação registra o lançamento duas vezes. Nenhuma tela muda.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
