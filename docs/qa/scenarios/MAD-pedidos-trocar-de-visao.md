---
id: MAD-pedidos-trocar-de-visao
area: MAD
title: Trocar entre as seis visões pelos chips
persona: Adri no celular
journey: J-achar-um-pedido
expected: Seis chips na ordem de ORDER_VIEWS, só um pressionado, a lista troca de recorte e de ordem, e o endereço vira ?visao=<id> sem empilhar histórico
entry_points: /pedidos
qa_status: pass
bug_ids:
fix_status:
retest_status:
fix_commits:
evidence:
last_report: reports/2026-10-24-mobile-adm-pedidos.md
overlaps: 
---

Feature `74` (`MAP-02`, `MAP-06`..`MAP-08`, `MAP-18`). Precisa de ação do mais antigo para o mais novo com a frase "N pedidos precisam de você…"; as outras do mais novo, "N pedidos". A faixa rola dentro de si. Nenhuma linha tem botão nem frase que mande agir (CTA morto, `58`). Conjunto de cada visão contra o painel.
