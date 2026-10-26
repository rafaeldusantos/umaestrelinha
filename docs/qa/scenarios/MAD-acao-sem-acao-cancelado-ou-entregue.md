---
id: MAD-acao-sem-acao-cancelado-ou-entregue
area: MAD
title: Abrir um pedido cancelado ou entregue e não ver ação
persona: Adri no celular
journey: J-registrar-material-e-envio
expected: Cancelado (mesmo com material aguardando) e entregue não têm rodapé, botão no cartão nem lembrete; a Entrega do entregue ainda oferece Informar ou Alterar o rastreio
entry_points: /pedidos/<id> cancelled ou delivered
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-acoes-do-pedido.md
overlaps: 
---

Feature `75` (A14, A17, edge cases). O cancelado com `aguardando_material` é o caso em que `rowSummary` sozinho diria Recebi o material.
