# ACME-18 · Reprocessar pedidos com falha

Costura de 2026-10-15. Sem PRD — technical_debt.

## Comportamentos

| # | O que precisa passar a ser verdade |
| ---- | ---- |
| C-01 | o job reprocessa cada pedido com falha uma vez só |
| C-02 | o reinício do job retoma do último pedido processado |
