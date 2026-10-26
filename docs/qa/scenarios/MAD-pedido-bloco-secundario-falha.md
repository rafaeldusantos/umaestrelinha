---
id: MAD-pedido-bloco-secundario-falha
area: MAD
title: Ver o pedido quando só os itens ou o histórico não carregam
persona: Adri no celular
journey: J-ver-um-pedido
expected: O bloco que falhou diz Não consegui carregar. com Tentar de novo, e o resto do pedido continua
entry_points: /pedidos/<id>
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-pedidos-leitura-falha
---

Feature `74` (`MAP-30`). Interceptar `order_items` e depois `order_status_history`/`order_notes`. Primeira leitura do pedido falha: tela inteira de falha (`MAP-34`).
