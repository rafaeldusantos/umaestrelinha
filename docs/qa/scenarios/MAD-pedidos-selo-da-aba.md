---
id: MAD-pedidos-selo-da-aba
area: MAD
title: Ver na aba Pedidos quantos pedidos precisam de mim
persona: Adri no celular
journey: J-achar-um-pedido
expected: O selo diz a união de Precisa de ação, igual ao número da Início; some em 0, na falha e na recusa; 99+ acima de 99
entry_points: qualquer aba
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: MAD-navegar-pelas-quatro-abas
---

Feature `74` (`MAP-31`..`MAP-33`). Nunca número de cache nem zero durante a carga. Relê junto com a Início e a lista (mesma chave). Selo em 0 não foi medido em navegador na prova do autor.
