---
id: MAD-pedido-inexistente
area: MAD
title: Abrir um pedido que não existe
persona: Adri no celular
journey: J-ver-um-pedido
expected: Não encontrei este pedido. com Voltar aos pedidos, nunca um detalhe vazio
entry_points: /pedidos/<uuid inexistente>; /pedidos/abc
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: 
---

Feature `74` (`MAP-29`, A26). Também um pedido apagado no banco com o detalhe aberto.
