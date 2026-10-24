---
id: MAD-pedidos-endereco-sem-ou-invalido
area: MAD
title: Abrir Pedidos sem parâmetro ou com valor estranho
persona: Adri no celular
journey: J-achar-um-pedido
expected: Sem parâmetro ou com valor fora do vocabulário, a lista abre em Precisa de ação, sem erro
entry_points: /pedidos; /pedidos?visao=xyz; /pedidos?bloco=xyz
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-pedidos-trocar-de-visao
---

Feature `74` (`MAP-03`, A5). Recarregar (F5) num endereço válido mantém o recorte.
