---
id: MAD-pedidos-recorte-vazio
area: MAD
title: Ver um recorte ou uma busca sem pedido
persona: Adri no celular
journey: J-achar-um-pedido
expected: Nada por aqui. com a frase do recorte (ou Nenhum pedido com o termo), sem linha de contagem e sem trocar de recorte sozinha
entry_points: /pedidos?visao=<recorte vazio>; busca zzznada
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-pedidos-buscar-por-numero-ou-nome
---

Feature `74` (`MAP-09`). Precisa de ação vazio: "Nenhum pedido esperando você agora." Tom calmo, nada festivo.
