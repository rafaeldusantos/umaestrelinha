---
id: MAD-cliente-pedido-dela-e-voltar
area: MAD
title: Abrir um pedido da ficha e voltar à ficha na mesma posição
persona: Adri no celular
journey: J-ver-uma-cliente
expected: Tocar um pedido abre /pedidos/<id> da 74 e o voltar (botão e Android) traz a ficha na mesma posição
entry_points: /clientes/<id> → pedido
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-clientes.md
overlaps: MAD-pedido-voltar-mantem-recorte
---

Feature `76` (`MAC-20`. Rolar a ficha de 22 pedidos até o fim, abrir um, voltar. O voltar do detalhe da 74 vindo da ficha NÃO vai à lista de pedidos.)
