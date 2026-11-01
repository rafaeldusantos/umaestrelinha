# ACME-30 · Reprocessar pedidos com falha

Costura de 2026-10-28. Sem PRD — technical_debt.

## Comportamentos

| # | O que precisa passar a ser verdade |
| ---- | ---- |
| C-01 | o repositório pagina os pedidos com falha de 500 em 500 |
| C-02 | o job processa página a página, sem carregar tudo em memória |
