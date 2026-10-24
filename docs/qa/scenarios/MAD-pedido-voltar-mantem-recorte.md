---
id: MAD-pedido-voltar-mantem-recorte
area: MAD
title: Voltar do pedido para a lista onde eu estava
persona: Adri no celular
journey: J-ver-um-pedido
expected: O Voltar e o voltar do Android devolvem a lista no mesmo recorte e na mesma posição de rolagem; vindo da Início, à Início; sem histórico (link colado, F5), à lista
entry_points: /pedidos?bloco=<id> → rola → linha → voltar
qa_status: pass
bug_ids: BUG-20261024-voltar-do-pedido-buscado-perde-a-busca
fix_status: fixed
retest_status: pass (2026-10-24 r2)
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-navegar-pelas-quatro-abas
---

Feature `74` (`MAP-20` emendado E7, A28, G-A28). Trocar chips não empilha histórico: voltar da lista não passeia pelos chips. Revalidação ao voltar que recusa faz o cache sumir (`MAP-36`).
