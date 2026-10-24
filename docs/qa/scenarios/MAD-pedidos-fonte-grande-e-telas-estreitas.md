---
id: MAD-pedidos-fonte-grande-e-telas-estreitas
area: MAD
title: Ler a lista e o detalhe em telas estreitas e com fonte grande
persona: Adri no celular
journey: J-achar-um-pedido
expected: Em 360, 390 e 412 px e com a fonte a 130 % e 200 %, o body não rola para o lado, nada se sobrepõe, o selo não é cortado e todo alvo tem 44 px
entry_points: /pedidos; /pedidos/<id>
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence: evidence/2026-10-24-mobile-adm-pedidos/390-lista-fonte-200.png; evidence/2026-10-24-mobile-adm-pedidos/390-detalhe-p01-fonte-200.png
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: 
---

Feature `74` (`MAP-42`..`MAP-45`). Régua do `BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima` (175 % também). Cliente de nome comprido e total de R$ 99.999,90 (fixturas da prova). `prefers-reduced-motion`: esqueleto e troca de recorte parados.
