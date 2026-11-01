---
id: ACME-30
titulo: Reprocessar pedidos com falha
tipo: technical_debt
entrada: plano
fase: implement
criado: 2026-10-28
---
## Descrição

Dívida: o repositório JPA de reprocessamento carrega todos os pedidos com falha em memória.

## Insumos

nenhum

## Gates

| gate | quando | resultado |
| ---- | ------ | --------- |
| fila | 2026-10-28 | aprovada · 01–02 · auditoria `a fila serve` (nenhum achado) |
