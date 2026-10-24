---
id: MAD-pedido-retirada-no-escritorio
area: MAD
title: Ver um pedido de retirada no escritório
persona: Adri no celular
journey: J-ver-um-pedido
expected: Entrega diz Retirada no escritório, sem transportadora, prazo nem rastreio, e o próximo passo é o do painel
entry_points: /pedidos/<id de retirada>
qa_status: untested
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-pedido-abrir-e-entender
---

Feature `74` (`MAP-27`, A27, `RET-*` da `63`).

Reaberto em 2026-10-24 pelo planejamento da `75`: a superfície mudou (rodapé de ação no detalhe e botão no cartão da lista). O veredito anterior está em `last_report`; o novo vem do re-walk do ciclo `75`.
