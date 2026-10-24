---
id: MAD-cliente-email-com-underscore-nao-mistura
area: MAD
title: E-mail com sublinhado ou porcentagem não traz pedido de outra pessoa
persona: Adri no celular
journey: J-ver-uma-cliente
expected: A ficha de P76VROSA_RJ não mostra os pedidos de P76VROSAXRJ; o vínculo é por id ou e-mail exato, sem curinga, ignorando caixa
entry_points: /clientes/<id>
qa_status: pass
bug_ids: BUG-20261024-painel-ficha-puxa-pedido-de-outra-pessoa-por-underscore
fix_status:
retest_status:
fix_commits:
evidence: evidence/76-clientes/sessao.json; evidence/2026-10-24-mobile-adm-clientes/sessao-colar.txt
last_report: reports/2026-10-24-mobile-adm-clientes-achar-quem-me-escreveu.md
overlaps: 
---

Feature `76` (`MAC-18`, A10. Usa o par da fixtura; o painel usa ilike e pode divergir aqui (diferença conhecida, anotar se aparecer).)

Rodada 1 (CH-clientes-achar-quem-me-escreveu, 2026-10-24): App correto (1 pedido); o painel mostra 2: ver o bug.
